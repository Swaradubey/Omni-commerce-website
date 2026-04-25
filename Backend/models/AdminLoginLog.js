const mongoose = require("mongoose");

const adminLoginLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: "admin",
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
    },
    event: {
      type: String,
      default: "login",
    },
    message: {
      type: String,
      default: "Admin logged in successfully",
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    deviceInfo: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      default: null,
    },
    loginAt: {
      type: Date,
      default: Date.now,
    },
    loginDate: {
      type: String,
      default: null,
    },
    loginTime: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

adminLoginLogSchema.index({ email: 1 });
adminLoginLogSchema.index({ createdAt: -1 });
adminLoginLogSchema.index({ userId: 1, loginAt: -1 });

const AdminLoginLog = mongoose.model("AdminLoginLog", adminLoginLogSchema);

module.exports = AdminLoginLog;