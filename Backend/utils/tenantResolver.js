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
  
  // ── 0. Super Admin / Admin Bypass ──────────────────────────────────────────────
  // If the request contains a Super Admin or Admin token, we skip domain-based resolution
  // to ensure they always get a global (null) clientId by default, unless 
  // explicitly overridden by a header.
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(token);
      if (decoded && (decoded.role === "super_admin" || decoded.role === "admin")) {
        console.log(`[TenantResolver] ${decoded.role} detected via JWT, skipping domain resolution for ${route}`);
        
        // However, if they explicitly sent a clientId header, respect it
        const headerId = req.headers["x-client-id"];
        if (headerId && headerId !== "null" && headerId !== "undefined") {
          return String(headerId);
        }
        return null;
      }
    } catch (e) {
      // Decode failed, proceed with normal resolution
    }
  }

  // Full debug snapshot for tenant resolution troubleshooting
  console.log("[Tenant Debug] origin:", req.headers.origin);
  console.log("[Tenant Debug] host:", req.headers.host);
  console.log("[Tenant Debug] x-client-domain:", req.headers["x-client-domain"]);
  console.log("[Tenant Debug] user role:", req.user?.role);
  console.log("[Tenant Debug] user clientId:", req.user?.clientId);

  // ── A. Authenticated user object ──────────────────────────────────────────
  // If logged-in user has clientId, use it (highest priority)
  if (req.user && req.user.clientId) {
    console.log(`[TenantResolver] Resolved via user.clientId: ${req.user.clientId} for ${route}`);
    console.log("[Tenant Debug] resolved clientId:", req.user.clientId);
    return String(req.user.clientId);
  }

  // ── B. Admin/Super-admin selectedClientId or activeClientId ───────────────
  // Some flows might set selectedClientId or activeClientId in the session or body
  const selectedClientId = req.user?.selectedClientId || req.user?.activeClientId || req.body?.selectedClientId || req.query?.selectedClientId;
  if (selectedClientId && selectedClientId !== "null" && selectedClientId !== "undefined") {
    console.log(`[TenantResolver] Resolved via selected/active clientId: ${selectedClientId} for ${route}`);
    console.log("[Tenant Debug] resolved clientId:", selectedClientId);
    return String(selectedClientId);
  }

  // ── C. Explicit x-client-id header ────────────────────────────────────────
  const headerId = req.headers["x-client-id"];
  if (headerId && headerId !== "null" && headerId !== "undefined") {
    console.log(`[TenantResolver] Resolved via x-client-id header: ${headerId} for ${route}`);
    console.log("[Tenant Debug] resolved clientId:", headerId);
    return String(headerId);
  }

  // ── D, E, F. Domain-based lookup ──────────────────────────────────────────
  // Read all domain hint sources
  const xClientOrigin = req.headers["x-client-origin"] || "";
  const xClientDomain = req.headers["x-client-domain"] || "";
  const originHeader  = req.headers.origin || req.headers.referer || "";
  const hostHeader    = req.headers["x-forwarded-host"] || req.headers.host || "";

  // Build a prioritised list of raw hostname strings
  const rawCandidates = [];

  if (xClientOrigin) {
    try { rawCandidates.push(new URL(xClientOrigin).hostname); }
    catch { rawCandidates.push(xClientOrigin); }
  }
  if (xClientDomain) {
    rawCandidates.push(xClientDomain);
  }
  if (originHeader) {
    try { rawCandidates.push(new URL(originHeader).hostname); }
    catch { rawCandidates.push(originHeader); }
  }
  if (hostHeader) {
    rawCandidates.push(hostHeader.split(":")[0]);
  }

  // System / infrastructure domains — skip DB lookup
  const isSystemDomain = (d) =>
    !d ||
    d === "localhost" ||
    d.endsWith(".vercel.app") ||
    d.endsWith(".onrender.com") ||
    d.endsWith(".render.com");

  // Deduplicate while preserving priority order
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
    if (isSystemDomain(normalized)) {
      console.log(`[TenantResolver] System domain detected (${normalized}), skipping DB lookup.`);
      continue;
    }

    console.log(`[TenantResolver] Attempting to resolve domain: ${normalized}`);
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
        console.log(
          `[TenantResolver] Resolved domain ${normalized} to clientId: ${domainDoc.clientId}`
        );
        console.log("[Tenant Debug] resolved clientId:", domainDoc.clientId);
        return String(domainDoc.clientId);
      } else {
        console.log(`[TenantResolver] No CustomDomain mapping found for: ${normalized}`);
      }
    } catch (err) {
      console.error(
        `[TenantResolver] Error during domain resolution for ${normalized}: ${err.message}`
      );
    }
  }

  console.log(`[TenantResolver] Could not resolve clientId for ${route}`);
  console.log("[Tenant Debug] resolved clientId: null");
  return null;
}

module.exports = {
  resolveClientId,
  normalizeDomain,
};
