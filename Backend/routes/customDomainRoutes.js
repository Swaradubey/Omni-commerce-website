const express = require("express");
const router = express.Router();
const { 
  getAllCustomDomains, 
  createCustomDomain, 
  checkDomainStatus, 
  deleteCustomDomain 
} = require("../controllers/customDomainController");
const { protect, allowRoles } = require("../middleware/authMiddleware");

// Routes for custom domains
router.get("/", protect, allowRoles("super_admin"), getAllCustomDomains);
router.post("/", protect, allowRoles("super_admin"), createCustomDomain);
router.get("/:id/status", protect, allowRoles("super_admin"), checkDomainStatus);
router.delete("/:id", protect, allowRoles("super_admin"), deleteCustomDomain);

module.exports = router;
