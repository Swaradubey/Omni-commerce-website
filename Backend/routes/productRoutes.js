const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
} = require("../controllers/productController");
const { protect, allowRoles } = require("../middleware/authMiddleware");

/**
 * @route   GET /api/products
 * @desc    Get all products
 * @access  Public
 */
router.get("/", getProducts);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get("/featured", getFeaturedProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product
 * @access  Public
 */
router.get("/:id", getProductById);

/**
 * @route   POST /api/products
 * @desc    Create product
 * @access  Private (Admin)
 */
router.post(
  "/",
  protect,
  allowRoles("super_admin", "admin", "client", "store_manager", "employee", "staff", "seo_manager", "inventory_manager", "counter_manager"),
  [
    check("name", "Name is required").not().isEmpty(),
    check("sku", "SKU is required").not().isEmpty(),
    check("category", "Category is required").not().isEmpty(),
    check("price", "Price is required and must be a number").isFloat({ min: 0 }),
    check("stock", "Stock must be a number").isInt({ min: 0 }),
  ],
  createProduct
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (admin: full body; inventory_manager: name/title/description only — enforced in controller)
 * @access  Private (Admin, inventory_manager)
 */
router.put(
  "/:id",
  protect,
  allowRoles("super_admin", "admin", "inventory_manager", "client", "store_manager", "employee", "staff", "seo_manager", "counter_manager"),
  updateProduct
);

/**
 * @route   PATCH /api/products/:id/stock
 * @desc    Update only stock
 * @access  Private (Admin)
 */
router.patch(
  "/:id/stock",
  protect,
  allowRoles("super_admin", "admin", "client", "store_manager", "employee", "staff", "seo_manager", "inventory_manager", "counter_manager"),
  [check("stock", "Stock count is required").isInt({ min: 0 })],
  updateProductStock
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  protect,
  allowRoles("super_admin", "admin", "client", "store_manager", "employee", "staff", "seo_manager", "inventory_manager", "counter_manager"),
  deleteProduct
);

module.exports = router;
