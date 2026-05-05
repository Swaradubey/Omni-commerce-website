const CustomDomain = require("../models/CustomDomain");
const mongoose = require("mongoose");

/**
 * Validates if a string is a valid MongoDB ObjectId.
 * @param {string} id 
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  if (id === null || id === undefined) return false;
  const s = String(id).trim();
  if (!s || s === "null" || s === "undefined" || s === "all" || s === "super_admin" || s === "admin") return false;
  return mongoose.Types.ObjectId.isValid(s);
};

/**
 * Normalizes a domain name by removing protocol, www., and trailing slashes.
 * @param {string} domain
 * @returns {string}
 */
function normalizeDomain(domain) {
  if (!domain) return "";
  let normalized = domain.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/\/$/, "");
  normalized = normalized.replace(/^www\./, "");
  // Remove port if present
  normalized = normalized.split(":")[0];
  return normalized;
}

/**
 * Resolves the clientId from various request sources with strict priority.
 * 
 * Priority:
 *  1. req.user.clientId
 *  2. req.user.assignedClient
 *  3. req.body.clientId / req.query.clientId (If Super Admin/Admin explicitly selects)
 *  4. req.headers["x-client-id"]
 *  5. Domain/custom-domain mapping
 *  6. fallback to null
 *
 * @param {import("express").Request} req
 * @returns {Promise<string|null>}
 */
async function resolveClientId(req) {
  const route = req.originalUrl || req.url;
  
  // ── Decode JWT to get user info if req.user is not yet populated ──
  let user = req.user;
  if (!user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const jwt = require("jsonwebtoken");
        user = jwt.decode(token);
      } catch (e) {
        // Decode failed
      }
    }
  }

  // Priority 1 & 2: User-specific client assignment
  const uClientId = user?.clientId || user?.assignedClient;
  if (isValidObjectId(uClientId)) {
    return String(uClientId);
  }

  // Priority 3: Body or Query (Super Admin/Admin selection)
  const queryId = req.query?.clientId || req.body?.clientId;
  if (isValidObjectId(queryId)) {
    return String(queryId);
  }

  // Priority 4: Explicit header
  const headerId = req.headers["x-client-id"];
  if (isValidObjectId(headerId)) {
    return String(headerId);
  }

  // Priority 5: Domain-based lookup
  // SKIP domain lookup for privileged roles if they haven't been assigned a specific client yet.
  // This ensures Global Admins see the same data (everything) on custom domains as they do on Vercel/Localhost.
  const role = user?.role;
  const isPrivileged = role === "super_admin" || role === "admin" || role === "superadmin";

  if (isPrivileged) {
    console.log(`[TenantResolver] Skipping domain resolution for privileged role: ${role}`);
    return null;
  }

  const xClientOrigin = req.headers["x-client-origin"] || "";
  const xClientDomain = req.headers["x-client-domain"] || "";
  const originHeader  = req.headers.origin || req.headers.referer || "";
  const hostHeader    = req.headers["x-forwarded-host"] || req.headers.host || "";

  const rawCandidates = [];
  if (xClientOrigin) {
    try { rawCandidates.push(new URL(xClientOrigin).hostname); } catch { rawCandidates.push(xClientOrigin); }
  }
  if (xClientDomain) rawCandidates.push(xClientDomain);
  if (originHeader) {
    try { rawCandidates.push(new URL(originHeader).hostname); } catch { rawCandidates.push(originHeader); }
  }
  if (hostHeader) rawCandidates.push(hostHeader.split(":")[0]);

  const isSystemDomain = (d) =>
    !d || d === "localhost" || d.endsWith(".vercel.app") || d.endsWith(".onrender.com") || d.endsWith(".render.com");

  const seen = new Set();
  const candidates = [];
  for (const raw of rawCandidates) {
    const normalized = normalizeDomain(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      candidates.push(normalized);
    }
  }

  for (const normalized of candidates) {
    if (isSystemDomain(normalized)) continue;

    try {
      const domainDoc = await CustomDomain.findOne({
        $or: [
          { domainName: normalized },
          { domainName: `www.${normalized}` },
          { domain: normalized },
          { domain: `www.${normalized}` },
        ],
      }).select("clientId");

      if (domainDoc && domainDoc.clientId && isValidObjectId(domainDoc.clientId)) {
        return String(domainDoc.clientId);
      }
    } catch (err) {
      console.error(`[TenantResolver] Domain error: ${err.message}`);
    }
  }

  return null;
}

