const CustomDomain = require("../models/CustomDomain");

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
 * Resolves the clientId from various request sources.
 *
 * Resolution priority:
 *  1. Non-admin user with clientId
 *  2. x-client-id header (explicit client id sent by frontend)
 *  3. body / query clientId param
 *  4. Domain lookup — tries each candidate in this order:
 *       a. x-client-origin header  (window.location.origin from browser)
 *       b. x-client-domain header  (window.location.hostname from browser)
 *       c. origin / referer header
 *       d. x-forwarded-host / host header
 *
 * IMPORTANT: For API calls, req.headers.host is the Render backend host, NOT
 * the custom domain. The browser-sent x-client-origin / x-client-domain
 * headers reliably carry the real end-user domain (e.g. retailverse.in).
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
        // Decode failed, proceed
      }
    }
  }

  // Full debug snapshot
  console.log("[Tenant Debug] origin:", req.headers.origin);
  console.log("[Tenant Debug] host:", req.headers.host);
  console.log("[Tenant Debug] user role:", user?.role);
  console.log("[Tenant Debug] user clientId:", user?.clientId);

  // ── 0. Super Admin Bypass ──────────────────────────────────────────────
  // Super admin remains global unless they explicitly want a specific client scope
  if (user && user.role === "super_admin") {
    console.log(`[TenantResolver] super_admin detected, skipping domain resolution for ${route}`);
    // For Super Admin, we only scope if explicitly requested via query or body.
    // We ignore the x-client-id header which may be auto-injected from a previous session.
    const queryId = req.query?.clientId || req.body?.clientId;
    if (queryId && queryId !== "null" && queryId !== "undefined") {
      return String(queryId);
    }
    return null;
  }

  // ── 1. Authenticated user's clientId ──────────────────────────────────
  const uId = user?._id || user?.id;
  const uClientId = user?.clientId || user?.linkedClientId;

  if (user && user.clientId && user.clientId !== "null" && user.clientId !== "undefined") {
    console.log(`[TenantResolver] Resolved via user.clientId: ${user.clientId} for ${route}`);
    return String(user.clientId);
  }

  // ── 2. Authenticated user's linkedClientId ────────────────────────────
  if (user && user.linkedClientId && user.linkedClientId !== "null" && user.linkedClientId !== "undefined") {
    console.log(`[TenantResolver] Resolved via user.linkedClientId: ${user.linkedClientId} for ${route}`);
    return String(user.linkedClientId);
  }

  // ── 3. Admin/Client user's identity as owner scope ──────────────────
  if (user && (user.role === "admin" || user.role === "client") && uId) {
    console.log(`[TenantResolver] Resolved via identity (${user.role}): ${uId} for ${route}`);
    return String(uId);
  }

  // ── 4. Explicit x-client-id header ────────────────────────────────────
  const headerId = req.headers["x-client-id"];
  if (headerId && headerId !== "null" && headerId !== "undefined") {
    console.log(`[TenantResolver] Resolved via x-client-id header: ${headerId} for ${route}`);
    return String(headerId);
  }

  // ── 4b. req.query or req.body clientId ────────────────────────────────
  const queryId = req.query?.clientId || req.body?.clientId;
  if (queryId && queryId !== "null" && queryId !== "undefined") {
    console.log(`[TenantResolver] Resolved via query/body clientId: ${queryId} for ${route}`);
    return String(queryId);
  }

  // ── 5. Domain-based lookup ────────────────────────────────────────────
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

      if (domainDoc && domainDoc.clientId) {
        console.log(`[TenantResolver] Resolved domain ${normalized} to clientId: ${domainDoc.clientId}`);
        return String(domainDoc.clientId);
      }
    } catch (err) {
      console.error(`[TenantResolver] Error during domain resolution: ${err.message}`);
    }
  }

  console.log(`[TenantResolver] Could not resolve clientId for ${route}`);
  return null;
}

/**
 * Builds a scoping query for multi-tenant isolation.
 * Used to ensure Admins/Vendors only see their own data, while Super Admins see all (or selected).
 */
function buildScopeQuery(user, resolvedClientId) {
  const isValid = (val) => val && val !== "null" && val !== "undefined";

  // 1. Public visitor / Guest checkout: Scope to domain clientId if present
  if (!user) {
    return isValid(resolvedClientId) ? { clientId: String(resolvedClientId) } : {};
  }
  
  // 2. Platform Admins: Global by default, but can be scoped if a specific clientId is resolved
  const isSuperAdmin = user.role === "super_admin";
  const isAdminWithNoClient = user.role === "admin" && !isValid(user.clientId);

  if (isSuperAdmin) {
    // Super Admin should see everything unless they are explicitly filtering by a client ID.
    return isValid(resolvedClientId) ? { clientId: String(resolvedClientId) } : {};
  }

  // 3. Check if user is a staff/client-scoped role
  const { isClientScopedRole } = require("./clientScopedRoles");
  const isStaff = user.role === "admin" || isClientScopedRole(user.role);

  // 4. Handle Customer / User (Non-staff)
  if (!isStaff) {
    const targetClientId = resolvedClientId || user.clientId || user.linkedClientId;
    
    if (isValid(targetClientId)) {
      console.log(`[TenantResolver] Scoping customer to clientId: ${targetClientId} (and global)`);
      return { $or: [{ clientId: String(targetClientId) }, { clientId: null }, { clientId: { $exists: false } }] };
    }
    
    console.log(`[TenantResolver] No client resolved for customer, returning global view scope.`);
    return {};
  }

  // 5. Admin / Vendor / Client / Staff: Scoped to their data OR global products
  const orConditions = [];
  const uId = user._id || user.id;
  const sId = uId ? String(uId) : null;

  // A. Resolved from domain or header
  if (isValid(resolvedClientId)) {
    const resIdStr = String(resolvedClientId);
    orConditions.push({ clientId: resIdStr });
  }
  
  // B. Direct user scope fields
  if (isValid(user.clientId)) {
    orConditions.push({ clientId: String(user.clientId) });
  }
  if (isValid(user.linkedClientId)) {
    orConditions.push({ linkedClientId: String(user.linkedClientId) });
    orConditions.push({ clientId: String(user.linkedClientId) });
  }

  // C. User identity fields
  if (sId) {
    orConditions.push({ clientId: sId });
    orConditions.push({ adminId: sId });
    orConditions.push({ createdBy: sId });
    orConditions.push({ vendorId: sId });
    orConditions.push({ sellerId: sId });
    orConditions.push({ ownerId: sId });
    orConditions.push({ userId: sId });
    orConditions.push({ storeId: sId });
    orConditions.push({ client_id: sId });
    orConditions.push({ client: sId });
  }

  // D. Global products (available to all staff/clients)
  orConditions.push({ clientId: null });
  orConditions.push({ clientId: { $exists: false } });

  if (isAdminWithNoClient && orConditions.length <= 10) { 
    console.log(`[TenantResolver] Admin with null clientId detected, allowing full access.`);
    return {};
  }

  const uniqueOr = Array.from(new Set(orConditions.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
  
  if (uniqueOr.length > 0) {
    return { $or: uniqueOr };
  }
  
  return {};
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
};
