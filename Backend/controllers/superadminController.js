const mongoose = require("mongoose");
const User = require("../models/User");
const Client = require("../models/Client");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const ImpersonationAuditLog = require("../models/ImpersonationAuditLog");
const generateToken = require("../utils/generateToken");

function resolveRequestMeta(req) {
  const xf = req.headers["x-forwarded-for"];
  const fromForwarded =
    typeof xf === "string" && xf.length ? xf.split(",")[0].trim() : null;
  const ipAddress = fromForwarded || req.ip || null;
  const userAgent = req.headers["user-agent"] || null;
  return { ipAddress, userAgent };
}

/** Roles Super Admin may open via impersonation JWT (target role in token). Never `super_admin`. */
const IMPERSONATABLE_ROLES = new Set([
  "admin",
  "user",
  "customer",
  "staff",
  "cashier",
  "inventory_manager",
  "seo_manager",
  "client",
  "store_manager",
  "employee",
]);

// @route   POST /api/superadmin/impersonate/:adminId
// @access  Super Admin only
const impersonateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ success: false, message: "Invalid admin id" });
    }

    const target = await User.findById(adminId).select("-password");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (target.role === "super_admin" || !IMPERSONATABLE_ROLES.has(target.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Impersonation is not allowed for this role. Use Open Super Admin from the directory when applicable.",
      });
    }
    if (!target.isActive) {
      return res.status(403).json({ success: false, message: "Target admin account is inactive" });
    }

    const superAdminId = req.user._id;
    if (String(target._id) === String(superAdminId)) {
      return res.status(400).json({ success: false, message: "Cannot impersonate your own account" });
    }

    const expiresIn = process.env.IMPERSONATION_JWT_EXPIRES || "8h";
    const token = generateToken(target._id, target.email, target.role, {
      impersonatedBy: superAdminId,
      expiresIn,
    });

    await ImpersonationAuditLog.create({
      superAdminId,
      targetAdminId: target._id,
      actionType: "impersonate_start",
      timestamp: new Date(),
    });

    const { ipAddress, userAgent } = resolveRequestMeta(req);
    console.log(
      `[Impersonation] start superAdmin=${superAdminId} admin=${target._id} ip=${ipAddress} ua=${userAgent ? "yes" : "no"}`
    );

    res.json({
      success: true,
      message: "Impersonation session started",
      data: {
        token,
        expiresIn,
        user: {
          _id: target._id,
          name: target.name,
          email: target.email,
          role: target.role,
          isAdmin: target.role === "admin" || target.role === "super_admin",
          isSuperAdmin: target.role === "super_admin",
        },
        impersonation: {
          active: true,
          superAdminId: String(superAdminId),
          superAdminName: req.user.name,
          superAdminEmail: req.user.email,
        },
      },
    });
  } catch (error) {
    console.error("[Superadmin] impersonateAdmin:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/superadmin/impersonate/stop
// @access  Valid impersonation JWT (admin session opened by Super Admin)
const stopImpersonation = async (req, res) => {
  try {
    const superAdminId = req.tokenPayload.impersonatedBy;
    const superAdmin = await User.findById(superAdminId).select("-password");

    if (!superAdmin || superAdmin.role !== "super_admin" || !superAdmin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Original Super Admin session is no longer valid",
      });
    }

    const targetAdminId = req.user._id;

    await ImpersonationAuditLog.create({
      superAdminId,
      targetAdminId,
      actionType: "impersonate_end",
      timestamp: new Date(),
    });

    const { ipAddress, userAgent } = resolveRequestMeta(req);
    console.log(
      `[Impersonation] end superAdmin=${superAdminId} admin=${targetAdminId} ip=${ipAddress} ua=${userAgent ? "yes" : "no"}`
    );

    const token = generateToken(superAdmin._id, superAdmin.email, "super_admin");

    res.json({
      success: true,
      message: "Returned to Super Admin session",
      data: {
        token,
        user: {
          _id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          role: "super_admin",
          isAdmin: true,
          isSuperAdmin: true,
        },
      },
    });
  } catch (error) {
    console.error("[Superadmin] stopImpersonation:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all clients
// @route   GET /api/superadmin/clients
// @access  Super Admin only
const getClients = async (req, res) => {
  try {
    const clients = await Client.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: clients.length, data: clients });
  } catch (error) {
    console.error("[Superadmin] getClients error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get sales (orders) for a specific client
// @route   GET /api/superadmin/clients/:clientId/sales
// @access  Super Admin only
const getClientSales = async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`[Superadmin] getClientSales - clientId: ${clientId}`);

    // Build scope conditions covering all possible field name variants
    const scopeConditions = [
      { clientId },
      { client: clientId },
      { client_id: clientId },
      { storeId: clientId },
      { createdBy: clientId },
    ];

    if (mongoose.Types.ObjectId.isValid(clientId)) {
      const oid = new mongoose.Types.ObjectId(clientId);
      scopeConditions.push(
        { clientId: oid },
        { client: oid },
        { client_id: oid },
        { storeId: oid },
        { createdBy: oid }
      );
    }

    const sales = await Order.find({ $or: scopeConditions })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    console.log(`[Superadmin] getClientSales count: ${sales.length}`);
    res.json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    console.error("[Superadmin] getClientSales error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get invoices for a specific client
// @route   GET /api/superadmin/clients/:clientId/invoices
// @access  Super Admin only
//
// NOTE: The Invoice model has no clientId field.
// Invoices are linked to orders via orderId (string).
// Strategy: find orders for this client → collect their orderId strings → find matching invoices.
const getClientInvoices = async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`[Superadmin] getClientInvoices - clientId: ${clientId}`);

    const orderScopeConditions = [
      { clientId },
      { client: clientId },
      { client_id: clientId },
      { storeId: clientId },
      { createdBy: clientId },
    ];

    if (mongoose.Types.ObjectId.isValid(clientId)) {
      const oid = new mongoose.Types.ObjectId(clientId);
      orderScopeConditions.push(
        { clientId: oid },
        { client: oid },
        { client_id: oid },
        { storeId: oid },
        { createdBy: oid }
      );
    }

    // Step 1: find all orders for this client (only need orderId field)
    const clientOrders = await Order.find({ $or: orderScopeConditions }).select("orderId");
    const orderIds = [...new Set(clientOrders.map((o) => o.orderId).filter(Boolean))];

    console.log(
      `[Superadmin] getClientInvoices - ${clientOrders.length} orders, ${orderIds.length} unique orderIds`
    );

    // Step 2: find invoices whose orderId matches one of those order IDs
    let invoices = [];
    if (orderIds.length > 0) {
      invoices = await Invoice.find({ orderId: { $in: orderIds } }).sort({ createdAt: -1 });
    }

    console.log(`[Superadmin] getClientInvoices count: ${invoices.length}`);
    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    console.error("[Superadmin] getClientInvoices error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customers for a specific client
// @route   GET /api/superadmin/clients/:clientId/customers
// @access  Super Admin only
//
// NOTE: Regular user/customer roles do NOT have clientId set on their User document.
// Strategy: find all orders for this client → extract unique buyers → aggregate totals.
const getClientCustomers = async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`[Superadmin] getClientCustomers - clientId: ${clientId}`);

    const orderScopeConditions = [
      { clientId },
      { client: clientId },
      { client_id: clientId },
      { storeId: clientId },
      { createdBy: clientId },
    ];

    if (mongoose.Types.ObjectId.isValid(clientId)) {
      const oid = new mongoose.Types.ObjectId(clientId);
      orderScopeConditions.push(
        { clientId: oid },
        { client: oid },
        { client_id: oid },
        { storeId: oid },
        { createdBy: oid }
      );
    }

    const clientOrders = await Order.find({ $or: orderScopeConditions })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    console.log(
      `[Superadmin] getClientCustomers - ${clientOrders.length} orders for clientId: ${clientId}`
    );

    // Build a deduplicated customer map keyed by userId (stable) or email (guest fallback)
    const customerMap = new Map();

    for (const order of clientOrders) {
      const populatedUser =
        order.user && typeof order.user === "object" && order.user._id ? order.user : null;

      // Choose a stable dedup key
      const key = populatedUser
        ? String(populatedUser._id)
        : order.customerEmail || null;

      if (!key) continue; // Skip orders with no customer identity

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          _id: populatedUser ? String(populatedUser._id) : key,
          name:
            populatedUser?.name ||
            order.customerName ||
            order.shippingAddress?.fullName ||
            "—",
          email:
            populatedUser?.email ||
            order.customerEmail ||
            order.shippingAddress?.email ||
            "",
          phone:
            populatedUser?.phone ||
            order.shippingAddress?.phone ||
            "",
          totalOrders: 0,
          totalSpent: 0,
          createdAt: order.createdAt,
        });
      }

      const entry = customerMap.get(key);
      entry.totalOrders += 1;
      entry.totalSpent += order.totalPrice || 0;
    }

    const customers = Array.from(customerMap.values());

    console.log(`[Superadmin] getClientCustomers count: ${customers.length}`);
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    console.error("[Superadmin] getClientCustomers error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Super Admin Overview (Combined data from all clients)
// @route   GET /api/superadmin/overview
// @access  Super Admin only
const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total Revenue: Sum of all paid/completed orders
    const paidMatch = {
      $or: [
        { paymentStatus: { $in: ["paid", "completed", "success"] } },
        { "payment.status": { $in: ["paid", "completed", "success"] } },
        { orderStatus: { $in: ["delivered", "completed"] } },
        { status: { $in: ["delivered", "completed"] } }
      ]
    };
    const revAgg = await Order.aggregate([
      { $match: paidMatch },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", { $ifNull: ["$totalAmount", { $ifNull: ["$grandTotal", { $ifNull: ["$amount", 0] }] }] }] } } } }
    ]);
    const totalRevenue = revAgg[0]?.total || 0;

    // 2. Active Customers
    const activeCustomers = (await Order.distinct("user", { user: { $ne: null } })).length;

    // 3. New Customers this month
    const newCustomers = await User.countDocuments({ 
      role: { $in: ["user", "customer"] }, 
      createdAt: { $gte: startOfMonth } 
    });

    // 4. Conversion Rate
    const totalCustomers = await User.countDocuments({ role: { $in: ["user", "customer"] } });
    const conversionRate = totalCustomers > 0 ? Math.min(100, (activeCustomers / totalCustomers) * 100) : 0;

    // 5. Sales This Month
    const monthOrdersMatch = {
      $or: [
        { createdAt: { $gte: startOfMonth } },
        { orderDate: { $gte: startOfMonth } }
      ]
    };
    const monthOrdersAgg = await Order.aggregate([
      { $match: monthOrdersMatch },
      { $group: { 
          _id: null, 
          sales: { $sum: { $ifNull: ["$totalPrice", { $ifNull: ["$totalAmount", { $ifNull: ["$grandTotal", { $ifNull: ["$amount", 0] }] }] }] } },
          count: { $sum: 1 }
        }
      }
    ]);
    const salesThisMonth = monthOrdersAgg[0]?.sales || 0;
    const totalOrdersThisMonth = monthOrdersAgg[0]?.count || 0;

    // 6. Loss This Month
    const lossMatch = {
      $and: [
        {
          $or: [
            { createdAt: { $gte: startOfMonth } },
            { orderDate: { $gte: startOfMonth } }
          ]
        },
        {
          $or: [
            { orderStatus: { $in: ["cancelled", "refunded", "failed"] } },
            { status: { $in: ["cancelled", "refunded", "failed"] } },
            { paymentStatus: { $in: ["refunded", "failed"] } },
            { "payment.status": { $in: ["refunded", "failed"] } }
          ]
        }
      ]
    };
    const lossAgg = await Order.aggregate([
      { $match: lossMatch },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", { $ifNull: ["$totalAmount", { $ifNull: ["$grandTotal", { $ifNull: ["$amount", 0] }] }] }] } } } }
    ]);
    const lossThisMonth = lossAgg[0]?.total || 0;

    // 7. Profit This Month
    const paidMonthMatch = {
      $and: [
        {
          $or: [
            { createdAt: { $gte: startOfMonth } },
            { orderDate: { $gte: startOfMonth } }
          ]
        },
        paidMatch
      ]
    };
    const paidMonthAgg = await Order.aggregate([
      { $match: paidMonthMatch },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", { $ifNull: ["$totalAmount", { $ifNull: ["$grandTotal", { $ifNull: ["$amount", 0] }] }] }] } } } }
    ]);
    const paidRevenueThisMonth = paidMonthAgg[0]?.total || 0;
    const profitThisMonth = paidRevenueThisMonth - lossThisMonth;

    // Live Customers
    const liveCustomers = 12;

    // 8. Sales Analytics (last 7 days)
    const salesAnalytics = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const agg = await Order.aggregate([
        { 
          $match: { 
            $or: [
              { createdAt: { $gte: d, $lt: nextD } },
              { orderDate: { $gte: d, $lt: nextD } }
            ] 
          } 
        },
        { $group: { _id: null, revenue: { $sum: { $ifNull: ["$totalPrice", { $ifNull: ["$totalAmount", { $ifNull: ["$grandTotal", { $ifNull: ["$amount", 0] }] }] }] } }, orders: { $sum: 1 } } }
      ]);
      salesAnalytics.push({
        date: d.toISOString().slice(0, 10),
        revenue: agg[0]?.revenue || 0,
        orders: agg[0]?.orders || 0
      });
    }

    // 9. Category Distribution
    const categoryDistributionAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "p"
        }
      },
      {
        $addFields: {
          categoryName: { $ifNull: [{ $arrayElemAt: ["$p.category", 0] }, "Uncategorized"] }
        }
      },
      {
        $group: {
          _id: "$categoryName",
          totalSales: { $sum: { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 0] }] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 8 }
    ]);

    const categoryDistribution = categoryDistributionAgg.map(c => ({
      category: c._id || "Uncategorized",
      totalSales: c.totalSales,
      orderCount: c.orderCount
    }));

    // Debugging logs
    console.log("[SuperAdmin Overview] Total clients count:", await Client.countDocuments());
    console.log("[SuperAdmin Overview] Total orders count:", await Order.countDocuments());
    console.log("[SuperAdmin Overview] Paid orders count:", await Order.countDocuments(paidMatch));
    console.log("[SuperAdmin Overview] Calculated totalRevenue:", totalRevenue);
    console.log("[SuperAdmin Overview] Calculated profit/loss:", profitThisMonth, lossThisMonth);

    res.json({
      success: true,
      data: {
        totalRevenue,
        activeCustomers,
        newCustomers,
        conversionRate,
        salesThisMonth,
        lossThisMonth,
        profitThisMonth,
        totalOrdersThisMonth,
        liveCustomers,
        salesAnalytics,
        categoryDistribution
      }
    });
  } catch (error) {
    console.error("[Superadmin] getOverview error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get invoice by orderId
// @route   GET /api/superadmin/invoices/:orderId
// @access  Super Admin only
const getInvoiceByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log("Invoice request orderId:", orderId);

    // 1. Find Order using multiple fields (robust lookup)
    const orderQuery = {
      $or: [
        { orderId: orderId },
        { orderNumber: orderId }
      ]
    };

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      orderQuery.$or.push({ _id: orderId });
    }

    const order = await Order.findOne(orderQuery).populate("user", "name email phone");
    console.log("Order found:", !!order);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 2. Try to find existing invoice in collection
    // Use the actual orderId from the found order document for consistency
    const invoice = await Invoice.findOne({ 
      $or: [
        { orderId: order.orderId },
        { orderId: orderId }
      ]
    });
    console.log("Invoice found:", !!invoice);

    // 3. Fallback logic: return existing invoice OR generate from order
    const invoiceNo = invoice?.invoiceNumber || invoice?.invoiceNo || `INV-${order.orderId.replace("ORD-", "")}`;
    
    const responseData = {
      invoiceNo,
      orderId: order.orderId,
      customerName: order.shippingAddress?.fullName || order.customerName || order.user?.name || "Guest Customer",
      customerEmail: order.customerEmail || order.user?.email || "",
      customerPhone: order.shippingAddress?.phone || order.user?.phone || "",
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      subtotal: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: order.taxPrice || order.tax || 0,
      discount: order.discount || 0,
      total: order.totalPrice || order.amount || 0,
      paymentStatus: order.paymentStatus || (order.isPaid ? "paid" : "pending"),
      paymentMethod: order.paymentMethod || "N/A",
      orderStatus: order.orderStatus || order.status || "placed",
      createdAt: order.createdAt
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error("[Superadmin] getInvoiceByOrderId error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  impersonateAdmin,
  stopImpersonation,
  getClients,
  getClientSales,
  getClientInvoices,
  getClientCustomers,
  getOverview,
  getInvoiceByOrderId,
};
