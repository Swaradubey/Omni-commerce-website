const AdminLoginLog = require("../models/AdminLoginLog");

function resolveLoginRequestMeta(req) {
  if (!req) {
    return {
      ipAddress: null,
      userAgent: null,
      deviceInfo: null,
      source: null,
    };
  }

  const xf = req.headers["x-forwarded-for"];
  const fromForwarded =
    typeof xf === "string" && xf.length ? xf.split(",")[0].trim() : null;
  const ipAddress = fromForwarded || req.ip || null;
  const userAgent = req.headers["user-agent"] || null;
  const sourceHeader = req.headers["x-client-source"];
  const sourceBody = req.body && typeof req.body.source === "string" ? req.body.source : null;
  const source = (sourceHeader || sourceBody || "").trim() || "web";

  return {
    ipAddress,
    userAgent,
    deviceInfo: userAgent,
    source,
  };
}

function formatDateParts(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const pad = (num) => String(num).padStart(2, "0");
  const loginDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const loginTime = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return { loginDate, loginTime };
}

async function createLoginLog(user, req, extraMeta = {}) {
  if (!user || !user.email) return null;

  const loginAt = new Date();
  const { loginDate, loginTime } = formatDateParts(loginAt);
  const reqMeta = resolveLoginRequestMeta(req);
  const role = String(user.role || "").trim();
  const actorName = String(user.name || "").trim() || null;

  const payload = {
    userId: user._id || null,
    name: actorName,
    email: String(user.email).toLowerCase().trim(),
    role,
    status: "success",
    event: "login",
    message: `${role || "user"} logged in successfully`,
    loginAt,
    loginDate,
    loginTime,
    ...reqMeta,
    ...extraMeta,
  };

  return AdminLoginLog.create(payload);
}

module.exports = { createLoginLog, resolveLoginRequestMeta };
