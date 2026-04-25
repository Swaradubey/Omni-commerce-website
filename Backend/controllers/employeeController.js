const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Client = require("../models/Client");
const { resolveStaffClientId, canAccessStaffRecord } = require("../utils/staffAccess");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_MANAGED_ROLES = new Set(["employee", "staff", "seo_manager", "store_manager", "inventory_manager", "counter_manager"]);
const EMPLOYEE_MANAGED_ROLES_ARRAY = ["employee", "staff", "seo_manager", "store_manager", "inventory_manager", "counter_manager"];

function normalizeEmployeeRole(rawRole) {
  const normalized = String(rawRole || "employee")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return EMPLOYEE_MANAGED_ROLES.has(normalized) ? normalized : null;
}

function roleToLegacyVariants(role) {
  if (role === "seo_manager") return ["seo_manager", "seo manager"];
  return [role];
}

function buildRoleQueryFilter(roles) {
  const expanded = Array.from(
    new Set(
      roles
        .flatMap((r) => roleToLegacyVariants(r))
        .map((r) => String(r || "").trim())
        .filter(Boolean)
    )
  );

  // Backward-compatible role matching for legacy stored values
  return { $in: expanded };
}

function isValidObjectId(id) {
  return id != null && mongoose.isValidObjectId(String(id));
}

async function loadClientShopName(clientId) {
  const c = await Client.findById(clientId).select("shopName companyName").lean();
  if (!c) return "";
  return String(c.shopName || c.companyName || "").trim();
}

async function resolveAdminFallbackClientId(user) {
  if (!user || String(user.role || "").toLowerCase() !== "admin") {
    return null;
  }
  if (user.clientId) {
    return String(user.clientId);
  }

  // If this admin has already created any staff rows, reuse that client scope.
  // This keeps Admin -> Employee creation working without requiring explicit clientId.
  const recentCreatedStaff = await Employee.findOne({
    createdBy: user._id,
    clientId: { $exists: true, $ne: null },
  })
    .select("clientId")
    .sort({ createdAt: -1 })
    .lean();
  if (recentCreatedStaff?.clientId) {
    return String(recentCreatedStaff.clientId);
  }

  const adminEmail = String(user.email || "").trim().toLowerCase();
  const adminUserId = user._id || null;

  // Infer an admin scope client only when there is exactly one clear candidate.
  const candidates = await Client.find({
    $or: [
      ...(adminUserId ? [{ userId: adminUserId }, { createdBy: adminUserId }] : []),
      ...(adminEmail ? [{ email: adminEmail }] : []),
    ],
  })
    .select("_id")
    .limit(2)
    .lean();

  if (candidates.length === 1) {
    return String(candidates[0]._id);
  }
  return null;
}

async function resolveManagerEmployeeId(clientOid, managerIdRaw) {
  if (!managerIdRaw) return { ok: true, managerId: null, managerUserId: null };
  const sm = await Employee.findOne({
    _id: managerIdRaw,
    clientId: clientOid,
    role: "store_manager",
  }).lean();
  if (!sm) {
    return { ok: false, message: "Invalid store manager for this client" };
  }
  return {
    ok: true,
    managerId: sm._id,
    managerUserId: sm.userId || null,
  };
}

