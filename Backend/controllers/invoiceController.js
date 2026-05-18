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

// @desc    Send invoice via email
// @route   POST /api/invoices/send-email
// @access  Private (Staff roles)
const sendInvoiceEmail = async (req, res) => {
  try {
    const { sendEmail, buildInvoiceEmailHtml } = require("../utils/emailService");

    const { recipientEmail, invoiceData } = req.body;

    // Validate email
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (!invoiceData || !invoiceData.invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice data is required.",
      });
    }

    console.log(
      `[invoiceController] sendInvoiceEmail — to: ${recipientEmail}, invoice: ${invoiceData.invoiceNumber}`
    );

    // Build the HTML email body
    const html = buildInvoiceEmailHtml(invoiceData);

    // Wrap email sending in a timeout so the API never hangs forever
    const EMAIL_TIMEOUT_MS = 55000; // 55 seconds max (under Render's 60s request timeout)
    let timeoutHandle;
    const emailPromise = sendEmail({
      to: recipientEmail,
      subject: `Invoice ${invoiceData.invoiceNumber} — ${
        invoiceData.customerName || "POS Customer"
      }`,
      html,
      text: `Invoice ${invoiceData.invoiceNumber}\nOrder ID: ${invoiceData.orderId}\nTotal: ₹${invoiceData.totalAmount}\n\nThank you for your business!`,
    });

    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error("Email sending timed out. The SMTP server did not respond in time.")),
        EMAIL_TIMEOUT_MS
      );
    });

    const result = await Promise.race([emailPromise, timeoutPromise]);
    clearTimeout(timeoutHandle);

    console.log(`[invoiceController] sendInvoiceEmail SUCCESS — messageId: ${result.messageId}`);

    return res.json({
      success: true,
      message: "Invoice sent successfully.",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[invoiceController] sendInvoiceEmail error:", error.message);
    if (error.code) console.error("[invoiceController] Error code:", error.code);
    if (error.responseCode) console.error("[invoiceController] SMTP response code:", error.responseCode);
    if (error.response) console.error("[invoiceController] SMTP response:", error.response);

    // Provide a user-friendly message for SMTP configuration issues
    const isConfigError =
      error.message && error.message.includes("not configured");
    const isTimeout =
      error.message && (error.message.includes("timed out") || error.code === "ETIMEDOUT" || error.code === "ESOCKET");
    const isAuthError =
      error.responseCode === 535 || (error.message && error.message.includes("authentication"));
    const statusCode = isConfigError ? 503 : isTimeout ? 504 : isAuthError ? 502 : 500;

    let userMessage;
    if (isConfigError) {
      userMessage = "Email service is not configured. Please contact your administrator to set up SMTP settings.";
    } else if (isTimeout) {
      userMessage = "Email sending timed out. The mail server did not respond. Please try again or contact support.";
    } else if (isAuthError) {
      userMessage = "Email authentication failed. Please contact your administrator to verify SMTP credentials.";
    } else {
      userMessage = `Failed to send invoice email: ${error.message || "Unknown error"}. Please try again.`;
    }

    return res.status(statusCode).json({
      success: false,
      message: userMessage,
      detail: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (SuperAdmin/Admin)
const deleteInvoice = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.user?.role || req.user?.userRole || req.user?.accountType;
    const isSuperAdmin = ["superadmin", "super_admin"].includes(String(role).toLowerCase());
    const isAdmin = ["admin"].includes(String(role).toLowerCase());

    if (!isSuperAdmin && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. Only admins can delete invoices." });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid invoice ID format." });
    }

    // 1. Try to find and delete as a real Invoice record
    const invoice = await Invoice.findById(id);
    if (invoice) {
      const orderIdString = invoice.orderId;
      await Invoice.findByIdAndDelete(id);
      
      // Also delete the corresponding Order to prevent re-derivation in getInvoices
      const Order = require("../models/Order");
      await Order.findOneAndDelete({ orderId: orderIdString });
      
      return res.json({ success: true, message: "Invoice and related order deleted successfully" });
    }

    // 2. If not found as an Invoice, it might be a derived invoice where ID is the Order _id
    const Order = require("../models/Order");
    const order = await Order.findByIdAndDelete(id);
    if (order) {
      // Also try to delete any Invoice record that might exist for this orderId string
      await Invoice.findOneAndDelete({ orderId: order.orderId });
      return res.json({ success: true, message: "Invoice (derived from order) deleted successfully" });
    }

    return res.status(404).json({ success: false, message: "Invoice not found" });
  } catch (error) {
    console.error("[invoiceController] deleteInvoice error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  sendInvoiceEmail,
  deleteInvoice,
};

