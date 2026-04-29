const mongoose = require("mongoose");

const customDomainSchema = new mongoose.Schema(
  {
    domainName: {
      type: String,
      required: [true, "Domain name is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client ID is required"],
    },
    clientName: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Error"],
      default: "Pending",
    },
    dnsInstructions: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CustomDomain", customDomainSchema);
