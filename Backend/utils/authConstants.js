const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

/** Shared defaults for privileged accounts (override via env in production). */
const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || "deekshagupta1575@gmail.com"
)
  .toLowerCase()
  .trim();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Sandhya@1";

/** Default: Hexerve@gmail.com → stored as hexerve@gmail.com (see SUPER_ADMIN_EMAIL env). */
const SUPER_ADMIN_EMAIL = String(
  process.env.SUPER_ADMIN_EMAIL || "hexerve@gmail.com"
)
  .toLowerCase()
  .trim();

const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "12345";

module.exports = {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
};
