const mongoose = require("mongoose");
const InboxConversation = require("../models/InboxConversation");
const { validationResult } = require("express-validator");

function userIdFromReq(req) {
  if (!req.user) return null;
  return req.user._id || req.user.id;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toListItem(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const id = String(o._id);
  return {
    id,
    customerName: o.customerName,
    customerEmail: o.customerEmail || "",
    subject: o.subject,
    status: o.status,
    unreadCount: typeof o.unreadCount === "number" ? o.unreadCount : 0,
    lastMessage: o.lastMessage || "",
    lastMessageAt: o.lastMessageAt ? o.lastMessageAt.toISOString() : null,
    preview: o.lastMessage || (o.messages && o.messages[0] && o.messages[0].text) || "",
    updatedAt: o.updatedAt ? o.updatedAt.toISOString() : null,
    createdAt: o.createdAt ? o.createdAt.toISOString() : null,
  };
}

function toMessage(m) {
  return {
    id: String(m._id),
    conversationId: undefined,
    senderType: m.senderType,
    senderName: m.senderName || "",
    senderEmail: m.senderEmail || "",
    text: m.text,
    isRead: !!m.isRead,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
  };
}

function toDetail(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const id = String(o._id);
  return {
    id,
    customerName: o.customerName,
    customerEmail: o.customerEmail || "",
    subject: o.subject,
    status: o.status,
    unreadCount: typeof o.unreadCount === "number" ? o.unreadCount : 0,
    lastMessage: o.lastMessage || "",
    lastMessageAt: o.lastMessageAt ? o.lastMessageAt.toISOString() : null,
    createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    updatedAt: o.updatedAt ? o.updatedAt.toISOString() : null,
    messages: (o.messages || []).map((m) => ({
      ...toMessage(m),
      conversationId: id,
    })),
  };
}

/**
 * GET /api/inbox
 */
const listInbox = async (req, res) => {
  const uid = userIdFromReq(req);
  console.log("[INBOX GET LIST] user:", String(uid), "query:", req.query);
  const v = validationResult(req);
  if (!v.isEmpty()) {
    console.warn("[INBOX GET LIST] validation errors:", v.array());
    return res.status(400).json({ success: false, errors: v.array() });
  }
  try {
    const search = (req.query.search || "").trim();
    const filter = { owner: uid };

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { customerName: rx },
        { customerEmail: rx },
        { subject: rx },
        { lastMessage: rx },
      ];
    }

    const docs = await InboxConversation.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 }).exec();
    console.log("[INBOX GET LIST] Mongo success, count:", docs.length);
    res.json({
      success: true,
      data: docs.map(toListItem),
    });
  } catch (error) {
    console.error("[INBOX GET LIST] Mongo failure:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || "Failed to load inbox" });
  }
};

/**
 * GET /api/inbox/:id
 */
