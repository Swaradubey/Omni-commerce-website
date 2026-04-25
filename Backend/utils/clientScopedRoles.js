/** Roles that operate within a single Client org (same scoping rules as `client`). */
const CLIENT_SCOPED_ROLES = new Set([
  "client",
  "store_manager",
  "employee",
  "staff",
  "seo_manager",
  "inventory_manager",
  "counter_manager",
]);

function normalizeRole(role) {
  if (!role) return "";
  const canonicalWords = String(role)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\brole\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!canonicalWords) return "";
  return canonicalWords.replace(/\s+/g, "_");
}

function isClientScopedRole(role) {
  const normalized = normalizeRole(role);
  return !!normalized && CLIENT_SCOPED_ROLES.has(normalized);
}

module.exports = { CLIENT_SCOPED_ROLES, isClientScopedRole, normalizeRole };
