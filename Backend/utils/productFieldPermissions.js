/**
 * Role-based product update payloads for PUT /api/products and PUT /api/inventory.
 * Schema uses `name` for the product title; `title` in the body is accepted as an alias for `name`.
 */

const { isClientScopedRole } = require("./clientScopedRoles");

function stripInternalKeys(body) {
  if (!body || typeof body !== "object") return {};
  const out = { ...body };
  delete out._id;
  delete out.__v;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

const TITLE_DESCRIPTION_BODY_KEYS = new Set(["name", "title", "description"]);
/** inventory_manager: only these body keys are read; all others are ignored (not rejected). */
const INVENTORY_MANAGER_ALLOWED_KEYS = new Set(["title", "description", "name"]);

function isTitleDescriptionOnlyBody(clean) {
  const keys = Object.keys(clean);
  if (keys.length === 0) return false;
  return keys.every((k) => TITLE_DESCRIPTION_BODY_KEYS.has(k));
}

/**
 * @param {object} clean — stripped request body
 * @returns {{ ok: true, update: object } | { ok: false, status: number, message: string }}
 */
function buildTitleDescriptionOnlyUpdate(clean) {
  const update = {};
  if (clean.name !== undefined) update.name = clean.name;
  else if (clean.title !== undefined) update.name = clean.title;
  if (clean.description !== undefined) update.description = clean.description;
  if (Object.keys(update).length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Provide at least one of: name, description, or title",
    };
  }
  return { ok: true, update };
}

/**
 * True when resolved patch only touches product title (name) and/or description (backend schema).
 * @param {object} update
 */
function isTitleDescriptionOnlyUpdate(update) {
  const keys = Object.keys(update);
  return keys.length > 0 && keys.every((k) => k === "name" || k === "description");
}

/**
 * @param {string} role
 * @param {object} body
 * @returns {{ ok: true, update: object } | { ok: false, status: number, message: string }}
 */
function resolveProductUpdatePayload(role, body) {
  const clean = stripInternalKeys(body);

  if (role === "admin" || role === "super_admin" || isClientScopedRole(role)) {
    if (isTitleDescriptionOnlyBody(clean)) {
      return buildTitleDescriptionOnlyUpdate(clean);
    }
    const { name, sku, category, price, stock } = clean;
    if (
      !name ||
      String(name).trim() === "" ||
      !sku ||
      String(sku).trim() === "" ||
      !category ||
      String(category).trim() === "" ||
      price === undefined ||
      price === null ||
      stock === undefined ||
      stock === null
    ) {
      return {
        ok: false,
        status: 400,
        message: "Name, SKU, category, price, and stock are required",
      };
    }
    return { ok: true, update: clean };
  }

  if (role === "inventory_manager") {
    const update = {};
    if (clean.title !== undefined) update.name = clean.title;
    else if (clean.name !== undefined) update.name = clean.name;
    if (clean.description !== undefined) update.description = clean.description;
    if (Object.keys(update).length === 0) {
      return {
        ok: false,
        status: 400,
        message: "Provide at least one of: title, name, or description",
      };
    }
    return { ok: true, update };
  }

  if (role === "staff") {
    const update = { ...clean };
    delete update.name;
    delete update.description;
    delete update.title;
    if (Object.keys(update).length === 0) {
      return {
        ok: false,
        status: 400,
        message: "No permitted fields to update",
      };
    }
    return { ok: true, update };
  }

  return {
    ok: false,
    status: 403,
    message: "Your role cannot update products",
  };
}

module.exports = {
  resolveProductUpdatePayload,
  stripInternalKeys,
  isTitleDescriptionOnlyUpdate,
};
