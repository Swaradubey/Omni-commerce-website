const Invoice = require("../models/Invoice");

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (SuperAdmin)
const getInvoices = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const clientId = req.clientId || req.user?.clientId;

    // Requirement 10 & 16: Log data retrieval details
    console.log(`[invoiceController] getInvoices - Page: Invoices, Role: ${req.user?.role}, ClientId: ${clientId || "global"}`);

    const query = isSuperAdmin ? {} : { clientId };
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });

    // Requirement 16: Log DB query details
    console.log(`[invoiceController] DB Query - Collection: invoices, Filter: ${JSON.stringify(query)}, Count: ${invoices.length}`);

    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    console.error("[invoiceController] getInvoices error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private (SuperAdmin)
const getInvoiceById = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const clientId = req.clientId || req.user?.clientId;

    console.log(`[invoiceController] getInvoiceById - ID: ${req.params.id}, Role: ${req.user?.role}, ClientId: ${clientId || "global"}`);

    const query = isSuperAdmin ? { _id: req.params.id } : { _id: req.params.id, clientId };
    const invoice = await Invoice.findOne(query);

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found or access denied" });
    }

    console.log(`[invoiceController] DB Query - Collection: invoices, Filter: ${JSON.stringify(query)}, Found: true`);

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("[invoiceController] getInvoiceById error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
};
