const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const ensurePrivilegedUsers = require("../utils/ensurePrivilegedUsers");

function parseMongoUriForLog(uri) {
  if (!uri || typeof uri !== "string") {
    return { host: null, dbName: null };
  }
  const trimmed = uri.trim();
  const m = trimmed.match(/^mongodb(\+srv)?:\/\/(?:[^@/]+)@([^/?]+)(?:\/([^?]*))?/);
  if (!m) {
    return { host: "(invalid URI format)", dbName: null };
  }
  const dbName = m[3] && m[3].length > 0 ? m[3] : "(default)";
  return { host: m[2], dbName };
}

const connectDB = async () => {
  dotenv.config({ path: path.join(__dirname, "..", ".env") });

  const rawUri = process.env.MONGO_URI;
  const mongoUri = typeof rawUri === "string" ? rawUri.trim() : "";

  if (!mongoUri) {
    console.error(
      "[MongoDB] MONGO_URI is missing or empty. Set it in Backend/.env (no quotes around the value)."
    );
    process.exit(1);
  }

  const { host, dbName } = parseMongoUriForLog(mongoUri);
  console.log("[MongoDB] MONGO_URI loaded (host:", host + ", database:", dbName + ")");
  console.log("[MongoDB] Connection attempt started…");

  try {
    await mongoose.connect(mongoUri);
    console.log("[MongoDB] Connected successfully");
    await ensurePrivilegedUsers();
  } catch (error) {
    const name = error && error.name ? error.name : "Error";
    const msg = error && error.message ? error.message : String(error);
    console.error("[MongoDB] Connection failed");
    console.error(`  Name: ${name}`);
    console.error(`  Message: ${msg}`);
    if (error && error.reason) {
      console.error(`  Reason: ${error.reason}`);
    }
    if (/whitelist|IP|not allowed|ECONNREFUSED|ETIMEDOUT|Server selection timed out/i.test(msg)) {
      console.error(
        "[MongoDB] Hint: In Atlas → Network Access, add your current IP (or 0.0.0.0/0 only for testing)."
      );
    }
    if (/authentication failed|bad auth/i.test(msg)) {
      console.error(
        "[MongoDB] Hint: Check Database Access user/password; URL-encode special characters in the password inside the URI."
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
