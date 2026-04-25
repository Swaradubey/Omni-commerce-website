const mongoose = require("mongoose");

function normalizeGst(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

const clientSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    gst: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    /** Optional for legacy documents; enforced on create via API validation. */
    panNo: { type: String, trim: true, default: "" },
    permanentAddress: { type: String, trim: true, default: "" },
    shopName: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    /** Login user linked to this client (set when Super Admin provisions access). */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

clientSchema.index({ email: 1 }, { unique: true });
clientSchema.index({ gst: 1 }, { unique: true });
clientSchema.index(
  { panNo: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { panNo: { $type: "string", $ne: "" } },
  }
);

function normalizePan(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

clientSchema.pre("save", function normalizeGstField(next) {
  if (this.isModified("gst") && this.gst) {
    this.gst = normalizeGst(this.gst);
  }
  if (this.isModified("panNo") && this.panNo) {
    this.panNo = normalizePan(this.panNo);
  }
  next();
});

module.exports = mongoose.model("Client", clientSchema);
