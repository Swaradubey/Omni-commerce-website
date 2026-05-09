const Invoice = require("../models/Invoice");
const { isValidObjectId, resolveClientId } = require("../utils/tenantResolver");

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (SuperAdmin)
const getInvoices = async (req, res) => {
  try {
    const role = req.user?.role || req.user?.userRole || req.user?.accountType;
    const isSuperAdmin = ["superadmin", "super_admin"].includes(String(role).toLowerCase());
    const clientId = req.user?.clientId || req.clientId || (await resolveClientId(req));

    // Requirement 10 & 16: Log data retrieval details
    console.log(`[invoiceController] getInvoices - Page: Invoices, Role: ${role}, ClientId: ${clientId || "global"}`);

    const query = {};
    if (isSuperAdmin) {
      query.$or = [
        { clientId: { $exists: true, $ne: null } },
        { storeId: { $exists: true, $ne: null } },
        { tenantId: { $exists: true, $ne: null } }
      ];
    } else {
      query.clientId = clientId;
    }

    console.log("-----------------------------------------");
    console.log("role:", role, "clientId:", clientId, "query:", JSON.stringify(query));
    console.log("-----------------------------------------");
    let invoices = await Invoice.find(query).sort({ createdAt: -1 }).lean();
    const Order = require("../models/Order");
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    if (!invoices || invoices.length < orders.length) {
      console.log(`[invoiceController] Found ${invoices?.length || 0} invoices but ${orders.length} orders. Deriving missing invoices...`);
      
      const existingOrderIds = new Set((invoices || []).map(inv => inv.orderId));
      
      const derivedInvoices = orders
        .filter(order => !existingOrderIds.has(order.orderId))
        .map(order => {
          const isPos = /^POS-/i.test(order.orderId) || /^ORD-POS-/i.test(order.orderId) || order.orderSource === "pos";
          return {
            _id: order._id,
            invoiceNumber: `INV-${order.orderId || order._id.toString().substring(0, 8).toUpperCase()}`,
            orderId: order.orderId,
            customerName: order.customerName || (order.shippingAddress && order.shippingAddress.fullName) || "Unknown",
            customerEmail: order.customerEmail || (order.shippingAddress && order.shippingAddress.email) || "",
            items: order.items || [],
            subtotal: order.totalPrice || 0,
            tax: 0,
            totalAmount: order.totalPrice || 0,
            paymentMethod: order.paymentMethod || "N/A",
            paymentStatus: isPos ? "paid" : (order.paymentStatus || "pending"),
            orderStatus: order.orderStatus || "placed",
            createdAt: order.createdAt,
            clientId: order.clientId,
          };
        });

      invoices = [...(invoices || []), ...derivedInvoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // Ensure all POS invoices return "paid" regardless of database state
    invoices = invoices.map(inv => {
      const isPos = /^POS-/i.test(inv.orderId) || /^ORD-POS-/i.test(inv.orderId);
      if (isPos) {
        inv.paymentStatus = "paid";
      }
      return inv;
    });

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
    const role = req.user?.role || req.user?.userRole || req.user?.accountType;
    const isSuperAdmin = ["superadmin", "super_admin"].includes(String(role).toLowerCase());
    const clientId = req.user?.clientId || req.clientId || (await resolveClientId(req));

    console.log(`[invoiceController] getInvoiceById - ID: ${req.params.id}, Role: ${role}, ClientId: ${clientId || "global"}`);

    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Invoice not found or access denied (Invalid ID)" });
    }

    const query = { _id: req.params.id };
    if (isSuperAdmin) {
      query.$or = [
        { clientId: { $exists: true, $ne: null } },
        { storeId: { $exists: true, $ne: null } },
        { tenantId: { $exists: true, $ne: null } }
      ];
    } else {
      query.clientId = clientId;
    }
    const invoice = await Invoice.findOne(query);

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found or access denied" });
    }
    
    // Override payment status for POS
    const invoiceObj = invoice.toObject ? invoice.toObject() : { ...invoice };
    if (/^POS-/i.test(invoiceObj.orderId) || /^ORD-POS-/i.test(invoiceObj.orderId)) {
      invoiceObj.paymentStatus = "paid";
    }

    console.log(`[invoiceController] DB Query - Collection: invoices, Filter: ${JSON.stringify(query)}, Found: true`);

    res.json({ success: true, data: invoiceObj });
  } catch (error) {
    console.error("[invoiceController] getInvoiceById error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
};
