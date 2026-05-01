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
const { resolveClientId } = require("../utils/tenantResolver");

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
    let query = {};
    const clientId = req.clientId || (await resolveClientId(req));
    if (clientId) {
      query.clientId = clientId;
    }

    const rows = await Product.find(query)
      .sort("-createdAt")
      .populate({ path: "clientId", select: "companyName shopName email" })
      .lean();

    return res.json({
      success: true,
      data: formatProductsWithClient(rows),
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
    const clientId = req.clientId || (await resolveClientId(req));
    
    let query = { sku };
    if (clientId) query.clientId = clientId;
    
    const itemExists = await Product.findOne(query);

    if (itemExists) {
      return res.status(400).json({ success: false, message: "Product with this SKU already exists" });
    }

    const payload = { ...req.body };
    const role = req.user.role;

    if (!payload.clientId) {
      payload.clientId = clientId;
    }

    if (!payload.clientId && req.user.role !== "super_admin") {
      console.error(`[Inventory] Failed to resolve clientId for user: ${req.user.email} (Role: ${req.user.role})`);
      return res.status(400).json({ 
        success: false, 
        message: "Could not resolve client assignment. If you are on a custom domain, ensure it is correctly mapped." 
      });
    }

    payload.createdBy = req.user._id;

    const item = await Product.create(payload);
    const populated = await Product.findById(item._id)
      .populate({ path: "clientId", select: "companyName shopName email" })
      .lean();
    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: formatProductWithClient(populated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inventory list with filtering
// @route   GET /api/inventory
// @access  Public
const getInventory = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, inStock } = req.query;
    const clientId = req.clientId || (await resolveClientId(req));
    let query = {};

    if (clientId) query.clientId = clientId;

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (inStock === "true") query.stock = { $gt: 0 };
    if (inStock === "false") query.stock = 0;

    const inventory = await Product.find(query).sort("-createdAt");
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
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
    existing.stock = stock;
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
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
