const mongoose = require("mongoose");

const customDomainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: [true, "Domain is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CustomDomain", customDomainSchema);
