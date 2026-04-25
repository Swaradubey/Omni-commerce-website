const User = require("../models/User");
const Client = require("../models/Client");
const Employee = require("../models/Employee");
const mongoose = require("mongoose");
const { ensureRoleProfilesForUser } = require("./ensureRoleProfiles");
const { isClientScopedRole } = require("./clientScopedRoles");

const EXCLUDED_PERSIST_ROLES = new Set(["admin", "super_admin"]);

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeRole(value) {
  const normalizedRole = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalizedRole) {
    return "";
  }
  const allowedRoles = User.schema.path("role")?.enumValues || [];
  if (!allowedRoles.includes(normalizedRole)) {
    console.warn(
      `[Auth Sync] Invalid role "${normalizedRole}" for users persistence. Falling back to "user".`
    );
    return "user";
  }
  return normalizedRole;
}

function sanitizeObjectId(value, fieldName, normalizedEmail) {
  if (value == null) {
    return null;
  }
  const asString = String(value).trim();
  if (!asString) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(asString)) {
    console.warn(
      `[Auth Sync] Skip invalid ${fieldName}="${asString}" for email=${normalizedEmail}`
    );
    return null;
  }
  return asString;
}

/**
 * Non-admin login identity sync into MongoDB `users`.
 * Uses normalized email to prevent duplicates and updates useful login/profile fields.
 *
 * @param {import("mongoose").Document | Record<string, any>} authenticatedUser
 * @returns {Promise<import("mongoose").Document | null>}
 */
async function upsertNonAdminUserOnLogin(authenticatedUser) {
  if (!authenticatedUser) {
    return null;
  }

  const now = new Date();
  const role = normalizeRole(authenticatedUser.role);
  const normalizedEmail = normalizeEmail(authenticatedUser.email);
  const dbName = mongoose.connection?.name || "(unknown-db)";
  const dbHost = mongoose.connection?.host || "(unknown-host)";
  const collectionName = User.collection?.name || "users";

  if (!normalizedEmail) {
    console.warn("[Auth Sync] Skip MongoDB users upsert: missing email on authenticated payload");
    return authenticatedUser;
  }

  if (!role) {
    console.warn(`[Auth Sync] Skip MongoDB users upsert: missing role for ${normalizedEmail}`);
    return authenticatedUser;
  }

  if (EXCLUDED_PERSIST_ROLES.has(role)) {
    console.log(`[Auth Sync] Skip users upsert for privileged role=${role} email=${normalizedEmail}`);
    return authenticatedUser;
  }

  console.log(
    `[Auth Sync] Start users upsert email=${normalizedEmail} role=${role} db=${dbName} host=${dbHost} collection=${collectionName}`
  );
  const existingByEmail = await User.findByNormalizedEmail(normalizedEmail);
  const existed = !!existingByEmail;
  console.log(
    `[Auth Sync] Existing user ${existed ? `found id=${String(existingByEmail._id)}` : "not found"} email=${normalizedEmail}`
  );

  const setPayload = {
    name: String(authenticatedUser.name || "").trim() || "User",
    email: normalizedEmail,
    role,
    lastLoginAt: now,
    lastActiveAt: now,
    updatedAt: now,
  };

  const phone = String(authenticatedUser.phone || "").trim();
  if (phone) {
    setPayload.phone = phone;
  }

  const address = String(authenticatedUser.address || "").trim();
  if (address) {
    setPayload.address = address;
  }

  const clientId = sanitizeObjectId(
    authenticatedUser.clientId,
    "clientId",
    normalizedEmail
  );
  if (clientId) {
    setPayload.clientId = clientId;
  }
  const managerId = sanitizeObjectId(
    authenticatedUser.managerId,
    "managerId",
    normalizedEmail
  );
  if (managerId) {
    setPayload.managerId = managerId;
  }
  if (typeof authenticatedUser.isActive === "boolean") {
    setPayload.isActive = authenticatedUser.isActive;
  }

  const setOnInsert = {};
  if (authenticatedUser.password) {
    setOnInsert.password = authenticatedUser.password;
  }
  if (typeof authenticatedUser.isActive === "boolean") {
    setOnInsert.isActive = authenticatedUser.isActive;
  }

  const query = existed
    ? { _id: existingByEmail._id }
    : { email: normalizedEmail };

  console.log(
    "[Auth Sync] users upsert payload:",
    JSON.stringify(
      {
        query,
        setPayload,
        setOnInsert: {
          ...setOnInsert,
          ...(setOnInsert.password ? { password: "[REDACTED_HASH]" } : {}),
        },
        mode: existed ? "update" : "upsert-create",
      },
      null,
      2
    )
  );

  let upsertedUser;
  try {
    upsertedUser = await User.findOneAndUpdate(
      query,
      { $set: setPayload, $setOnInsert: setOnInsert },
      {
        new: true,
        upsert: !existed,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error?.code === 11000) {
      console.warn(
        `[Auth Sync] Duplicate email key during upsert for ${normalizedEmail}. Retrying as update.`
      );
      const retryTarget = await User.findByNormalizedEmail(normalizedEmail);
      if (retryTarget) {
        upsertedUser = await User.findOneAndUpdate(
          { _id: retryTarget._id },
          { $set: setPayload },
          {
            new: true,
            runValidators: true,
          }
        );
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  console.log(
    `[Auth Sync] users upsert ${existed ? "updated" : "created"} email=${normalizedEmail} role=${role} db=${dbName} host=${dbHost} collection=${collectionName}`
  );

  return upsertedUser;
}

/**
 * After successful authentication: optionally ensure Client/Employee stubs for scoped roles,
 * copy phone/address from linked profile documents onto the main `users` row, and set
 * lastLoginAt / lastActiveAt (MongoDB source of truth for login identity).
 *
 * @param {import("mongoose").Document} user
 * @returns {Promise<import("mongoose").Document>}
 */
async function syncUserOnLogin(user) {
  const now = new Date();

  if (isClientScopedRole(user.role)) {
    await ensureRoleProfilesForUser(user);
  }

  const fresh = await User.findById(user._id);
  if (!fresh) {
    return user;
  }

  const emp = await Employee.findOne({ userId: fresh._id });
  if (emp) {
    const p = String(emp.phone || "").trim();
    const a = String(emp.address || "").trim();
    if (p && p !== "0000000000") {
      fresh.phone = p;
    }
    if (a && a !== "—") {
      fresh.address = a;
    }
  } else if (fresh.clientId) {
    const c = await Client.findById(fresh.clientId).lean();
    if (c) {
      const p = String(c.phone || "").trim();
      const a = String(c.permanentAddress || "").trim();
      if (p && p !== "0000000000") {
        fresh.phone = p;
      }
      if (a) {
        fresh.address = a;
      }
    }
  }

  fresh.lastLoginAt = now;
  fresh.lastActiveAt = now;
  await fresh.save();
  return fresh;
}

module.exports = {
  syncUserOnLogin,
  upsertNonAdminUserOnLogin,
};
