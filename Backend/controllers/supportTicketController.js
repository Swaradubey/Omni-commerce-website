const SupportTicket = require("../models/SupportTicket");
const Order = require("../models/Order");
const ZendeskService = require("../services/zendeskService");
const { normalizeRole } = require("../utils/clientScopedRoles");

const ALLOWED_USER_ROLES = new Set([
  "user",
  "customer",
  "admin",
  "staff",
  "inventory_manager",
  "cashier",
  "seo_manager",
  "client",
  "store_manager",
  "employee",
]);

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// ─── Helper ───────────────────────────────────────────────────────────────────

function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return ADMIN_ROLES.has(normalized);
}

// ─── POST /api/support-tickets ───────────────────────────────────────────────
// @desc    Create a support ticket (authenticated user only)
// @access  Private (any logged-in user with a dashboard role)
const createSupportTicket = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { subject, issueType, description, orderId, priority } = req.body;

    // Validate required fields
    const errors = [];
    if (!subject || !String(subject).trim()) errors.push("Subject is required");
    if (!issueType || !String(issueType).trim()) errors.push("Issue type is required");
    if (!description || !String(description).trim()) errors.push("Description is required");
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(". ") });
    }

    // Resolve optional order — must belong to the requesting user
    let orderRef = null;
    let orderDoc = null;
    if (orderId && String(orderId).trim()) {
      orderDoc = await Order.findOne({
        _id: orderId,
        user: userId,
      }).select("_id orderId").lean();

      if (!orderDoc) {
        return res.status(404).json({
          success: false,
          message: "Order not found or does not belong to your account",
        });
      }
      orderRef = orderDoc.orderId || null;
    }

    // Attempt to create a Zendesk ticket if integrated
    let zendeskTicketId = null;
    try {
      const zdTicket = await ZendeskService.createTicket({
        subject: String(subject).trim(),
        description: String(description).trim(),
        name: req.user.name || "User",
        email: req.user.email || "user@example.com",
        tags: [issueType, "user_raised", orderRef].filter(Boolean)
      });
      if (zdTicket) {
        zendeskTicketId = String(zdTicket.id);
      }
    } catch (zdErr) {
      console.warn("[SupportTicket] Zendesk sync failed (skipping):", zdErr.message);
      // We continue since local database persistence is the primary goal
    }

    const ticket = await SupportTicket.create({
      user: userId,
      userName: req.user.name || "",
      userEmail: req.user.email || "",
      role: req.user.role || "user",
      order: orderDoc?._id || undefined,
      orderRef,
      subject: String(subject).trim(),
      issueType: String(issueType).trim(),
      description: String(description).trim(),
      status: "open",
      priority: priority || "normal",
      zendeskTicketId
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("[SupportTicket] createSupportTicket:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/support-tickets/my ─────────────────────────────────────────────
// @desc    Get all tickets for the logged-in user
// @access  Private (any authenticated user)
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const tickets = await SupportTicket.find({ user: userId })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return res.json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    console.error("[SupportTicket] getMyTickets:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/support-tickets/admin ──────────────────────────────────────────
// @desc    Get all tickets (admin view)
// @access  Private (admin / super_admin only)
const getAllTickets = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const isClient = req.user && req.user.role === "client";
    const clientId = req.user?.clientId || req.clientId;

    if (!isSuperAdmin && !isClient && !isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    // Requirement 10 & 16: Log data retrieval details
    console.log(`[SupportTicket] getAllTickets - Page: Support, Role: ${req.user?.role}, ClientId: ${clientId || "global"}`);

    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && ["open", "in_progress", "resolved", "closed"].includes(status)) {
      filter.status = status;
    }

    // Apply tenant scoping for non-super_admin
    if (!isSuperAdmin && clientId) {
      filter.clientId = clientId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Requirement 16: Log DB query details
    console.log(`[SupportTicket] DB Query - Collection: supporttickets, Filter: ${JSON.stringify(filter)}`);

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "name email role")
        .populate("order", "orderId totalPrice orderStatus createdAt items")
        .select("-__v")
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: tickets.length,
      total,
      data: tickets,
    });
  } catch (error) {
    console.error("[SupportTicket] getAllTickets:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/support-tickets/:id ────────────────────────────────────────────
// @desc    Get single ticket (owner or admin)
// @access  Private
const getTicketById = async (req, res) => {
  try {
    const userId = req.user?._id;
    const ticketId = req.params.id;

    const ticket = await SupportTicket.findById(ticketId)
      .populate("user", "name email role")
      .populate("order", "orderId totalPrice orderStatus createdAt items")
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const isOwner = String(ticket.user?._id || ticket.user) === String(userId);
    const isAdmin = isAdminRole(req.user?.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("[SupportTicket] getTicketById:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /api/support-tickets/:id/status ───────────────────────────────────
// @desc    Update ticket status (admin only) + optional admin response
// @access  Private (admin / super_admin)
const updateTicketStatus = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { status, adminResponse } = req.body;
    const VALID_STATUSES = ["open", "pending", "in_progress", "resolved", "closed"];

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const update = {
      status,
      resolvedBy: req.user._id,
    };
    if (adminResponse && String(adminResponse).trim()) {
      update.adminResponse = String(adminResponse).trim();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate("user", "name email role")
      .populate("order", "orderId totalPrice orderStatus")
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    return res.json({
      success: true,
      message: "Ticket updated",
      data: ticket,
    });
  } catch (error) {
    console.error("[SupportTicket] updateTicketStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ZENDESK INTEGRATION FOR ADMIN SUPPORT PAGE ──────────────────────────────

// @desc    Create a Zendesk support ticket from dashboard
// @access  Private (admin / super_admin)
const createZendeskTicket = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!isAdminRole(userRole)) {
      console.warn(`[Zendesk] Access denied for role: ${userRole}`);
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { subject, description, category, priority } = req.body;
    // Use provided name/email or fallback to authenticated user's data
    const name = req.body.name || req.user?.name || "Support Admin";
    const email = req.body.email || req.user?.email;

    if (!subject || !description || !email) {
      return res.status(400).json({ 
        success: false, 
        message: "Subject, description, and email are required" 
      });
    }

    // Map category to tags (Exact mapping requested)
    let tags = [];
    if (category) {
      const mapping = {
        'Customer Queries': 'customer_query',
        'Reported Issues': 'reported_issue',
        'Order Support': 'order_support'
      };
      const mappedTag = mapping[category] || String(category).toLowerCase().replace(/\s+/g, '_');
      tags.push(mappedTag);
    }
    if (priority) {
      tags.push(`priority_${priority}`);
    }

    // Check if service is configured
    try {
      const ticket = await ZendeskService.createTicket({
        subject,
        description,
        name,
        email,
        tags
      });

      if (!ticket) {
        console.error("[Zendesk] createTicket returned null (likely missing config)");
        return res.status(500).json({ 
          success: false, 
          message: "Zendesk API is not configured on the backend" 
        });
      }

      // Optionally save mapping locally
      await SupportTicket.create({
        user: req.user._id,
        userName: name,
        userEmail: email,
        subject,
        issueType: tags[0] || "other", 
        description,
        status: "open",
        zendeskTicketId: String(ticket.id)
      });

      return res.status(201).json({
        success: true,
        message: "Ticket created successfully",
        data: ticket
      });
    } catch (zdErr) {
      console.error("[Zendesk Service Error]", zdErr);
      const isAuthError = zdErr.message.includes('401') || zdErr.message.toLowerCase().includes('unauthorized');
      return res.status(isAuthError ? 401 : 500).json({ 
        success: false, 
        message: isAuthError ? "Invalid Zendesk API credentials" : `Zendesk API Error: ${zdErr.message}`
      });
    }

  } catch (error) {
    console.error("[Zendesk] createZendeskTicket unexpected error: ", error);
    return res.status(500).json({ success: false, message: "Internal server error during ticket creation" });
  }
};

// @desc    Get Zendesk tickets for Admin Support Page
// @access  Private (admin / super_admin)
const getZendeskTickets = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    try {
      const tickets = await ZendeskService.getTickets();
      
      if (!tickets || tickets.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          message: "No tickets found"
        });
      }

      // Normalize properties as requested
      const normalizedTickets = tickets.map(t => ({
        id: t.id,
        subject: t.subject,
        requesterName: t.requester?.name || 'Unknown',
        requesterEmail: t.requester?.email || 'N/A',
        status: t.status,
        priority: t.priority || "normal",
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        tags: t.tags || []
      }));

      return res.status(200).json({
        success: true,
        data: normalizedTickets
      });
    } catch (zdErr) {
      console.error("[Zendesk Service Error] getTickets:", zdErr);
      const isAuthError = zdErr.message.includes('401') || zdErr.message.toLowerCase().includes('unauthorized');
      return res.status(isAuthError ? 401 : 500).json({ 
        success: false, 
        message: isAuthError ? "Invalid Zendesk API credentials" : `Failed to load Zendesk tickets: ${zdErr.message}`
      });
    }
  } catch (error) {
    console.error("[Zendesk Controller Error] getZendeskTickets:", error);
    return res.status(500).json({ success: false, message: "Internal server error while fetching tickets" });
  }
};

// @desc    Get Zendesk stats for Admin Support Page
// @access  Private (admin / super_admin)
const getZendeskStats = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    try {
      const stats = await ZendeskService.getStats();
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (zdErr) {
      console.error("[Zendesk Service Error] getStats:", zdErr);
      return res.status(500).json({ success: false, message: "Failed to fetch Zendesk stats" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get stats for user's own tickets
// @access  Private (any authenticated user)
const getMyTicketStats = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const [total, open, resolved, pending] = await Promise.all([
      SupportTicket.countDocuments({ user: userId }),
      SupportTicket.countDocuments({ user: userId, status: "open" }),
      SupportTicket.countDocuments({ user: userId, status: "resolved" }),
      SupportTicket.countDocuments({ user: userId, status: "pending" }),
    ]);

    return res.json({
      success: true,
      data: { total, open, resolved, pending }
    });
  } catch (error) {
    console.error("[SupportTicket] getMyTicketStats:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get comments/messages for a specific Zendesk ticket (Chat)
// @access  Private (admin or ticket owner)
const getZendeskTicketComments = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Ticket ID is required" });
    }

    const userId = req.user?._id;
    const isAdmin = isAdminRole(req.user?.role);

    // If not admin, verify ownership
    if (!isAdmin) {
      const ticket = await SupportTicket.findOne({ zendeskTicketId: id, user: userId });
      if (!ticket) {
        console.warn(`[SupportTicket] Access denied to Zendesk ticket ${id} for user ${userId}`);
        return res.status(403).json({ success: false, message: "Access denied. You do not own this ticket." });
      }
    }

    try {
      const comments = await ZendeskService.getTicketComments(id);
      
      let normalizedComments = comments.map(c => ({
        id: c.id,
        body: c.body,
        authorName: c.author?.name || 'Unknown',
        authorRole: c.author?.role || 'end-user',
        isPublic: c.public,
        createdAt: c.created_at,
      }));

      // Filter out internal/private notes if user is not admin
      if (!isAdmin) {
        normalizedComments = normalizedComments.filter(c => c.isPublic === true);
      }

      return res.status(200).json({
        success: true,
        data: normalizedComments
      });
    } catch (zdErr) {
      console.error("[Zendesk Service Error] getTicketComments:", zdErr);
      return res.status(500).json({ 
        success: false, 
        message: `Failed to load messages: ${zdErr.message}` 
      });
    }
  } catch (error) {
    console.error("[Zendesk Controller Error] getZendeskTicketComments:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// @desc    Add a comment/message to a specific Zendesk ticket (Chat)
// @access  Private (admin or ticket owner)
const addZendeskTicketComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    // Default to true if not explicitly false
    const isPublic = req.body.isPublic !== false;

    if (!id) {
      return res.status(400).json({ success: false, message: "Ticket ID is required" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const userId = req.user?._id;
    const isAdmin = isAdminRole(req.user?.role);

    let authorId = null;
    // If not admin, verify ownership
    if (!isAdmin) {
      const localTicket = await SupportTicket.findOne({ zendeskTicketId: id, user: userId });
      if (!localTicket) {
        console.warn(`[SupportTicket] Access denied to add comment on Zendesk ticket ${id} for user ${userId}`);
        return res.status(403).json({ success: false, message: "Access denied. You do not own this ticket." });
      }

      // Find the Zendesk requester ID so the comment is authored by the user
      try {
        const zdTicket = await ZendeskService.getTicket(id);
        if (zdTicket && zdTicket.requester_id) {
          authorId = zdTicket.requester_id;
        }
      } catch (err) {
        console.warn("[SupportTicket] Could not fetch requester_id for user reply:", err.message);
      }
    }

    try {
      const ticket = await ZendeskService.addTicketComment(id, String(message).trim(), isPublic, authorId);
      return res.status(201).json({
        success: true,
        data: ticket,
        message: "Message sent successfully"
      });
    } catch (zdErr) {
      console.error("[Zendesk Service Error] addTicketComment:", zdErr);
      return res.status(500).json({ 
        success: false, 
        message: `Failed to send message: ${zdErr.message}` 
      });
    }
  } catch (error) {
    console.error("[Zendesk Controller Error] addZendeskTicketComment:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


module.exports = {
  createSupportTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  createZendeskTicket,
  getZendeskTickets,
  getZendeskStats,
  getMyTicketStats,
  getZendeskTicketComments,
  addZendeskTicketComment,
};
