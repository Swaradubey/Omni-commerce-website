const express = require("express");
const router = express.Router();
const { protect, allowRoles, requireImpersonationToken } = require("../middleware/authMiddleware");
const { impersonateAdmin, stopImpersonation } = require("../controllers/superadminController");

router.post("/impersonate/:adminId", protect, allowRoles("super_admin"), impersonateAdmin);
router.post("/impersonate/stop", protect, requireImpersonationToken, stopImpersonation);

module.exports = router;
