const { validationResult } = require("express-validator");
const Client = require("../models/Client");
const User = require("../models/User");

function normalizeGst(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizePan(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// @desc    Create client (company) record + linked login user
// @route   POST /api/clients
// @access  Private / super_admin
const createClient = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const companyName = String(req.body.companyName).trim();
  const gstNorm = normalizeGst(req.body.gst);
  const phone = String(req.body.phone).trim();
  const email = String(req.body.email).trim().toLowerCase();
  const panNorm = normalizePan(req.body.panNo);
  const permanentAddress = String(req.body.permanentAddress).trim();
  const shopName = String(req.body.shopName).trim();
  const password = String(req.body.password);

  if (!GSTIN_RE.test(gstNorm)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid 15-character GSTIN",
    });
  }
  if (!PAN_RE.test(panNorm)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid PAN (e.g. ABCDE1234F)",
    });
  }

  let createdClientId = null;
  let createdUserId = null;
  try {
    const [emailTakenClient, gstTaken, panTaken, userExists] = await Promise.all([
      Client.findOne({ email }),
      Client.findOne({ gst: gstNorm }),
      Client.findOne({ panNo: panNorm }),
      User.findOne({ email }),
    ]);
    if (emailTakenClient) {
      return res.status(400).json({
        success: false,
        message: "A client with this email already exists",
      });
    }
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "A user account with this email already exists. Use a different email for the client login.",
      });
    }
    if (gstTaken) {
      return res.status(400).json({
        success: false,
        message: "A client with this GST number already exists",
      });
    }
    if (panTaken) {
      return res.status(400).json({
        success: false,
        message: "A client with this PAN already exists",
      });
    }

    const client = await Client.create({
      companyName,
      gst: gstNorm,
      phone,
      email,
      panNo: panNorm,
      permanentAddress,
      shopName,
      createdBy: req.user._id,
    });
    createdClientId = client._id;

    const user = await User.create({
      name: shopName || companyName,
      email,
      password,
      role: "client",
      clientId: client._id,
    });
    createdUserId = user._id;

    client.userId = user._id;
    await client.save();

    const populated = await Client.findById(client._id)
      .populate("createdBy", "name email")
      .populate("userId", "name email role clientId");

    return res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: populated,
    });
  } catch (error) {
    if (createdUserId) {
      await User.findByIdAndDelete(createdUserId);
    }
    if (createdClientId) {
      await Client.findByIdAndDelete(createdClientId);
    }
    if (error && error.code === 11000) {
      const kp = error.keyPattern || {};
      let field = "field";
      if (kp.email) field = "email";
      else if (kp.gst) field = "GST";
      else if (kp.panNo) field = "PAN";
      return res.status(400).json({
        success: false,
        message: `A client with this ${field} already exists`,
      });
    }
    console.error("[Client] createClient:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// @desc    List clients
// @route   GET /api/clients
// @access  Private / super_admin
const listClients = async (req, res) => {
  try {
    const clients = await Client.find({})
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("userId", "name email role")
      .lean();

    return res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("[Client] listClients:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private / super_admin
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    if (client.userId) {
      await User.findByIdAndDelete(client.userId);
    }

    await Client.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    console.error("[Client] deleteClient:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

module.exports = { createClient, listClients, deleteClient };
