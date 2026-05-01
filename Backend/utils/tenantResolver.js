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
 * Resolves the clientId from various request sources:
 * 1. User object (if logged in and scoped)
 * 2. Headers (x-client-id)
 * 3. Body or Query parameters
 * 4. Origin or Referer domain
 * 
 * @param {import("express").Request} req 
 * @returns {Promise<string|null>}
 */
async function resolveClientId(req) {
  const route = req.originalUrl || req.url;
  
  // 1. Try from user object
  if (req.user && req.user.clientId) {
    console.log(`[TenantResolver] Resolved via user.clientId: ${req.user.clientId} for ${route}`);
    return String(req.user.clientId);
  }

  // 2. Try from headers
  const headerId = req.headers["x-client-id"];
  if (headerId && headerId !== "null" && headerId !== "undefined") {
    console.log(`[TenantResolver] Resolved via x-client-id header: ${headerId} for ${route}`);
    return String(headerId);
  }

  // 3. Try from body or query
  const bodyId = req.body?.clientId || req.query?.clientId;
  if (bodyId && bodyId !== "null" && bodyId !== "undefined") {
    console.log(`[TenantResolver] Resolved via body/query clientId: ${bodyId} for ${route}`);
    return String(bodyId);
  }

  // 4. Resolve from domain (Origin, Referer, or Host)
  const origin = req.headers.origin || req.headers.referer;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  
  console.log(`[TenantResolver] Debug - Route: ${route}, Origin: ${req.headers.origin}, Referer: ${req.headers.referer}, Host: ${req.headers.host}, X-Forwarded-Host: ${req.headers["x-forwarded-host"]}`);

  // Try parsing from Origin/Referer first (usually more reliable for frontend apps)
  let domainToResolve = null;
  if (origin) {
    try {
      domainToResolve = new URL(origin).hostname;
    } catch (err) {
      domainToResolve = origin; // Fallback if not a full URL
    }
  } else if (host) {
    domainToResolve = host;
  }

  if (domainToResolve) {
    try {
      const normalized = normalizeDomain(domainToResolve);
      console.log(`[TenantResolver] Attempting to resolve domain: ${normalized}`);
      
      // Skip resolution for known system domains
      if (normalized === "localhost" || normalized.endsWith("vercel.app") || normalized.endsWith("onrender.com")) {
        console.log(`[TenantResolver] System domain detected (${normalized}), skipping DB lookup.`);
      } else {
        const domainDoc = await CustomDomain.findOne({
          $or: [
            { domainName: normalized },
            { domainName: `www.${normalized}` },
            { domain: normalized },
            { domain: `www.${normalized}` }
          ]
        }).select("clientId");

        if (domainDoc && domainDoc.clientId) {
          console.log(`[TenantResolver] Resolved domain ${normalized} to clientId: ${domainDoc.clientId}`);
          return String(domainDoc.clientId);
        } else {
          console.log(`[TenantResolver] No CustomDomain mapping found for: ${normalized}`);
        }
      }
    } catch (err) {
      console.error(`[TenantResolver] Error during domain resolution: ${err.message}`);
    }
  }

  console.log(`[TenantResolver] Could not resolve clientId for ${route}`);
  return null;
}

module.exports = {
  resolveClientId,
  normalizeDomain
};

