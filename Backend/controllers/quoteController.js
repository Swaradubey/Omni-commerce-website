const Quote = require("../models/Quote");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const { resolveClientId, isValidObjectId } = require("../utils/tenantResolver");
const mongoose = require("mongoose");

const generateQuoteNumber = () => {
  return `QT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const generateInvoiceNumber = () => {
  return `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Private
const getQuotes = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "client");
    const clientId = req.user?.clientId || req.clientId || (await resolveClientId(req));

    console.log(`[quoteController] getQuotes - Role: ${req.user?.role}, ClientId: ${clientId || "global"}`);

    let query = {};

    if (isSuperAdmin) {
      // Super Admin sees all
      query = {};
    } else if (isAdmin) {
      // Admin sees client-specific
      query = { clientId };
    } else {
      // Regular user sees their own
      query = { userId: req.user._id };
    }

    console.log("-----------------------------------------");
    console.log("role:", req.user?.role, "clientId:", clientId, "query:", JSON.stringify(query));
    console.log("-----------------------------------------");
    const quotes = await Quote.find(query).sort({ createdAt: -1 });

    res.json({ success: true, count: quotes.length, data: quotes });
  } catch (error) {
    console.error("[quoteController] getQuotes error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get quote by ID
// @route   GET /api/quotes/:id
// @access  Private
const getQuoteById = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const clientId = req.user?.clientId || req.clientId || (await resolveClientId(req));

    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Quote not found or access denied (Invalid ID)" });
    }

    let query = { _id: req.params.id };
    if (!isSuperAdmin) {
      if (req.user.role === "admin" || req.user.role === "client") {
        query.clientId = clientId;
      } else {
        query.userId = req.user._id;
      }
    }

    const quote = await Quote.findOne(query);

    if (!quote) {
      return res.status(404).json({ success: false, message: "Quote not found or access denied" });
    }

    res.json({ success: true, data: quote });
  } catch (error) {
    console.error("[quoteController] getQuoteById error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new quote
// @route   POST /api/quotes
// @access  Private
const createQuote = async (req, res) => {
  try {
    const { products, originalTotal, requestedPrice, message } = req.body;
    
    // Improved clientId resolution: Body -> Headers -> User Context -> Tenant Resolver -> TenantId
    let clientId = req.body.clientId || req.headers["x-client-id"] || req.user?.clientId || req.clientId || req.tenantId;
    
    if (!clientId) {
      clientId = await resolveClientId(req);
    }

    // Requirement 8.3: Resolve from product if still missing
    if (!clientId && products && products.length > 0) {
      const firstProductId = products[0].productId;
      if (isValidObjectId(firstProductId)) {
        const product = await Product.findById(String(firstProductId)).select("clientId");
        if (product && product.clientId) {
          clientId = product.clientId.toString();
          console.log(`[quoteController] Resolved clientId ${clientId} from product ${firstProductId}`);
        }
      }
    }

    if (!clientId) {
      console.warn("[quoteController] Could not resolve clientId for quote request");
      return res.status(400).json({ success: false, message: "Client ID is required for quote request" });
    }

    const quote = await Quote.create({
      quoteNumber: generateQuoteNumber(),
      userId: req.user._id,
      clientId,
      customerName: req.user.name || req.user.email,
      customerEmail: req.user.email,
      products,
      originalTotal,
      requestedPrice,
      message,
      status: "pending",
    });

    res.status(201).json({ success: true, data: quote });
  } catch (error) {
    console.error("[quoteController] createQuote error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send counter offer (Admin)
// @route   PATCH /api/quotes/:id/counter
// @access  Private (Admin/SuperAdmin)
const sendCounterOffer = async (req, res) => {
  try {
    const { counterPrice, adminMessage } = req.body;
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Quote not found (Invalid ID)" });
    }
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({ success: false, message: "Quote not found" });
    }

    quote.counterPrice = counterPrice;
    quote.adminMessage = adminMessage;
    quote.status = "countered";
    await quote.save();

    res.json({ success: true, data: quote });
  } catch (error) {
    console.error("[quoteController] sendCounterOffer error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept quote/counter offer
// @route   PATCH /api/quotes/:id/accept
// @access  Private
const acceptQuote = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Quote not found (Invalid ID)" });
    }
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({ success: false, message: "Quote not found" });
    }

    // If admin is accepting user's requested price
    if (req.user.role === "admin" || req.user.role === "super_admin") {
      quote.finalPrice = quote.requestedPrice;
    } 
    // If user is accepting admin's counter price
    else {
      if (quote.status !== "countered") {
        return res.status(400).json({ success: false, message: "Quote must be countered to accept counter price" });
      }
      quote.finalPrice = quote.counterPrice;
    }

    quote.status = "accepted";
    await quote.save();

    res.json({ success: true, data: quote });
  } catch (error) {
    console.error("[quoteController] acceptQuote error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject quote
// @route   PATCH /api/quotes/:id/reject
// @access  Private
const rejectQuote = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Quote not found (Invalid ID)" });
    }
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({ success: false, message: "Quote not found" });
    }

    quote.status = "rejected";
    await quote.save();

    res.json({ success: true, data: quote });
  } catch (error) {
    console.error("[quoteController] rejectQuote error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Convert quote to invoice
// @route   POST /api/quotes/:id/convert-to-invoice
// @access  Private (Admin/SuperAdmin)
const convertToInvoice = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Quote not found (Invalid ID)" });
    }
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({ success: false, message: "Quote not found" });
    }

    if (quote.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Only accepted quotes can be converted to invoices" });
    }

    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      orderId: quote.quoteNumber, // Use quote number as reference
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      items: quote.products.map(p => ({
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        subtotal: p.price * p.quantity,
      })),
      subtotal: quote.finalPrice,
      totalAmount: quote.finalPrice,
      paymentStatus: "pending",
      clientId: quote.clientId,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error("[quoteController] convertToInvoice error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getQuotes,
  getQuoteById,
  createQuote,
  sendCounterOffer,
  acceptQuote,
  rejectQuote,
  convertToInvoice,
};

