const mongoose = require("mongoose");
const User = require("../models/User");
const ImpersonationAuditLog = require("../models/ImpersonationAuditLog");
const generateToken = require("../utils/generateToken");

function resolveRequestMeta(req) {
  const xf = req.headers["x-forwarded-for"];
  const fromForwarded =
    typeof xf === "string" && xf.length ? xf.split(",")[0].trim() : null;
  const ipAddress = fromForwarded || req.ip || null;
  const userAgent = req.headers["user-agent"] || null;
  return { ipAddress, userAgent };
}

/** Roles Super Admin may open via impersonation JWT (target role in token). Never `super_admin`. */
const IMPERSONATABLE_ROLES = new Set([
  "admin",
  "user",
  "customer",
  "staff",
  "cashier",
  "inventory_manager",
  "seo_manager",
  "client",
  "store_manager",
  "employee",
]);

// @route   POST /api/superadmin/impersonate/:adminId
// @access  Super Admin only
const impersonateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ success: false, message: "Invalid admin id" });
    }

    const target = await User.findById(adminId).select("-password");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (target.role === "super_admin" || !IMPERSONATABLE_ROLES.has(target.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Impersonation is not allowed for this role. Use Open Super Admin from the directory when applicable.",
      });
    }
    if (!target.isActive) {
      return res.status(403).json({ success: false, message: "Target admin account is inactive" });
    }

    const superAdminId = req.user._id;
    if (String(target._id) === String(superAdminId)) {
      return res.status(400).json({ success: false, message: "Cannot impersonate your own account" });
    }

    const expiresIn = process.env.IMPERSONATION_JWT_EXPIRES || "8h";
    const token = generateToken(target._id, target.email, target.role, {
      impersonatedBy: superAdminId,
      expiresIn,
    });

    await ImpersonationAuditLog.create({
      superAdminId,
      targetAdminId: target._id,
      actionType: "impersonate_start",
      timestamp: new Date(),
    });

    const { ipAddress, userAgent } = resolveRequestMeta(req);
    console.log(
      `[Impersonation] start superAdmin=${superAdminId} admin=${target._id} ip=${ipAddress} ua=${userAgent ? "yes" : "no"}`
    );

    res.json({
      success: true,
      message: "Impersonation session started",
      data: {
        token,
        expiresIn,
        user: {
          _id: target._id,
          name: target.name,
          email: target.email,
          role: target.role,
          isAdmin: target.role === "admin" || target.role === "super_admin",
          isSuperAdmin: target.role === "super_admin",
        },
        impersonation: {
          active: true,
          superAdminId: String(superAdminId),
          superAdminName: req.user.name,
          superAdminEmail: req.user.email,
        },
      },
    });
  } catch (error) {
    console.error("[Superadmin] impersonateAdmin:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/superadmin/impersonate/stop
// @access  Valid impersonation JWT (admin session opened by Super Admin)
const stopImpersonation = async (req, res) => {
  try {
    const superAdminId = req.tokenPayload.impersonatedBy;
    const superAdmin = await User.findById(superAdminId).select("-password");

    if (!superAdmin || superAdmin.role !== "super_admin" || !superAdmin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Original Super Admin session is no longer valid",
      });
    }

    const targetAdminId = req.user._id;

    await ImpersonationAuditLog.create({
      superAdminId,
      targetAdminId,
      actionType: "impersonate_end",
      timestamp: new Date(),
    });

    const { ipAddress, userAgent } = resolveRequestMeta(req);
    console.log(
      `[Impersonation] end superAdmin=${superAdminId} admin=${targetAdminId} ip=${ipAddress} ua=${userAgent ? "yes" : "no"}`
    );

    const token = generateToken(superAdmin._id, superAdmin.email, "super_admin");

    res.json({
      success: true,
      message: "Returned to Super Admin session",
      data: {
        token,
        user: {
          _id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          role: "super_admin",
          isAdmin: true,
          isSuperAdmin: true,
        },
      },
    });
  } catch (error) {
    console.error("[Superadmin] stopImpersonation:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  impersonateAdmin,
  stopImpersonation,
};
