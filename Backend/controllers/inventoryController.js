const mongoose = require("mongoose");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Client = require("../models/Client");
const { validationResult } = require("express-validator");
const {
  resolveProductUpdatePayload,
  isTitleDescriptionOnlyUpdate,
} = require("../utils/productFieldPermissions");
const {
  formatProductsWithClient,
  formatProductWithClient,
} = require("../utils/formatInventoryProduct");
const { isClientScopedRole } = require("../utils/clientScopedRoles");
const { resolveClientId, buildScopeQuery, applyScope, buildProductVisibilityFilter } = require("../utils/tenantResolver");

function userOwnsClientProduct(user, product) {
  if (!user || !isClientScopedRole(user.role)) return true;
  if (!user.clientId || !product.clientId) return false;
  return String(product.clientId) === String(user.clientId);
}

const INVENTORY_MANAGER_TITLE_DESC_SUCCESS =
  "Inventory manager successfully updated products";

// @desc    List products for dashboard inventory (scoped for client role)
// @route   GET /api/inventory/manage
// @access  Private
const getInventoryManage = async (req, res) => {
  try {
    const { category, search, stockStatus, minPrice, maxPrice } = req.query;
    
    // Use shared visibility filter
    let query = await buildProductVisibilityFilter(req);

    if (category && category !== "All Categories" && category !== "undefined" && category !== "null") {
      query.category = category;
    }

    if (search && search !== "undefined" && search !== "null") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (stockStatus && stockStatus !== "all") {
      if (stockStatus === "in-stock") query.stock = { $gt: 10 };
      else if (stockStatus === "low-stock") query.stock = { $gte: 1, $lte: 10 };
      else if (stockStatus === "out-of-stock") query.stock = 0;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const rows = await Product.find(query)
      .sort("-updatedAt")
      .populate({ path: "clientId", select: "companyName shopName storeName email" })
      .lean();

    console.log("Inventory API role:", req.user?.role);
    console.log("Inventory filter:", JSON.stringify(query));
    console.log("Inventory products count:", rows.length);

    return res.json({
      success: true,
      data: formatProductsWithClient(rows),
      count: rows.length
    });
  } catch (error) {
    console.error("[Inventory] getInventoryManage:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// @desc    Add new inventory item
// @route   POST /api/inventory
// @access  Private (Admin/Staff)
const createInventoryItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { sku } = req.body;
    const resolvedClientId = await resolveClientId(req);
    const role = req.user?.role;
    
    // Explicitly check for global roles (Super Admin / Admin)
    const isGlobal = role === "super_admin" || role === "super-admin" || role === "superadmin" || role === "admin";
    
    // Determine the target clientId
    let targetClientId = req.body.clientId || resolvedClientId;
    
    // Safety check for non-privileged roles
    if (!isGlobal && !targetClientId) {
       return res.status(400).json({
         success: false,
         message: "Could not resolve client assignment. Please ensure you are logged in correctly."
       });
    }

    // SKU uniqueness check (scoped to client if not global, or global if no client)
    const skuQuery = { sku };
    if (targetClientId) {
      skuQuery.clientId = targetClientId;
    } else {
      skuQuery.clientId = null;
    }
    
    const existingProduct = await Product.findOne(skuQuery);
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists in this scope",
      });
    }

    // Prepare data
    const payload = { ...req.body };
    payload.createdBy = req.user._id;
    payload.createdByRole = role;
    payload.clientId = targetClientId || null;

    // Fetch clientName if possible to persist it
    if (targetClientId) {
      const Client = require("../models/Client");
      const client = await Client.findById(targetClientId).select("companyName shopName storeName");
      if (client) {
        payload.clientName = client.storeName || client.shopName || client.companyName || "";
      }
    }

    const item = await Product.create(payload);
    const populated = await Product.findById(item._id)
      .populate({ path: "clientId", select: "companyName shopName storeName email" })
      .lean();

    res.status(201).json({
      success: true,
      data: formatProductWithClient(populated),
    });
  } catch (error) {
    console.error("[Inventory] createInventoryItem Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Get inventory list with filtering
// @route   GET /api/inventory
// @access  Public
const getInventory = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, inStock } = req.query;
    const resolvedClientId = await resolveClientId(req);
    const isGlobalRole =
      req.user?.role === "superadmin" ||
      req.user?.role === "super-admin" ||
      req.user?.role === "admin" ||
      req.user?.role === "super_admin";

    // Debug logs temporarily
    console.log("Get products role:", req.user?.role);
    console.log("Is global role:", isGlobalRole);
    console.log("resolved clientId:", resolvedClientId);

    let query = {};
    
    const isSuperAdmin = req.user?.role === "super_admin" || req.user?.role === "super-admin" || req.user?.role === "superadmin";
    const isAdmin = req.user?.role === "admin";

    // Only apply clientId filter if NOT a global role AND clientOnly is requested
    // ADMIN and SUPER_ADMIN are global roles and see all products by default.
    if (!isSuperAdmin && !isAdmin && (req.query.clientOnly === "true" || resolvedClientId)) {
      const targetClientId = resolvedClientId || req.user?.clientId;
      if (targetClientId) {
        query.clientId = targetClientId;
      }
    } else if (resolvedClientId && (isSuperAdmin || isAdmin)) {
      // If a global admin explicitly wants to see a specific client's products
      query.clientId = resolvedClientId;
    }

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (inStock === "true") query.stock = { $gt: 0 };
    if (inStock === "false") query.stock = 0;


    const inventory = await Product.find(query)
      .populate("clientId", "storeName companyName shopName")
      .sort("-createdAt");
    const productsFound = inventory.length;

    // Requested debug logs
    console.log("Product query filter:", JSON.stringify(query));
    console.log("Products returned:", productsFound);

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inventory item by ID
// @route   GET /api/inventory/:id
// @access  Public
const getInventoryById = async (req, res) => {
  try {
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const item = await Product.findOne(query);
    if (item) {
      res.json({ success: true, data: item });
    } else {
      res.status(404).json({ success: false, message: "Inventory item not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (same field rules as PUT /api/products/:id)
const updateInventoryItem = async (req, res) => {
  try {
    const role = req.user.role;
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const item = await Product.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    if (!userOwnsClientProduct(req.user, item)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this inventory item",
      });
    }

    if (role === "inventory_manager") {
      const { title, name, description } = req.body || {};
      console.log("[Backend Debug] inventory_manager — inventory item before update:", {
        _id: item._id,
        name: item.name,
        description: item.description,
      });

      if (
        title === undefined &&
        name === undefined &&
        description === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide at least one of: title, name, or description",
        });
      }

      if (title !== undefined) {
        item.name = title;
      } else if (name !== undefined) {
        item.name = name;
      }
      if (description !== undefined) {
        item.description = description;
      }

      const updatedItem = await item.save();
      console.log("[Backend Debug] inventory_manager — inventory item after save:", {
        _id: updatedItem._id,
        name: updatedItem.name,
        description: updatedItem.description,
        updatedAt: updatedItem.updatedAt,
      });

      // Sync the update to the `inventories` collection safely
      try {
        let inventoryDoc = await Inventory.findOne({ sku: updatedItem.sku });
        let inventoryAction = "none";
        
        if (inventoryDoc) {
          if (title !== undefined) {
            inventoryDoc.name = title;
          } else if (name !== undefined) {
            inventoryDoc.name = name;
          }
          if (description !== undefined) {
            inventoryDoc.description = description;
          }
          await inventoryDoc.save();
          inventoryAction = "updated";
        } else {
          // Create document if project expects one
          inventoryDoc = await Inventory.create({
            name: updatedItem.name,
            sku: updatedItem.sku,
            description: updatedItem.description || "",
            category: updatedItem.category || "Uncategorized", // Fallback just in case
            price: updatedItem.price || 0,
            stock: updatedItem.stock || 0,
            image: updatedItem.image || "",
            isActive: updatedItem.isActive !== undefined ? updatedItem.isActive : true
          });
          inventoryAction = "created";
        }
        
        console.log(`[Backend Debug] inventories collection ${inventoryAction}:`, inventoryDoc._id);
      } catch (inventorySyncError) {
        console.error("[Backend Debug] Failed to sync with inventories collection:", inventorySyncError.message);
        // Continue and return success anyway since item was saved
      }

      const responsePayload = {
        success: true,
        message: INVENTORY_MANAGER_TITLE_DESC_SUCCESS,
        product: updatedItem,
        data: updatedItem,
      };
      console.log("[Backend Debug] PUT /api/inventory/:id — final response (inventory_manager):", responsePayload);
      return res.json(responsePayload);
    }

    const resolved = resolveProductUpdatePayload(role, req.body);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ success: false, message: resolved.message });
    }
    const updatePayload = { ...resolved.update };
    if (isClientScopedRole(role)) {
      delete updatePayload.clientId;
    }
    if (updatePayload.title !== undefined && updatePayload.name === undefined) {
      updatePayload.name = updatePayload.title;
    }
    delete updatePayload.title;
    const titleDescriptionOnlyFlow = isTitleDescriptionOnlyUpdate(updatePayload);
    console.log(
      "[Backend Debug] PUT /api/inventory/:id - admin path, titleDescriptionOnlyFlow:",
      titleDescriptionOnlyFlow,
      "role:",
      role
    );
    console.log("[Backend Debug] PUT /api/inventory/:id - Allowed Fields Extracted:", updatePayload);
    console.log("[Backend Debug] Inventory Item Before Update:", {
      _id: item._id,
      name: item.name,
      description: item.description,
    });

    if (role === "super_admin" || role === "admin") {
      if (updatePayload.clientId !== undefined) {
        const raw = updatePayload.clientId;
        if (raw === null || raw === "") {
          updatePayload.clientId = null;
        } else if (!mongoose.Types.ObjectId.isValid(raw)) {
          return res.status(400).json({ success: false, message: "Invalid client assignment" });
        } else {
          const c = await Client.findById(raw);
          if (!c) {
            return res.status(400).json({ success: false, message: "Client not found for assignment" });
          }
          updatePayload.clientId = c._id;
        }
      }
    }

    Object.assign(item, updatePayload);
    const updatedItem = await item.save();
    console.log("[Backend Debug] Inventory Item After Update:", {
      _id: updatedItem._id,
      name: updatedItem.name,
      description: updatedItem.description,
      updatedAt: updatedItem.updatedAt,
    });
    const responsePayload = {
      success: true,
      message: titleDescriptionOnlyFlow
        ? INVENTORY_MANAGER_TITLE_DESC_SUCCESS
        : "Inventory item updated successfully",
      product: updatedItem,
      data: updatedItem,
    };
    console.log("[Backend Debug] PUT /api/inventory/:id - Response:", responsePayload);
    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update only stock count
// @route   PATCH /api/inventory/:id/stock
// @access  Private (Admin/Staff)
const updateStock = async (req, res) => {
  try {
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const existing = await Product.findOne(query);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    if (!userOwnsClientProduct(req.user, existing)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this inventory item",
      });
    }
    const { stock } = req.body;
    if (stock === undefined || isNaN(Number(stock))) {
      return res.status(400).json({ success: false, message: "Valid stock count is required" });
    }
    existing.stock = Number(stock);
    const item = await existing.save({ validateBeforeSave: true });
    const populated = await Product.findById(item._id)
      .populate({ path: "clientId", select: "companyName shopName email" })
      .lean();
    res.json({
      success: true,
      message: "Stock updated successfully",
      data: formatProductWithClient(populated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Admin/Staff)
const deleteInventoryItem = async (req, res) => {
  try {
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const item = await Product.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    if (!userOwnsClientProduct(req.user, item)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to remove this inventory item",
      });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Inventory item removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInventoryManage,
  createInventoryItem,
  getInventory,
  getInventoryById,
  updateInventoryItem,
  updateStock,
  deleteInventoryItem,
};
