const express = require("express");
const router = express.Router();
const { protect, allowRoles, requireImpersonationToken } = require("../middleware/authMiddleware");
const { 
  impersonateAdmin, 
  stopImpersonation,
  getClients,
  getClientSales,
  getClientInvoices,
  getClientCustomers,
  getOverview,
  getInvoiceByOrderId
} = require("../controllers/superadminController");

router.post("/impersonate/:adminId", protect, allowRoles("super_admin"), impersonateAdmin);
router.post("/impersonate/stop", protect, requireImpersonationToken, stopImpersonation);

// Overview
router.get("/overview", protect, allowRoles("super_admin"), getOverview);

// Invoices
router.get("/invoices/:orderId", protect, allowRoles("super_admin"), getInvoiceByOrderId);

// Clients Management
router.get("/clients", protect, allowRoles("super_admin"), getClients);
router.get("/clients/:clientId/sales", protect, allowRoles("super_admin"), getClientSales);
router.get("/clients/:clientId/invoices", protect, allowRoles("super_admin"), getClientInvoices);
router.get("/clients/:clientId/customers", protect, allowRoles("super_admin"), getClientCustomers);

module.exports = router;

