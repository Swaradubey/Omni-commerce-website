const express = require("express");
const router = express.Router();
const { 
  getAllCustomDomains, 
  createCustomDomain, 
  checkDomainStatus, 
  deleteCustomDomain,
  resolveDomain
} = require("../controllers/customDomainController");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const tenantMiddleware = require("../middleware/tenantMiddleware");

// Routes for custom domains
router.get("/resolve", tenantMiddleware, resolveDomain);
router.get("/", protect, allowRoles("super_admin", "admin", "client", "client_admin"), tenantMiddleware, getAllCustomDomains);
router.post("/", protect, allowRoles("super_admin", "admin", "client", "client_admin"), tenantMiddleware, createCustomDomain);
router.get("/:id/status", protect, allowRoles("super_admin", "admin", "client", "client_admin"), tenantMiddleware, checkDomainStatus);
router.delete("/:id", protect, allowRoles("super_admin", "admin", "client", "client_admin"), tenantMiddleware, deleteCustomDomain);

module.exports = router;
