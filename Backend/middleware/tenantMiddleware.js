const { resolveClientId } = require("../utils/tenantResolver");

/**
 * Middleware to resolve and attach clientId to the request object.
 * Priority:
 * 1. Logged-in user (req.user.clientId)
 * 2. x-client-id header
 * 3. Custom domain mapping (via req.headers.host)
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    const clientId = await resolveClientId(req);
    
    if (clientId) {
      req.clientId = clientId;
      
      // STEP 6: Debug Logs (Requested by user)
      console.log("Host:", req.headers.host);
      console.log("Resolved clientId:", req.clientId);
    }
    
    next();
  } catch (error) {
    console.error("[TenantMiddleware] Error resolving tenant:", error.message);
    next();
  }
};

module.exports = tenantMiddleware;
