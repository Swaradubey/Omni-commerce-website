const { resolveClientId } = require("../utils/tenantResolver");

/**
 * Middleware to resolve and attach clientId to the request object.
 *
 * Resolution priority (handled inside resolveClientId):
 *  1. Logged-in user (req.user.clientId)
 *  2. x-client-id header
 *  3. body / query clientId param
 *  4. Domain lookup via x-client-origin > x-client-domain > origin > host
 *
 * Runs globally (before all routes) so every controller can trust req.clientId.
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    const clientId = await resolveClientId(req);

    if (clientId) {
      req.clientId = clientId;
    }

    // ── Full debug snapshot ────────────────────────────────────────────────
    console.log("[TenantMiddleware] Route         :", req.method, req.originalUrl);
    console.log("[TenantMiddleware] origin         :", req.headers.origin);
    console.log("[TenantMiddleware] host           :", req.headers.host);
    console.log("[TenantMiddleware] x-client-domain:", req.headers["x-client-domain"]);
    console.log("[TenantMiddleware] x-client-origin:", req.headers["x-client-origin"]);
    console.log("[TenantMiddleware] x-client-id    :", req.headers["x-client-id"]);
    console.log("[TenantMiddleware] resolved clientId:", req.clientId || "null");

    next();
  } catch (error) {
    console.error("[TenantMiddleware] Error resolving tenant:", error.message);
    next();
  }
};

module.exports = tenantMiddleware;
