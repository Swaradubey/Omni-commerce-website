/**
 * Matches dashboard Help Center access: storefront `user` and staff roles,
 * excluding Super Admin (Help Center is hidden from SA in the UI).
 */
const DASHBOARD_HELP_CENTER_ROLES = new Set([
  "user",
  "admin",
  "staff",
  "inventory_manager",
  "cashier",
  "seo_manager",
  "client",
  "store_manager",
  "employee",
]);

const allowDashboardHelpCenter = (req, res, next) => {
  const r = req.user?.role;
  if (!r) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (r === "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Help Center is not available for this role",
    });
  }
  if (!DASHBOARD_HELP_CENTER_ROLES.has(r)) {
    return res.status(403).json({
      success: false,
      message: `Role (${r}) is not allowed to access Help Center`,
    });
  }
  return next();
};

module.exports = { allowDashboardHelpCenter };
