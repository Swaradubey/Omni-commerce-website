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
const { resolveClientId } = require("../utils/tenantResolver");

function userOwnsClientProduct(user, product) {
  if (!user || !isClientScopedRole(user.role)) return true;
  if (!user.clientId || !product.clientId) return false;
  return String(product.clientId) === String(user.clientId);
}

async function loadProductFormatted(id) {
  const doc = await Product.findById(id).populate({
    path: "clientId",
    select: "companyName shopName email",
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

    console.log("[Tenant Debug] origin:", req.headers.origin);
    console.log("[Tenant Debug] host:", req.headers.host);
    console.log("[Tenant Debug] x-client-domain:", req.headers["x-client-domain"]);
    console.log("[Tenant Debug] user role:", req.user?.role);
    console.log("[Tenant Debug] user clientId:", req.user?.clientId);
    console.log("[Tenant Debug] resolved clientId:", req.clientId);

    const clientId = req.clientId || (await resolveClientId(req));
    let query = { clientId };

    if (!clientId) {
      console.warn("[Products] No clientId resolved for getProducts");
    }
    if (category && category !== "All Categories") query.category = category;
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
    if (isActive !== undefined) query.isActive = isActive === "true";

    const products = await Product.find(query).sort("-createdAt");
    
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

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { isFeatured: true, isActive: true, clientId };

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
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
  console.log("[Backend Debug] POST /api/products - Incoming Request Body:", req.body);
  console.log("[Backend Debug] Authenticated User:", req.user ? { id: req.user._id, role: req.user.role } : "None");

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("[Backend Debug] Validation Errors:", errors.array());
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { sku } = req.body;
    const clientId = req.clientId || (await resolveClientId(req));
    
    let query = { sku };
    if (clientId) query.clientId = clientId;
    
    const existingProduct = await Product.findOne(query);

    if (existingProduct) {
      console.warn("[Backend Debug] SKU Conflict:", sku);
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    const payload = normalizeSaleFields(req.body);
    const role = req.user.role;

    if (!payload.clientId) {
      payload.clientId = await resolveClientId(req);
    }

    if (!payload.clientId && req.user.role !== "super_admin") {
      console.error(`[Products] Failed to resolve clientId for user: ${req.user.email} (Role: ${req.user.role})`);
      return res.status(400).json({ 
        success: false, 
        message: "Could not resolve client assignment. If you are on a custom domain, ensure it is correctly mapped." 
      });
    }

    payload.createdBy = req.user._id;

    const product = await Product.create(payload);
    const formatted = await loadProductFormatted(product._id);
    console.log("[Backend Debug] Product Created Successfully:", product._id);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("[Backend Debug] createProduct Error:", error.message);
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
    
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
      if (clientId) skuQuery.clientId = clientId;
      
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

    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
    const clientId = req.clientId || (await resolveClientId(req));
    let query = { _id: req.params.id };
    if (clientId) query.clientId = clientId;

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
