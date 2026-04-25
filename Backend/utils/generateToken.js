const jwt = require("jsonwebtoken");

/**
 * @param {string} id User id
 * @param {string} email
 * @param {string} role
 * @param {{ impersonatedBy?: string, expiresIn?: string }} [options] Use `impersonatedBy` for Super Admin impersonation JWTs.
 */
const generateToken = (id, email, role, options = {}) => {
  const payload = {
    id: String(id),
    email,
    role,
  };
  if (options.impersonatedBy) {
    payload.impersonatedBy = String(options.impersonatedBy);
  }
  const expiresIn = options.expiresIn || "7d";
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;
