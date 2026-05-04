const mongoose = require("mongoose");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Client = require("../models/Client");
const { validationResult } = require("express-validator");
const {
  resolveProductUpdatePayload,
  isTitleDescriptionOnlyUpdate,
} = require("../utils/productFieldPermissions");
const { formatProductWithClient } = require("../utils/formatInventoryProduct");
const { isClientScopedRole } = require("../utils/clientScopedRoles");
const { resolveClientId, buildScopeQuery, applyScope, buildProductVisibilityFilter } = require("../utils/tenantResolver");

function userOwnsClientProduct(user, product) {
  if (!user || !isClientScopedRole(user.role)) return true;
  const userClientId = user.clientId || user.assignedClient || user._id;
  if (!userClientId || !product.clientId) return false;
  return String(product.clientId) === String(userClientId);
}

async function loadProductFormatted(id) {
  const doc = await Product.findById(id).populate({
    path: "clientId",
    select: "companyName shopName email storeName",
  });
  if (!doc) return null;
  return formatProductWithClient(doc.toObject({ virtuals: true }));
}

const INVENTORY_MANAGER_TITLE_DESC_SUCCESS =
  "Inventory manager successfully updated products";

const normalizeSaleFields = (payload = {}) => {
  const normalized = { ...payload };
  const price = Number(normalized.price);
  const originalPrice = Number(normalized.originalPrice);
  const hasValidDiscount =
    Number.isFinite(price) &&
    Number.isFinite(originalPrice) &&
    originalPrice > 0 &&
    originalPrice > price;

  if (hasValidDiscount) {
    const salePercentage = Math.round(
      ((originalPrice - price) / originalPrice) * 100
    );
    normalized.isOnSale = true;
    normalized.salePercentage = Math.max(0, salePercentage);
  } else {
    normalized.isOnSale = false;
    normalized.salePercentage = 0;
  }

  return normalized;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, isActive } = req.query;
    
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
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if ((minPrice && minPrice !== "undefined") || (maxPrice && maxPrice !== "undefined")) {
      query.price = {};
      if (minPrice && minPrice !== "undefined") query.price.$gte = Number(minPrice);
      if (maxPrice && maxPrice !== "undefined") query.price.$lte = Number(maxPrice);
    }

    // Non-staff (customers/guests) should only see active products
    const isStaff = req.user && (req.user.role === "admin" || req.user.role === "super_admin" || isClientScopedRole(req.user.role));
    if (!isStaff) {
      query.isActive = true;
    } else if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Pagination parameters - 0 or no limit means return all
    const page = parseInt(req.query.page, 10) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0; 
    const skip = limit ? (page - 1) * limit : 0;

    const totalProducts = await Product.countDocuments(query);

    let dbQuery = Product.find(query)
      .populate("clientId", "storeName companyName shopName email")
      .sort("-createdAt");
    
    if (limit > 0) {
      dbQuery = dbQuery.skip(skip).limit(limit);
    }

    const products = await dbQuery;
    console.log("Returned count:", products.length);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      products: products,
      totalProducts,
      page,
      totalPages: limit > 0 ? Math.ceil(totalProducts / limit) : 1
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR", error);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { isFeatured: true, isActive: true };
    applyScope(query, scopeQuery);

    const products = await Product.find(query)
      .select(
        "name category price originalPrice isOnSale salePercentage image stock description sku createdAt updatedAt"
      )
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin/Staff)
const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
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
    const productData = normalizeSaleFields(req.body);
    productData.createdBy = req.user._id;
    productData.createdByRole = role;
    productData.clientId = targetClientId || null;

    // Fetch clientName if possible to persist it for the UI
    if (targetClientId) {
      const Client = require("../models/Client");
      const client = await Client.findById(targetClientId).select("companyName shopName storeName");
      if (client) {
        productData.clientName = client.storeName || client.shopName || client.companyName || "";
      }
    }

    const product = await Product.create(productData);
    const formatted = await loadProductFormatted(product._id);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR", error);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (admin only; route enforces via allowRoles)