/**
 * Builds a shared product visibility filter based on user role and resolved client ID.
 * 
 * Logic:
 * - super_admin → {}
 * - admin → {}
 * - client → { clientId: resolvedClientId || user.clientId || user._id }
 * - user/customer → { clientId: resolvedClientId }
 * - public/custom domain → { clientId: mappedClientId }
 * 
 * @param {import("express").Request} req
 * @returns {Promise<Object>}
 */
async function buildProductVisibilityFilter(req) {
  const user = req.user;
  const resolvedClientId = await resolveClientId(req);
  const role = user?.role;

  // Debug logs
  console.log("Product API:", req.originalUrl);
  console.log("Role:", role);
  console.log("Resolved clientId:", resolvedClientId);

  if (role === "super_admin" || role === "super-admin" || role === "superadmin") {
    const filter = {};
    console.log("Product filter (Super Admin):", filter);
    return filter;
  }

  if (role === "admin") {
    const filter = {};
    console.log("Product filter (Admin):", filter);
    return filter;
  }

  if (role === "client") {
    const target = resolvedClientId || user.clientId || user._id;
    const filter = isValidObjectId(target) ? { clientId: String(target) } : {};
    console.log("Product filter:", filter);
    return filter;
  }

  // For users/customers and public storefront
  const filter = isValidObjectId(resolvedClientId) ? { clientId: String(resolvedClientId) } : {};
  console.log("Product filter:", filter);
  return filter;
}

/**
 * Builds a scoping query for multi-tenant isolation. (Legacy/General usage)
 */
function buildScopeQuery(user, resolvedClientId) {
  // 1. Public visitor / Guest checkout: Scope to domain clientId if present
  if (!user) {
    return isValidObjectId(resolvedClientId) ? { clientId: String(resolvedClientId) } : {};
  }
  
  const role = String(user.role || "").toLowerCase();
  const isSuperAdmin = role === "super_admin" || role === "superadmin";
  const isAdmin = role === "admin";
  const isStaff = isAdmin || require("./clientScopedRoles").isClientScopedRole(user.role);

  // 2. Super Admin: Truly global unless we explicitly want to filter by a valid clientId
  if (isSuperAdmin) {
    return isValidObjectId(resolvedClientId) ? { clientId: String(resolvedClientId) } : {};
  }

  // 3. Admin: User wants admin to see customer orders without requiring clientId.
  // We'll treat them as global for now, but allow filtering if clientId is provided.
  if (isAdmin) {
    return isValidObjectId(resolvedClientId) ? { clientId: String(resolvedClientId) } : {};
  }

  // 4. Handle Customer / User (Non-staff)
  if (!isStaff || role === "user" || role === "customer") {
    // REQUIRE user-specific scoping for customers
    const uId = user._id || user.id;
    if (isValidObjectId(uId)) {
      return { user: new mongoose.Types.ObjectId(String(uId)) };
    }
    // Fallback if no user id (should not happen with protect)
    const targetClientId = resolvedClientId || user.clientId || user.linkedClientId;
    if (isValidObjectId(targetClientId)) {
      return { $or: [{ clientId: String(targetClientId) }, { clientId: null }, { clientId: { $exists: false } }] };
    }
    return { _id: null }; // Return nothing if we can't identify the user
  }

  // 5. Client / Staff / Vendor
  const orConditions = [];
  const uId = user._id || user.id;
  const sId = isValidObjectId(uId) ? String(uId) : null;

  if (isValidObjectId(resolvedClientId)) orConditions.push({ clientId: String(resolvedClientId) });
  if (isValidObjectId(user.clientId)) orConditions.push({ clientId: String(user.clientId) });
  if (isValidObjectId(user.linkedClientId)) orConditions.push({ clientId: String(user.linkedClientId) });

  if (sId) {
    orConditions.push({ clientId: sId });
    orConditions.push({ createdBy: sId });
  }

  orConditions.push({ clientId: null });
  orConditions.push({ clientId: { $exists: false } });

  const uniqueOr = Array.from(new Set(orConditions.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
  return uniqueOr.length > 0 ? { $or: uniqueOr } : {};
}

/**
 * Applies the scopeQuery to an existing MongoDB match object.
 */
function applyScope(match, scopeQuery) {
  if (!scopeQuery || Object.keys(scopeQuery).length === 0) return match;
  if (match.$or && scopeQuery.$or) {
    match.$and = [{ $or: match.$or }, scopeQuery];
    delete match.$or;
  } else {
    Object.assign(match, scopeQuery);
  }
  return match;
}

module.exports = {
  resolveClientId,
  normalizeDomain,
  buildScopeQuery,
  applyScope,
  buildProductVisibilityFilter,
  isValidObjectId,
};

