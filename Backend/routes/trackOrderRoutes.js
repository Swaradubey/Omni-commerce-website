const express = require("express");
const router = express.Router();
const {
  createTrackOrderLog,
  getAllTrackOrders,
  getTrackOrdersByOrderId,
} = require("../controllers/trackOrderController");
const { protect, optionalProtect, allowRoles } = require("../middleware/authMiddleware");

// Route to log tracking action (public with optional auth attach)
router.post("/log", optionalProtect, createTrackOrderLog);

// Admin routes to view the logs
router.get(
  "/",
  protect,
  allowRoles("super_admin", "admin", "staff", "inventory_manager", "cashier"),
  getAllTrackOrders
);
router.get(
  "/order/:orderId",
  protect,
  allowRoles("super_admin", "admin", "staff", "inventory_manager", "cashier"),
  getTrackOrdersByOrderId
);

module.exports = router;