const updateProduct = async (req, res) => {
  try {
    let role = req.user.role;
    
    // Check if the request body only contains title/description
    if (req.body && typeof req.body === 'object') {
      const allowedKeys = ['title', 'name', 'description'];
      const bodyKeys = Object.keys(req.body).filter(k => req.body[k] !== undefined);
      const isOnlyTitleDesc = bodyKeys.length > 0 && bodyKeys.every(k => allowedKeys.includes(k));
      
      if (isOnlyTitleDesc) {
        role = 'inventory_manager';
      }
    }

    console.log("[Backend Debug] PUT /api/products/:id - Product ID:", req.params.id);
    console.log("[Backend Debug] PUT /api/products/:id - Incoming Body:", req.body);
    
    if (role === 'inventory_manager') {
      console.log('Role: inventory_manager');
    } else {
      console.log(`PUT /api/products/${req.params.id} - Role: ${role}`);
    }
    
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!userOwnsClientProduct(req.user, product)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this product",
      });
    }

    // inventory_manager: persist only title (stored as `name` in schema) and `description` via direct assignment + save.
    // Avoid Object.assign here — some Mongoose setups do not mark top-level fields modified reliably from assign.
    if (role === "inventory_manager") {
      const { title, name, description } = req.body || {};
      console.log("[Backend Debug] inventory_manager — product before update:", {
        _id: product._id,
        name: product.name,
        description: product.description,
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
        product.name = title;
      } else if (name !== undefined) {
        product.name = name;
      }
      if (description !== undefined) {
        product.description = description;
      }

      const updated = await product.save();
      console.log("[Backend Debug] inventory_manager — product after save:", {
        _id: updated._id,
        name: updated.name,
        description: updated.description,
        updatedAt: updated.updatedAt,
      });

      // Sync the update to the `inventories` collection safely
      try {
        let inventoryDoc = await Inventory.findOne({ sku: updated.sku });
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
            name: updated.name,
            sku: updated.sku,
            description: updated.description || "",
            category: updated.category || "Uncategorized", // Fallback just in case
            price: updated.price || 0,
            stock: updated.stock || 0,
            image: updated.image || "",
            isActive: updated.isActive !== undefined ? updated.isActive : true
          });
          inventoryAction = "created";
        }
        
        console.log(`[Backend Debug] inventories collection ${inventoryAction}:`, inventoryDoc._id);
      } catch (inventorySyncError) {
        console.error("[Backend Debug] Failed to sync with inventories collection:", inventorySyncError.message);
        // Continue and return success anyway since product was saved
      }

      const formatted = await loadProductFormatted(updated._id);
      const responsePayload = {
        success: true,
        message: INVENTORY_MANAGER_TITLE_DESC_SUCCESS,
        product: formatted,
        data: formatted,
      };
      console.log("[Backend Debug] PUT /api/products/:id — final response (inventory_manager):", responsePayload);
      return res.status(200).json(responsePayload);
    }

    const resolved = resolveProductUpdatePayload(role, req.body);
    if (!resolved.ok) {
      return res.status(resolved.status).json({
        success: false,
        message: resolved.message,
      });
    }
    const payload = { ...resolved.update };
    if (isClientScopedRole(role)) {
      delete payload.clientId;
    }
    if (payload.title !== undefined && payload.name === undefined) {
      payload.name = payload.title;
    }
    delete payload.title;
    const normalizedPayload = normalizeSaleFields(payload);
    console.log("[Backend Debug] PUT /api/products/:id - Allowed Fields Extracted:", normalizedPayload);
    console.log("[Backend Debug] Product Before Update:", {
      _id: product._id,
      name: product.name,
      description: product.description,
    });

    if (normalizedPayload.sku && normalizedPayload.sku !== product.sku) {
      let skuQuery = { sku: normalizedPayload.sku };
      applyScope(skuQuery, scopeQuery);
      
      const existingProduct = await Product.findOne(skuQuery);
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    if (role === "super_admin" || role === "admin") {
      if (normalizedPayload.clientId !== undefined) {
        const raw = normalizedPayload.clientId;
        if (raw === null || raw === "") {
          normalizedPayload.clientId = null;
        } else if (!mongoose.Types.ObjectId.isValid(raw)) {
          return res.status(400).json({ success: false, message: "Invalid client assignment" });
        } else {
          const c = await Client.findById(raw);
          if (!c) {
            return res.status(400).json({ success: false, message: "Client not found for assignment" });
          }
          normalizedPayload.clientId = c._id;
        }
      }
    }

    Object.assign(product, normalizedPayload);
    const updated = await product.save();
    console.log("[Backend Debug] Product After Update:", {
      _id: updated._id,
      name: updated.name,
      description: updated.description,
      updatedAt: updated.updatedAt,
    });

    const formatted = await loadProductFormatted(updated._id);
    const responsePayload = {
      success: true,
      message: "Product updated successfully",
      product: formatted,
      data: formatted,
    };
    console.log("[Backend Debug] PUT /api/products/:id - Response:", responsePayload);

    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Update only stock
// @route   PATCH /api/products/:id/stock
// @access  Private (Admin/Staff)
const updateProductStock = async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || isNaN(stock)) {
      return res.status(400).json({
        success: false,
        message: "Valid stock count is required",
      });
    }

    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const existing = await Product.findOne(query);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    if (!userOwnsClientProduct(req.user, existing)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this product",
      });
    }

    existing.stock = stock;
    const product = await existing.save({ validateBeforeSave: true });
    const formatted = await loadProductFormatted(product._id);

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin/Staff)
const deleteProduct = async (req, res) => {
  try {
    const resolvedClientId = await resolveClientId(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);
    let query = { _id: req.params.id };
    applyScope(query, scopeQuery);

    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    if (!userOwnsClientProduct(req.user, product)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this product",
      });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};



module.exports = {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
};
