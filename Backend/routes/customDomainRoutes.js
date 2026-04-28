const express = require("express");
const router = express.Router();
const { getAllCustomDomains, createCustomDomain, deleteCustomDomain } = require("../controllers/customDomainController");
const { protect, allowRoles } = require("../middleware/authMiddleware");

// Routes for custom domains
// Added protect and allowRoles if needed, but user didn't explicitly ask to restrict here, 
// though they said "Use existing auth/admin middleware only if the project already uses it."
// I'll add them to be safe as this is a super admin feature.

router.get("/", protect, allowRoles("super_admin"), getAllCustomDomains);
router.post("/", protect, allowRoles("super_admin"), createCustomDomain);
router.delete("/:id", protect, allowRoles("super_admin"), deleteCustomDomain);

module.exports = router;