// @route   POST /api/employees
const createEmployee = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const bodyClientId =
    req.body.clientId != null && String(req.body.clientId).trim() !== ""
      ? String(req.body.clientId).trim()
      : null;
  const inferredAdminClientId = await resolveAdminFallbackClientId(req.user);
  const effectiveClientId = bodyClientId || req.user?.clientId || inferredAdminClientId;
  const ctx = resolveStaffClientId(req, effectiveClientId, null);
  if (!ctx.ok) {
    return res.status(ctx.code).json({ success: false, message: ctx.message });
  }

  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const phone = String(req.body.phone ?? "").trim();
  const address = String(req.body.address ?? "").trim();
  const password = String(req.body.password ?? "").trim();
  const shopNameBody = String(req.body.shopName ?? "").trim();
  const managerIdRaw = req.body.managerId || null;
  const targetRole = normalizeEmployeeRole(req.body.role);

  console.log("[Employees] createEmployee request:", {
    byUserId: req.user?._id,
    byRole: req.user?.role,
    requestedRole: req.body.role,
    normalizedRole: targetRole,
    hasClientIdInBody: Boolean(req.body.clientId),
    bodyKeys: Object.keys(req.body || {}),
  });

  if (!targetRole) {
    return res.status(400).json({
      success: false,
      message: "Role must be one of: employee, staff, seo_manager, store_manager, inventory_manager, counter_manager",
    });
  }

  // Role-based creation permissions
  const EMPLOYEE_CREATABLE = new Set(["seo_manager", "store_manager", "inventory_manager", "counter_manager"]);
  const CLIENT_CREATABLE   = new Set(["employee", "staff", "seo_manager", "store_manager", "inventory_manager", "counter_manager"]);
  if (req.user.role === "employee") {
    if (!EMPLOYEE_CREATABLE.has(targetRole)) {
      return res.status(403).json({
        success: false,
        message: "Employee accounts can only create: SEO Manager, Store Manager, Inventory Manager",
      });
    }
  } else if (req.user.role === "client") {
    if (!CLIENT_CREATABLE.has(targetRole)) {
      return res.status(403).json({
        success: false,
        message: "Client accounts can only create: employee, staff, seo_manager, store_manager, inventory_manager",
      });
    }
  } else if (req.user.role === "admin") {
    if (!CLIENT_CREATABLE.has(targetRole)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts can only create: employee, staff, seo_manager, store_manager, inventory_manager, counter_manager",
      });
    }
  } else if (req.user.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address" });
  }
  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  const clientOid = new mongoose.Types.ObjectId(ctx.clientId);
  const clientExists = await Client.exists({ _id: clientOid });
  if (!clientExists) {
    return res.status(404).json({ success: false, message: "Client not found" });
  }
  const shopFromClient = await loadClientShopName(clientOid);
  const shopName = shopNameBody || shopFromClient;

  const mgr = await resolveManagerEmployeeId(clientOid, managerIdRaw);
  if (!mgr.ok) {
    return res.status(400).json({ success: false, message: mgr.message });
  }

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

    const userPayload = {
      name,
      email,
      password,
      role: targetRole,
      clientId: clientOid,
    };
    if (mgr.managerUserId) {
      userPayload.managerId = mgr.managerUserId;
    }
    const user = await User.create(userPayload);
    createdUserId = user._id;
    const userId = user._id;

    const doc = await Employee.create({
      name,
      email,
      phone,
      address,
      role: targetRole,
      clientId: clientOid,
      managerId: mgr.managerId || undefined,
      shopName,
      status: "active",
      createdBy: req.user._id,
      createdByRole: req.user.role,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: `${targetRole.replace(/_/g, " ")} created successfully`,
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
    console.error("[Employees] createEmployee failed:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    });
    console.error("[Employees] createEmployee stack:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   GET /api/employees
const listEmployees = async (req, res) => {
  try {
    const q = {};
    let parsedRoles = [];
    const rolesRaw = String(req.query.roles || "").trim();
    if (rolesRaw) {
      parsedRoles = rolesRaw
        .split(",")
        .map((r) => normalizeEmployeeRole(r))
        .filter(Boolean);
      q.role = parsedRoles.length > 0 ? buildRoleQueryFilter(parsedRoles) : "employee";
    } else {
      q.role = "employee";
    }
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
    } else if (req.user.role === "employee") {
      // Employees can list only the subordinate roles they manage, within their client scope
      if (!req.user.clientId) {
        return res.status(403).json({
          success: false,
          message: "Employee client profile is not linked to this account",
        });
      }
      q.clientId = req.user.clientId;
      if (!rolesRaw) {
        // Default: show only the roles employee can create
        q.role = buildRoleQueryFilter(["seo_manager", "store_manager", "inventory_manager"]);
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const pageRaw = Number.parseInt(String(req.query.page || ""), 10);
    const limitRaw = Number.parseInt(String(req.query.limit || ""), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : null;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : null;

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [list, total] = await Promise.all([
        Employee.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Employee.countDocuments(q),
      ]);

      return res.json({
        success: true,
        data: list,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const list = await Employee.find(q).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error("[Employees] listEmployees:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   GET /api/employees/client/:clientId
const getEmployeesByClientId = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.clientId)) {
      return res.status(400).json({ success: false, message: "Invalid client id" });
    }
    const ctx = resolveStaffClientId(req, null, req.params.clientId);
    if (!ctx.ok) {
      return res.status(ctx.code).json({ success: false, message: ctx.message });
    }

    const rolesRaw = String(req.query.roles || "").trim();
    const parsedRoles = rolesRaw
      .split(",")
      .map((r) => normalizeEmployeeRole(r))
      .filter(Boolean);
    const roleFilter = buildRoleQueryFilter(
      parsedRoles.length > 0 ? parsedRoles : EMPLOYEE_MANAGED_ROLES_ARRAY
    );

    const pageRaw = Number.parseInt(String(req.query.page || ""), 10);
    const limitRaw = Number.parseInt(String(req.query.limit || ""), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : null;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : null;

    const baseQuery = {
      clientId: ctx.clientId,
      role: roleFilter,
    };

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [list, total] = await Promise.all([
        Employee.find(baseQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Employee.countDocuments(baseQuery),
      ]);

      return res.json({
        success: true,
        data: list,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const list = await Employee.find(baseQuery)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: list });
  } catch (error) {
    console.error("[Employees] getEmployeesByClientId:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   GET /api/employees/:id
const getEmployeeById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }
    const doc = await Employee.findOne({
      _id: req.params.id,
      role: "employee",
    }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    if (!canAccessStaffRecord(req, doc.clientId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error("[Employees] getEmployeeById:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }
    const doc = await Employee.findOne({
      _id: req.params.id,
      role: "employee",
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Employee not found" });
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

    if (req.body.managerId !== undefined) {
      const rawMgr = req.body.managerId;
      const cleared =
        rawMgr === null ||
        rawMgr === "" ||
        (typeof rawMgr === "string" && !String(rawMgr).trim());
      if (cleared) {
        doc.managerId = null;
        if (doc.userId) {
          const u = await User.findById(doc.userId);
          if (u) {
            u.managerId = null;
            await u.save();
          }
        }
      } else {
        const mgr = await resolveManagerEmployeeId(doc.clientId, rawMgr);
        if (!mgr.ok) {
          return res.status(400).json({ success: false, message: mgr.message });
        }
        doc.managerId = mgr.managerId || null;
        if (doc.userId) {
          const u = await User.findById(doc.userId);
          if (u) {
            u.managerId = mgr.managerUserId || null;
            await u.save();
          }
        }
      }
    }

    Object.assign(doc, patch);
    await doc.save();

    if (doc.userId && patch.name) {
      const u = await User.findById(doc.userId);
      if (u) {
        u.name = doc.name;
        await u.save();
      }
    }

    return res.json({
      success: true,
      message: "Employee updated",
      data: doc,
    });
  } catch (error) {
    console.error("[Employees] updateEmployee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }
    const doc = await Employee.findOne({
      _id: req.params.id,
      role: "employee",
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    if (!canAccessStaffRecord(req, doc.clientId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const uid = doc.userId;
    await Employee.deleteOne({ _id: doc._id });
    if (uid) {
      await User.findByIdAndDelete(uid);
    }

    return res.json({ success: true, message: "Employee removed" });
  } catch (error) {
    console.error("[Employees] deleteEmployee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

module.exports = {
  createEmployee,
  listEmployees,
  getEmployeesByClientId,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
