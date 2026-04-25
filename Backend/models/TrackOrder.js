const mongoose = require("mongoose");

const trackOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.Mixed, // String or ObjectId reference
      required: false,
    },
    trackingId: {
      type: String,
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    userName: {
      type: String,
      required: false,
    },
    userEmail: {
      type: String,
      required: false,
    },
    source: {
      type: String,
      required: true,
      default: "track-page",
    },
    statusAtTimeOfTracking: {
      type: String,
      required: false,
    },
    orderStatusTimeline: {
      type: mongoose.Schema.Types.Mixed, // Snapshot of the timeline array
      required: false,
    },
    orderDetails: {
      type: mongoose.Schema.Types.Mixed, // Snapshot: total, items count, payment method, etc.
      required: false,
    },
    searchedValue: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    trackedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "trackorders",
  }
);

module.exports = mongoose.model("TrackOrder", trackOrderSchema);
