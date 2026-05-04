const mongoose = require("mongoose");
const User = require("../models/User");
const { SUPER_ADMIN_EMAIL } = require("../utils/authConstants");
const { ensureRoleProfilesForUser } = require("../utils/ensureRoleProfiles");

/** Roles Super Admin may assign (never `super_admin` via API — use seeded account only). */
const ASSIGNABLE_ROLES = [
  "user",
  "customer",
  "admin",
  "staff",
  "cashier",
  "inventory_manager",
  "seo_manager",
  "client",
  "store_manager",
  "employee",
];

const getMe = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user._id).select("-password");
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    await ensureRoleProfilesForUser(userDoc);
    const user = await User.findById(req.user._id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const data = { ...user };
    if (req.tokenPayload?.impersonatedBy) {
      const sa = await User.findById(req.tokenPayload.impersonatedBy).select("name email").lean();
      data.impersonation = {
        active: true,
        superAdminId: String(req.tokenPayload.impersonatedBy),
        superAdminName: sa?.name || "Super Admin",
        superAdminEmail: sa?.email || "",
      };
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMe = async (req, res) => {
  try {
    const { name, username, country, bio } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      user.name = trimmed;
    }
    if (username !== undefined) {
      user.username = String(username).trim();
    }
    if (country !== undefined) {
      user.country = String(country).trim();
    }
    if (bio !== undefined) {
      user.bio = String(bio).trim();
    }

    await user.save();
    const fresh = await User.findById(user._id).select("-password");
    res.json({
      success: true,
      message: "Profile updated",
      data: fresh,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/users  (alias)  |  GET /api/users/platform/list
// @access  Super Admin
const listPlatformUsers = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const clientId = req.user?.clientId || req.clientId;

    // Requirement 10 & 16: Log data retrieval details
    console.log(`[UserController] listPlatformUsers - Page: Users & roles, Role: ${req.user?.role}, ClientId: ${clientId || "global"}`);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || "").trim();
    const roleFilter = req.query.role ? String(req.query.role).trim() : "";

    const q = {};
    if (!isSuperAdmin && clientId) {
      q.clientId = clientId;
    }

    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      q.$or = [{ name: new RegExp(esc, "i") }, { email: new RegExp(esc, "i") }];
    }
    if (roleFilter) {
      q.role = roleFilter;
    }

    // Requirement 16: Log DB query details
    console.log(`[UserController] DB Query - Collection: users, Filter: ${JSON.stringify(q)}`);

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(q).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(q),
    ]);

    res.json({
      success: true,
      data: {
        users,
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[UserController] listPlatformUsers error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PATCH /api/users/platform/:id/role
// @access  Super Admin  (MongoDB User collection; preserves other fields)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!role || typeof role !== "string") {
      return res.status(400).json({ success: false, message: "Role is required" });
    }
    const nextRole = role.trim();
    if (!ASSIGNABLE_ROLES.includes(nextRole)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
      });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const clientId = req.user?.clientId || req.clientId;

    if (!isSuperAdmin && clientId && String(target.clientId) !== String(clientId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only manage your own staff.",
      });
    }

    if (target.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Super Admin accounts cannot be reassigned via API",
      });
    }

    if (target.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim()) {
      return res.status(403).json({
        success: false,
        message: "The seeded Super Admin account cannot be reassigned via API",
      });
    }

    target.role = nextRole;
    try {
      await target.save();
    } catch (saveErr) {
      if (saveErr.name === "ValidationError" && saveErr.errors?.role) {
        return res.status(400).json({
          success: false,
          message: saveErr.errors.role.message || "Invalid role for user model",
        });
      }
      throw saveErr;
    }
    await ensureRoleProfilesForUser(target);
    const fresh = await User.findById(target._id).select("-password").lean();
    res.json({ success: true, message: "Role updated", data: fresh });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMe, updateMe, listPlatformUsers, updateUserRole };
