const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Client = require("../models/Client");
const { resolveStaffClientId, canAccessStaffRecord } = require("../utils/staffAccess");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadClientShopName(clientId) {
  const c = await Client.findById(clientId).select("shopName companyName").lean();
  if (!c) return "";
  return String(c.shopName || c.companyName || "").trim();
}

// @route   POST /api/store-managers
const createStoreManager = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const ctx = resolveStaffClientId(req, req.body.clientId, null);
  if (!ctx.ok) {
    return res.status(ctx.code).json({ success: false, message: ctx.message });
  }

  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const phone = String(req.body.phone ?? "").trim();
  const address = String(req.body.address ?? "").trim();
  const password = String(req.body.password ?? "");
  const shopNameBody = String(req.body.shopName ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  const clientOid = new mongoose.Types.ObjectId(ctx.clientId);
  const shopFromClient = await loadClientShopName(clientOid);
  const shopName = shopNameBody || shopFromClient;

  let createdUserId = null;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user account with this email already exists",
      });
    }

    const dupStaff = await Employee.findOne({ email });
    if (dupStaff) {
      return res.status(400).json({
        success: false,
        message: "This email is already used for a staff record",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "store_manager",
      clientId: clientOid,
    });
    createdUserId = user._id;

    const doc = await Employee.create({
      name,
      email,
      phone,
      address,
      role: "store_manager",
      clientId: clientOid,
      shopName,
      status: "active",
      createdBy: req.user._id,
      userId: user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Store manager created successfully",
      data: doc,
    });
  } catch (error) {
    if (createdUserId) {
      await User.findByIdAndDelete(createdUserId);
    }
    if (error && error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate email — use a different email address",
      });
    }
    console.error("[StoreManagers] createStoreManager:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   GET /api/store-managers
const listStoreManagers = async (req, res) => {
  try {
    const q = { role: "store_manager" };
    if (req.user.role === "client") {
      if (!req.user.clientId) {
        return res.status(403).json({
          success: false,
          message: "Client profile is not linked to this account",
        });
      }
      q.clientId = req.user.clientId;
    } else if (req.user.role === "super_admin") {
      if (req.query.clientId) {
        q.clientId = req.query.clientId;
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const list = await Employee.find(q).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error("[StoreManagers] listStoreManagers:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   GET /api/store-managers/client/:clientId
const getStoreManagersByClient = async (req, res) => {
  try {
    const ctx = resolveStaffClientId(req, null, req.params.clientId);
    if (!ctx.ok) {
      return res.status(ctx.code).json({ success: false, message: ctx.message });
    }

    const list = await Employee.find({
      clientId: ctx.clientId,
      role: "store_manager",
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: list });
  } catch (error) {
    console.error("[StoreManagers] getStoreManagersByClient:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   GET /api/store-managers/:id
const getStoreManagerById = async (req, res) => {
  try {
    const doc = await Employee.findOne({
      _id: req.params.id,
      role: "store_manager",
    }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Store manager not found" });
    }
    if (!canAccessStaffRecord(req, doc.clientId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error("[StoreManagers] getStoreManagerById:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   PUT /api/store-managers/:id
const updateStoreManager = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const doc = await Employee.findOne({
      _id: req.params.id,
      role: "store_manager",
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Store manager not found" });
    }
    if (!canAccessStaffRecord(req, doc.clientId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const patch = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body.phone !== undefined) patch.phone = String(req.body.phone).trim();
    if (req.body.address !== undefined) patch.address = String(req.body.address).trim();
    if (req.body.shopName !== undefined) patch.shopName = String(req.body.shopName).trim();
    if (req.body.status !== undefined) patch.status = req.body.status;

    Object.assign(doc, patch);
    await doc.save();

    if (doc.userId && (patch.name || patch.phone)) {
      const u = await User.findById(doc.userId);
      if (u) {
        if (patch.name) u.name = doc.name;
        await u.save();
      }
    }

    return res.json({
      success: true,
      message: "Store manager updated",
      data: doc,
    });
  } catch (error) {
    console.error("[StoreManagers] updateStoreManager:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   DELETE /api/store-managers/:id
const deleteStoreManager = async (req, res) => {
  try {
    const doc = await Employee.findOne({
      _id: req.params.id,
      role: "store_manager",
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Store manager not found" });
    }
    if (!canAccessStaffRecord(req, doc.clientId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const uid = doc.userId;
    await Employee.deleteOne({ _id: doc._id });
    if (uid) {
      await User.findByIdAndDelete(uid);
    }

    return res.json({ success: true, message: "Store manager removed" });
  } catch (error) {
    console.error("[StoreManagers] deleteStoreManager:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

module.exports = {
  createStoreManager,
  listStoreManagers,
  getStoreManagersByClient,
  getStoreManagerById,
  updateStoreManager,
  deleteStoreManager,
};
