const express = require("express");
const router = express.Router();
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { getMyCustomers } = require("../controllers/customerController");

// @route   GET /api/customers/my-customers
router.get(
  "/my-customers",
  protect,
  allowRoles("client", "admin", "store_manager", "super_admin"),
  getMyCustomers
);

module.exports = router;