const getInboxById = async (req, res) => {
  const uid = userIdFromReq(req);
  const convId = req.params.id;
  console.log("[INBOX GET ONE] user:", String(uid), "conversation:", convId);
  if (!mongoose.Types.ObjectId.isValid(convId)) {
    console.warn("[INBOX GET ONE] invalid id:", convId);
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }
  try {
    const doc = await InboxConversation.findOne({ _id: convId, owner: uid }).exec();
    if (!doc) {
      console.warn("[INBOX GET ONE] not found:", convId);
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    console.log("[INBOX GET ONE] Mongo success, messages:", (doc.messages || []).length);
    res.json({ success: true, data: toDetail(doc) });
  } catch (error) {
    console.error("[INBOX GET ONE] Mongo failure:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || "Failed to load conversation" });
  }
};

/**
 * POST /api/inbox — new conversation + first message
 */
const createInbox = async (req, res) => {
  const uid = userIdFromReq(req);
  console.log("[INBOX POST CREATE] user:", String(uid), "body keys:", Object.keys(req.body || {}));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("[INBOX POST CREATE] validation errors:", errors.array());
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      customerName,
      customerEmail = "",
      subject,
      text,
      senderName,
      senderEmail,
    } = req.body;

    const first = {
      senderType: "customer",
      senderName: (senderName || customerName || "").trim(),
      senderEmail: (senderEmail || customerEmail || "").trim(),
      text: String(text).trim(),
      isRead: false,
      createdAt: new Date(),
    };

    const doc = await InboxConversation.create({
      owner: uid,
      customerName: String(customerName).trim(),
      customerEmail: String(customerEmail || "").trim(),
      subject: String(subject).trim(),
      status: "open",
      lastMessage: first.text.slice(0, 500),
      lastMessageAt: first.createdAt,
      messages: [first],
    });
    doc.syncUnreadFromMessages();
    await doc.save();
    console.log("[INBOX POST CREATE] conversation saved to MongoDB id:", String(doc._id));
    res.status(201).json({ success: true, data: toDetail(doc) });
  } catch (error) {
    console.error("[INBOX POST CREATE] Mongo save failure:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || "Failed to create conversation" });
  }
};

/**
 * POST /api/inbox/:id/messages
 */
const appendMessage = async (req, res) => {
  const uid = userIdFromReq(req);
  const convId = req.params.id;
  console.log("[INBOX POST MESSAGE] user:", String(uid), "conversation:", convId);
  if (!mongoose.Types.ObjectId.isValid(convId)) {
    console.warn("[INBOX POST MESSAGE] invalid id:", convId);
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("[INBOX POST MESSAGE] validation errors:", errors.array());
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const doc = await InboxConversation.findOne({ _id: convId, owner: uid }).exec();
    if (!doc) {
      console.warn("[INBOX POST MESSAGE] not found:", convId);
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const { text, senderType, senderName, senderEmail } = req.body;
    const now = new Date();
    const isAdmin = senderType === "admin";

    const msg = {
      senderType: isAdmin ? "admin" : "customer",
      senderName: String(senderName || "").trim(),
      senderEmail: String(senderEmail || "").trim(),
      text: String(text).trim(),
      isRead: isAdmin,
      createdAt: now,
    };

    if (isAdmin && req.user) {
      if (!msg.senderName) msg.senderName = req.user.name || "Admin";
      if (!msg.senderEmail) msg.senderEmail = req.user.email || "";
    }

    doc.messages.push(msg);
    doc.lastMessage = msg.text.slice(0, 500);
    doc.lastMessageAt = now;
    doc.syncUnreadFromMessages();
    await doc.save();
    console.log("[INBOX POST MESSAGE] Mongo save success, total messages:", doc.messages.length);
    res.status(201).json({ success: true, data: toDetail(doc) });
  } catch (error) {
    console.error("[INBOX POST MESSAGE] Mongo failure:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || "Failed to send message" });
  }
};

/**
 * PATCH /api/inbox/:id/read
 */
const markRead = async (req, res) => {
  const uid = userIdFromReq(req);
  const convId = req.params.id;
  console.log("[INBOX PATCH READ] user:", String(uid), "conversation:", convId);
  if (!mongoose.Types.ObjectId.isValid(convId)) {
    console.warn("[INBOX PATCH READ] invalid id:", convId);
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }
  try {
    const doc = await InboxConversation.findOne({ _id: convId, owner: uid }).exec();
    if (!doc) {
      console.warn("[INBOX PATCH READ] not found:", convId);
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    (doc.messages || []).forEach((m) => {
      if (m.senderType === "customer") m.isRead = true;
    });
    doc.syncUnreadFromMessages();
    await doc.save();
    console.log("[INBOX PATCH READ] Mongo save success, unreadCount:", doc.unreadCount);
    res.json({ success: true, data: toListItem(doc) });
  } catch (error) {
    console.error("[INBOX PATCH READ] Mongo failure:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || "Failed to mark read" });
  }
};

/**
 * PATCH /api/inbox/:id/status
 */
const updateStatus = async (req, res) => {
  const uid = userIdFromReq(req);
  const convId = req.params.id;
  console.log("[INBOX PATCH STATUS] user:", String(uid), "conversation:", convId, "body:", req.body);
  if (!mongoose.Types.ObjectId.isValid(convId)) {
    console.warn("[INBOX PATCH STATUS] invalid id:", convId);
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("[INBOX PATCH STATUS] validation errors:", errors.array());
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const doc = await InboxConversation.findOne({ _id: convId, owner: uid }).exec();
    if (!doc) {
      console.warn("[INBOX PATCH STATUS] not found:", convId);
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    doc.status = req.body.status;
    await doc.save();
    console.log("[INBOX PATCH STATUS] Mongo save success, status:", doc.status);
    res.json({ success: true, data: toListItem(doc) });
  } catch (error) {
    console.error("[INBOX PATCH STATUS] Mongo failure:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || "Failed to update status" });
  }
};

module.exports = {
  listInbox,
  getInboxById,
  createInbox,
  appendMessage,
  markRead,
  updateStatus,
};
