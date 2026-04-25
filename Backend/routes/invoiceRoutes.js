const express = require("express");
const router = express.Router();
const { getInvoices, getInvoiceById } = require("../controllers/invoiceController");
const { protect, allowRoles } = require("../middleware/authMiddleware");

// All invoice routes must be protected and restricted to SuperAdmins
router.use(protect, allowRoles("super_admin"));

router.route("/").get(getInvoices);
router.route("/:id").get(getInvoiceById);

module.exports = router;
