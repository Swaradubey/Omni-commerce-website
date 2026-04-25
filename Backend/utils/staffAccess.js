/**
 * Resolves target clientId for store manager / employee APIs.
 * super_admin must pass clientId (body or route param); client and employee use own clientId.
 */
function resolveStaffClientId(req, bodyClientId, paramClientId) {
  if (req.user.role === "super_admin") {
    const raw = bodyClientId ?? paramClientId;
    if (!raw) {
      return { ok: false, code: 400, message: "clientId is required for super admin staff operations" };
    }
    return { ok: true, clientId: String(raw) };
  }
  if (req.user.role === "admin") {
    if (req.user.clientId) {
      const own = String(req.user.clientId);
      if (paramClientId && String(paramClientId) !== own) {
        return {
          ok: false,
          code: 403,
          message: "You cannot manage staff for another client",
        };
      }
      if (bodyClientId && String(bodyClientId) !== own) {
        return {
          ok: false,
          code: 403,
          message: "You cannot manage staff for another client",
        };
      }
      return { ok: true, clientId: own };
    }
    const raw = bodyClientId ?? paramClientId;
    if (!raw) {
      return {
        ok: false,
        code: 400,
        message: "clientId is required when admin account is not linked to a client",
      };
    }
    return { ok: true, clientId: String(raw) };
  }
  if (req.user.role === "client") {
    if (!req.user.clientId) {
      return {
        ok: false,
        code: 403,
        message: "Client profile is not linked to this account",
      };
    }
    const own = String(req.user.clientId);
    if (paramClientId && String(paramClientId) !== own) {
      return {
        ok: false,
        code: 403,
        message: "You cannot manage staff for another client",
      };
    }
    if (bodyClientId && String(bodyClientId) !== own) {
      return {
        ok: false,
        code: 403,
        message: "You cannot manage staff for another client",
      };
    }
    return { ok: true, clientId: own };
  }
  // Employee role: auto-resolves to their own clientId scope (cannot cross-client)
  if (req.user.role === "employee") {
    if (!req.user.clientId) {
      return {
        ok: false,
        code: 403,
        message: "Employee client profile is not linked to this account",
      };
    }
    return { ok: true, clientId: String(req.user.clientId) };
  }
  return { ok: false, code: 403, message: "Access denied" };
}

function canAccessStaffRecord(req, docClientId) {
  if (req.user.role === "super_admin") return true;
  if (req.user.role === "admin") {
    if (!req.user.clientId) return true;
    return String(req.user.clientId) === String(docClientId);
  }
  if (req.user.role === "client" && req.user.clientId) {
    return String(req.user.clientId) === String(docClientId);
  }
  // Employee can access subordinate records within their own client scope
  if (req.user.role === "employee" && req.user.clientId) {
    return String(req.user.clientId) === String(docClientId);
  }
  return false;
}

module.exports = { resolveStaffClientId, canAccessStaffRecord };
