const mongoose = require("mongoose");

const inboxMessageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
    },
    senderName: { type: String, trim: true, default: "" },
    senderEmail: { type: String, trim: true, default: "" },
    text: { type: String, required: true, trim: true, maxlength: 50000 },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const inboxConversationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true, default: "" },
    subject: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["open", "closed", "pending"],
      default: "open",
    },
    unreadCount: { type: Number, default: 0 },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date },
    messages: [inboxMessageSchema],
  },
  { timestamps: true }
);

inboxConversationSchema.index({ owner: 1, lastMessageAt: -1 });

function recomputeUnread(messages) {
  if (!Array.isArray(messages)) return 0;
  return messages.filter((m) => m.senderType === "customer" && !m.isRead).length;
}

inboxConversationSchema.methods.syncUnreadFromMessages = function syncUnreadFromMessages() {
  this.unreadCount = recomputeUnread(this.messages);
  return this.unreadCount;
};

module.exports = mongoose.model("InboxConversation", inboxConversationSchema);
