const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { 
  getInventoryManage,
  createInventoryItem, 
  getInventory, 
  getInventoryById, 
  updateInventoryItem, 
  updateStock, 
  deleteInventoryItem 
} = require("../controllers/inventoryController");
const { protect, allowRoles, optionalProtect } = require("../middleware/authMiddleware");

// Public routes for fetching (Optional auth for scoping)
router.get("/", optionalProtect, getInventory);
router.get(
  "/manage",
  protect,
  allowRoles("super_admin", "admin", "inventory_manager", "client", "store_manager", "employee", "staff", "seo_manager", "counter_manager"),
  getInventoryManage
);
router.get("/:id", optionalProtect, getInventoryById);

// Protected routes for management (create/update/delete/stock: admin only)
router.post(
  "/",
  protect,
  allowRoles("super_admin", "admin", "client", "store_manager", "employee", "staff", "seo_manager", "counter_manager"),
  [
    check("name", "Name is required").not().isEmpty(),
    check("sku", "SKU is required").not().isEmpty(),
    check("category", "Category is required").not().isEmpty(),
    check("price", "Price is required").isNumeric(),
    check("stock", "Stock must be a number").isNumeric(),
  ],
  createInventoryItem
);

router.put(
  "/:id",
  protect,
  allowRoles("super_admin", "admin", "inventory_manager", "client", "store_manager", "employee", "staff", "seo_manager", "counter_manager"),
  updateInventoryItem
);

router.patch(
  "/:id/stock",
  protect,
  allowRoles("super_admin", "admin", "client", "store_manager", "employee", "staff", "seo_manager", "counter_manager"),
  [check("stock", "Stock count is required").isNumeric()],
  updateStock
);

router.delete(
  "/:id",
  protect,
  allowRoles("super_admin", "admin", "client", "store_manager", "employee", "staff", "seo_manager", "counter_manager"),
  deleteInventoryItem
);

module.exports = router;
