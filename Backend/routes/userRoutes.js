const express = require("express");
const router = express.Router();
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { getMe, updateMe, listPlatformUsers, updateUserRole } = require("../controllers/userController");
const { getUserAnalytics } = require("../controllers/userAnalyticsController");

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

/** User analytics (Sales Analytics + Category Distribution for their orders) */
router.get(
  "/analytics",
  protect,
  allowRoles("user", "customer"),
  getUserAnalytics
);

/** Super Admin directory (same payload as `/platform/list`; REST-style alias). */
router.get("/", protect, allowRoles("super_admin", "client"), listPlatformUsers);

router.get("/platform/list", protect, allowRoles("super_admin", "client"), listPlatformUsers);
router.patch("/platform/:id/role", protect, allowRoles("super_admin", "client"), updateUserRole);

module.exports = router;
