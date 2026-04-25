const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

const isValidProductId = (id) => mongoose.Types.ObjectId.isValid(id);

function slugifyName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function mongoKey(id) {
  return `mongo:${id}`;
}

function trimStr(s, max = 2000) {
  if (s == null) return "";
  const t = String(s);
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * Whether the wishlist already contains this key (new `items` or legacy `products`).
 */
function isInWishlist(wishlist, productKey) {
  if (!wishlist) return false;
  if (wishlist.items?.some((i) => i.productKey === productKey)) return true;
  if (productKey.startsWith("mongo:")) {
    const id = productKey.slice(6);
    return !!wishlist.products?.some((pid) => pid.toString() === id);
  }
  return false;
}

/**
 * True if the same logical product is already saved (by key, Mongo id on items, or legacy `products`).
 */
function wishlistContainsResolvedItem(wishlist, { productKey, productRef }) {
  if (!wishlist) return false;
  if (isInWishlist(wishlist, productKey)) return true;
  if (productRef) {
    const id = productRef.toString();
    if (wishlist.items?.some((i) => i.productRef && i.productRef.toString() === id)) return true;
    if (wishlist.items?.some((i) => i.productId && String(i.productId) === id)) return true;
  }
  return false;
}

function deriveStoredProductId(productKey, productRef) {
  if (productRef) return String(productRef);
  if (productKey && productKey.startsWith("mongo:")) return productKey.slice(6);
  return String(productKey || "");
}

/**
 * Full subdocument for `items[]`: flat fields (easy to read in MongoDB) + legacy `snapshot` for compatibility.
 * `productId` is a string: Mongo ObjectId hex for DB products, or the full stable key for static/catalog rows.
 */
function buildWishlistItemDocument({ productKey, source, productRef, snapshot, productType }) {
  const snap = snapshot && typeof snapshot === "object" ? { ...snapshot } : {};
  const name = trimStr(snap.name || "Unnamed Product", 500);
  const priceRaw = snap.price;
  const price =
    priceRaw != null && !Number.isNaN(Number(priceRaw)) ? Number(priceRaw) : 0;
  const image = trimStr(snap.image || "", 2000);
  const slug = trimStr(snap.slug || slugifyName(name), 500);
  const stockRaw = snap.stock;
  const stock =
    stockRaw != null && !Number.isNaN(Number(stockRaw)) ? Number(stockRaw) : 0;
  const pt = trimStr(productType || "product", 100) || "product";
  const productId = trimStr(deriveStoredProductId(productKey, productRef), 500);

  const snapshotOut = {
    name,
    slug,
    price,
    salePrice: snap.salePrice,
    image,
    category: trimStr(snap.category || "", 200),
    sku: trimStr(snap.sku || "", 200),
    stock,
  };

  return {
    productKey,
    source,
    productRef: productRef || null,
    productId,
    name,
    price,
    image,
    slug,
    stock,
    productType: pt,
    snapshot: snapshotOut,
    addedAt: new Date(),
  };
}

function buildSnapshotFromProduct(product) {
  return {
    name: trimStr(product.name, 500),
    slug: slugifyName(product.name),
    price: Number(product.price) || 0,
    salePrice: undefined,
    image: trimStr(product.image || "", 2000),
    category: trimStr(product.category || "", 200),
    sku: trimStr(product.sku || "", 200),
    stock: product.stock != null ? Number(product.stock) : 0,
  };
}

/**
 * Resolve POST body / toggle input into { productKey, source, productRef, snapshot, productType } or null on validation error.
 */
async function resolveWishlistItemFromRequest(reqBody) {
  const { productId, item: clientItem } = reqBody || {};

  let productKey;
  let source;
  let productRef = null;
  let snapshot = {};
  let productType = "product";

  if (productId && typeof productId === "string" && isValidProductId(productId)) {
    const product = await Product.findById(productId);
    if (!product) {
      return { error: { status: 404, message: "Product not found" } };
    }
    productKey = mongoKey(productId);
    source = "mongo";
    productRef = product._id;
    snapshot = buildSnapshotFromProduct(product);
  } else if (clientItem && typeof clientItem === "object") {
    productType = trimStr(clientItem.productType || "product", 100) || "product";
    productKey = trimStr(clientItem.productKey, 500);
    source = clientItem.source;
    const allowedSources = ["static", "catalog", "inventory", "mongo"];
    if (!productKey || productKey.length < 3) {
      return { error: { status: 400, message: "item.productKey is required" } };
    }
    if (!allowedSources.includes(source)) {
      return {
        error: {
          status: 400,
          message: "item.source must be one of: static, catalog, inventory, mongo",
        },
      };
    }

    const snap = clientItem.snapshot && typeof clientItem.snapshot === "object" ? clientItem.snapshot : {};
    const name = trimStr(snap.name || clientItem.name, 500);
    const price = Number(snap.price ?? clientItem.price);
    const snapStock = snap.stock ?? clientItem.stock;
    const stockNum =
      snapStock != null && !Number.isNaN(Number(snapStock)) ? Number(snapStock) : 0;
    if (!name || Number.isNaN(price)) {
      return { error: { status: 400, message: "item snapshot requires name and price" } };
    }

    if (clientItem.productRef && isValidProductId(String(clientItem.productRef))) {
      const exists = await Product.findById(clientItem.productRef).select("_id");
      if (exists) productRef = exists._id;
    }

    snapshot = {
      name,
      slug: trimStr(snap.slug || clientItem.slug || slugifyName(name), 500),
      price,
      salePrice:
        snap.salePrice != null && !Number.isNaN(Number(snap.salePrice))
          ? Number(snap.salePrice)
          : clientItem.salePrice != null && !Number.isNaN(Number(clientItem.salePrice))
            ? Number(clientItem.salePrice)
            : undefined,
      image: trimStr(snap.image || clientItem.image || "", 2000),
      category: trimStr(snap.category || clientItem.category || "", 200),
      sku: trimStr(snap.sku || clientItem.sku || "", 200),
      stock: stockNum,
    };

    if (productKey.startsWith("mongo:")) {
      const mid = productKey.slice(6);
      if (!isValidProductId(mid)) {
        return { error: { status: 400, message: "Invalid mongo productKey" } };
      }
      const p = await Product.findById(mid);
      if (!p) {
        return { error: { status: 404, message: "Product not found" } };
      }
      source = "mongo";
      productRef = p._id;
      snapshot = buildSnapshotFromProduct(p);
      productType = "product";
    }
  } else {
    return {
      error: {
        status: 400,
        message: "Provide productId (Mongo id) or item { productKey, source, snapshot }",
      },
    };
  }

  return { productKey, source, productRef, snapshot, productType };
}

function sanitizeProductForClient(p) {
  if (!p) return null;
  const o = p.toObject ? p.toObject() : p;
  return {
    _id: o._id,
    name: o.name,
    sku: o.sku,
    category: o.category,
    price: o.price,
    stock: o.stock,
    image: o.image || "",
    description: o.description ? String(o.description).slice(0, 500) : "",
    isActive: o.isActive,
  };
}

async function enrichWishlistDocument(wishlist) {
  if (!wishlist) {
    return { productIds: [], items: [] };
  }

  const legacyIds = (wishlist.products || []).map((id) => id.toString());
  const itemRows = [];

  const seenKeys = new Set();

  for (const row of wishlist.items || []) {
    if (!row || !row.productKey) continue;
    seenKeys.add(row.productKey);
    let live = null;
    if (row.productRef) {
      const p = await Product.findById(row.productRef).lean();
      if (p) live = sanitizeProductForClient(p);
    }
    const snap = row.snapshot || {};
    const name = trimStr(row.name || snap.name || "", 500);
    const slug = trimStr(row.slug || snap.slug || "", 500);
    const image = trimStr(row.image || snap.image || "", 2000);
    const priceNum =
      row.price != null && !Number.isNaN(Number(row.price))
        ? Number(row.price)
        : snap.price != null
          ? Number(snap.price)
          : 0;
    const rowStock = row.stock != null ? Number(row.stock) : undefined;
    const snapStock = snap.stock != null ? Number(snap.stock) : undefined;
    const mergedStock =
      rowStock != null && !Number.isNaN(rowStock)
        ? rowStock
        : snapStock != null && !Number.isNaN(snapStock)
          ? snapStock
          : undefined;
    const storedProductId =
      trimStr(row.productId || "", 500) ||
      (row.productRef ? row.productRef.toString() : "") ||
      (row.productKey.startsWith("mongo:") ? row.productKey.slice(6) : row.productKey);
    itemRows.push({
      productKey: row.productKey,
      source: row.source,
      productRef: row.productRef ? row.productRef.toString() : null,
      productId: storedProductId,
      productType: row.productType || "product",
      addedAt: row.addedAt,
      snapshot: {
        name: name || snap.name || "",
        slug: slug || snap.slug || "",
        price: priceNum,
        salePrice: snap.salePrice != null ? Number(snap.salePrice) : undefined,
        image: image || snap.image || "",
        category: snap.category || "",
        sku: snap.sku || "",
        stock: mergedStock != null && !Number.isNaN(mergedStock) ? mergedStock : 0,
      },
      live,
      displayName: live?.name ?? name ?? snap.name ?? "",
      displayPrice: live?.price ?? priceNum ?? 0,
      displayImage: live?.image || image || snap.image || "",
      displaySlug: live ? slugifyName(live.name) : slug || snap.slug || "",
      stock: live?.stock != null ? live.stock : mergedStock,
    });
  }

  for (const lid of legacyIds) {
    const key = mongoKey(lid);
    if (seenKeys.has(key)) continue;
    const p = await Product.findById(lid).lean();
    if (!p) continue;
    const live = sanitizeProductForClient(p);
    const snap = buildSnapshotFromProduct(p);
    itemRows.push({
      productKey: key,
      source: "mongo",
      productRef: lid,
      productId: lid,
      productType: "product",
      addedAt: undefined,
      snapshot: {
        name: snap.name,
        slug: snap.slug,
        price: snap.price,
        image: snap.image,
        category: snap.category,
        sku: snap.sku,
        stock: snap.stock != null ? Number(snap.stock) : 0,
      },
      live,
      displayName: live?.name ?? snap.name,
      displayPrice: live?.price ?? snap.price,
      displayImage: live?.image || snap.image || "",
      displaySlug: slugifyName(live.name),
      stock: live?.stock != null ? live.stock : snap.stock,
    });
  }

  const productIds = [
    ...new Set([
      ...legacyIds,
      ...(wishlist.items || []).filter((i) => i.productRef).map((i) => i.productRef.toString()),
    ]),
  ];

  return { productIds, items: itemRows };
}

// @desc    Get wishlist for current user (enriched for UI)
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    console.log(
      `[Wishlist] User Authenticated: ${req.user.email} (Role: ${req.user.role})`
    );
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    const { productIds, items } = await enrichWishlistDocument(wishlist);
    console.log(
      `[Wishlist] Wishlist fetched from MongoDB for user: ${req.user.email} (${items.length} items)`
    );

    res.status(200).json({
      success: true,
      message: "Wishlist fetched",
      data: {
        productIds,
        items,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Check wishlist status (Mongo product id and/or stable productKey)
// @route   GET /api/wishlist/check?productId= | ?productKey=
// @route   GET /api/wishlist/check/:productId  (legacy: Mongo id in path)
// @access  Private
const checkWishlistStatus = async (req, res) => {
  try {
    let productKey;
    const paramId = req.params.productId;
    if (paramId) {
      if (!isValidProductId(paramId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }
      productKey = mongoKey(paramId);
    } else if (req.query.productId && isValidProductId(String(req.query.productId))) {
      productKey = mongoKey(String(req.query.productId));
    } else if (req.query.productKey && typeof req.query.productKey === "string") {
      productKey = trimStr(req.query.productKey, 500);
      if (!productKey || productKey.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Invalid productKey",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide productId or productKey",
      });
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id }).lean();
    const inWishlist = isInWishlist(wishlist, productKey);
    console.log(
      `[Wishlist] Check status for ${req.user.email}: productKey=${productKey} inWishlist=${inWishlist}`
    );

    res.status(200).json({
      success: true,
      inWishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Add to wishlist (idempotent — no duplicate keys)
// @route   POST /api/wishlist
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    console.log(
      `[Wishlist] User Authenticated: ${req.user.email} (Role: ${req.user.role})`
    );
    const resolved = await resolveWishlistItemFromRequest(req.body);
    if (resolved.error) {
      return res.status(resolved.error.status).json({
        success: false,
        message: resolved.error.message,
      });
    }

    const { productKey, source, productRef, snapshot, productType } = resolved;
    console.log(`[Wishlist] Add Request: productKey=${productKey} source=${source}`);

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [],
        items: [],
      });
    }

    wishlist.items = wishlist.items || [];
    wishlist.products = wishlist.products || [];

    if (wishlistContainsResolvedItem(wishlist, { productKey, productRef })) {
      console.log(
        `[Wishlist] Duplicate skipped (already in wishlist): ${productKey} user=${req.user.email}`
      );
      return res.status(200).json({
        success: true,
        inWishlist: true,
        alreadyExists: true,
        message: "Already in wishlist",
      });
    }

    const itemDoc = buildWishlistItemDocument({
      productKey,
      source,
      productRef,
      snapshot,
      productType,
    });
    console.log("[Wishlist] Saving item to MongoDB:", {
      productId: itemDoc.productId,
      name: itemDoc.name,
      price: itemDoc.price,
      image: itemDoc.image,
      stock: itemDoc.stock,
      slug: itemDoc.slug,
      productType: itemDoc.productType,
    });

    wishlist.items.push(itemDoc);

    if (productKey.startsWith("mongo:")) {
      const mid = productKey.slice(6);
      const oid = new mongoose.Types.ObjectId(mid);
      if (!wishlist.products.some((id) => id.toString() === mid)) {
        wishlist.products.push(oid);
      }
    }

    await wishlist.save();
    console.log(
      `[Wishlist] Product saved to MongoDB wishlist for user: ${req.user.email} productKey=${productKey}`
    );

    return res.status(201).json({
      success: true,
      inWishlist: true,
      alreadyExists: false,
      message: "Added to wishlist",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Remove from wishlist by Mongo id (path) or productKey (path, URL-encoded)
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    console.log(
      `[Wishlist] User Authenticated: ${req.user.email} (Role: ${req.user.role})`
    );
    const raw = req.params.productId;
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ success: false, message: "Missing product identifier" });
    }

    let productKey;
    const decoded = decodeURIComponent(raw);
    if (isValidProductId(decoded) && decoded.length === 24) {
      productKey = mongoKey(decoded);
    } else {
      productKey = trimStr(decoded, 500);
      if (!productKey || productKey.length < 3) {
        return res.status(400).json({ success: false, message: "Invalid product key" });
      }
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      console.log(`[Wishlist] Remove: no wishlist document for ${req.user.email}`);
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    console.log(`[Wishlist] Remove Request: productKey=${productKey} user=${req.user.email}`);

    if (!isInWishlist(wishlist, productKey)) {
      return res.status(200).json({
        success: true,
        removed: false,
        message: "Item was not in wishlist",
      });
    }

    const mid = productKey.startsWith("mongo:") ? productKey.slice(6) : null;
    wishlist.items = (wishlist.items || []).filter((i) => {
      if (i.productKey === productKey) return false;
      if (mid && i.productRef && i.productRef.toString() === mid) return false;
      if (mid && i.productId && String(i.productId) === mid) return false;
      return true;
    });
    if (productKey.startsWith("mongo:")) {
      wishlist.products = (wishlist.products || []).filter((id) => id.toString() !== mid);
    }

    await wishlist.save();
    console.log(
      `[Wishlist] Wishlist removed from DB for user: ${req.user.email} productKey=${productKey}`
    );

    return res.status(200).json({
      success: true,
      removed: true,
      message: "Removed from wishlist",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Toggle wishlist: Mongo product via productId, or snapshot item for static/catalog
// @route   POST /api/wishlist/toggle
// @access  Private
const toggleWishlist = async (req, res) => {
  try {
    console.log(
      `[Wishlist] Toggle request for ${req.user.email} (Role: ${req.user.role})`
    );
    const resolved = await resolveWishlistItemFromRequest(req.body);
    if (resolved.error) {
      return res.status(resolved.error.status).json({
        success: false,
        message: resolved.error.message,
      });
    }

    const { productKey, source, productRef, snapshot, productType } = resolved;
    console.log(`[Wishlist] Toggle productKey=${productKey}`);

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [],
        items: [],
      });
    }

    wishlist.items = wishlist.items || [];
    wishlist.products = wishlist.products || [];

    const wasInWishlist = wishlistContainsResolvedItem(wishlist, { productKey, productRef });

    if (wasInWishlist) {
      const mid = productKey.startsWith("mongo:") ? productKey.slice(6) : null;
      wishlist.items = (wishlist.items || []).filter((i) => {
        if (i.productKey === productKey) return false;
        if (mid && i.productRef && i.productRef.toString() === mid) return false;
        if (mid && i.productId && String(i.productId) === mid) return false;
        return true;
      });
      if (productKey.startsWith("mongo:")) {
        wishlist.products = wishlist.products.filter((id) => id.toString() !== mid);
      }
    } else {
      const itemDoc = buildWishlistItemDocument({
        productKey,
        source,
        productRef,
        snapshot,
        productType,
      });
      console.log("[Wishlist] Saving item to MongoDB:", {
        productId: itemDoc.productId,
        name: itemDoc.name,
        price: itemDoc.price,
        image: itemDoc.image,
        stock: itemDoc.stock,
        slug: itemDoc.slug,
        productType: itemDoc.productType,
      });
      wishlist.items.push(itemDoc);
      if (productKey.startsWith("mongo:")) {
        const mid = productKey.slice(6);
        const oid = new mongoose.Types.ObjectId(mid);
        if (!wishlist.products.some((id) => id.toString() === mid)) {
          wishlist.products.push(oid);
        }
      }
    }

    await wishlist.save();
    console.log(
      `[Wishlist] Toggle saved in MongoDB for ${req.user.email}: inWishlist=${!wasInWishlist}`
    );

    res.status(200).json({
      success: true,
      inWishlist: !wasInWishlist,
      message: !wasInWishlist ? "Added to wishlist" : "Removed from wishlist",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

/**
 * Latest wishlist activity per document: max(item.addedAt, document updatedAt).
 */
function computeLastActivityTimestampMs(wishlistDoc, enrichedItems) {
  let max = 0;
  if (wishlistDoc.updatedAt) {
    const u = new Date(wishlistDoc.updatedAt).getTime();
    if (!Number.isNaN(u)) max = Math.max(max, u);
  }
  for (const it of enrichedItems || []) {
    if (it.addedAt) {
      const t = new Date(it.addedAt).getTime();
      if (!Number.isNaN(t)) max = Math.max(max, t);
    }
  }
  return max;
}

// @desc    Admin: all users' wishlists (enriched, grouped by user)
// @route   GET /api/admin/wishlists?sort=latest
// @access  Private / admin + super_admin
const getAdminWishlists = async (req, res) => {
  try {
    console.log(
      `[Wishlist Admin] GET /api/admin/wishlists by ${req.user.email} (Role: ${req.user.role})`
    );
    const sortLatest =
      typeof req.query.sort === "string" && req.query.sort.toLowerCase() === "latest";

    const rawWishlists = await Wishlist.find({})
      .populate("user", "name email role")
      .lean();

    const rows = [];
    for (const wl of rawWishlists) {
      if (!wl.user || !wl.user._id) {
        console.warn("[Wishlist Admin] Skipping wishlist without populated user:", wl._id);
        continue;
      }
      const { productIds, items } = await enrichWishlistDocument(wl);
      if (!items.length) {
        continue;
      }
      const lastMs = computeLastActivityTimestampMs(wl, items);
      rows.push({
        userId: wl.user._id.toString(),
        user: {
          id: wl.user._id.toString(),
          name: trimStr(wl.user.name || "", 200) || "User",
          email: trimStr(wl.user.email || "", 320),
          role: wl.user.role || "user",
        },
        wishlistId: wl._id.toString(),
        itemCount: items.length,
        lastActivityAt: lastMs ? new Date(lastMs).toISOString() : new Date().toISOString(),
        wishlistUpdatedAt: wl.updatedAt ? new Date(wl.updatedAt).toISOString() : undefined,
        createdAt: wl.createdAt ? new Date(wl.createdAt).toISOString() : undefined,
        productIds,
        items,
      });
    }

    if (sortLatest) {
      rows.sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );
    } else {
      rows.sort((a, b) =>
        (a.user.email || "").localeCompare(b.user.email || "", undefined, {
          sensitivity: "base",
        })
      );
    }

    console.log(
      `[Wishlist Admin] Returning ${rows.length} user wishlist(s) (sortLatest=${sortLatest})`
    );

    res.status(200).json({
      success: true,
      message: "Wishlists fetched",
      data: {
        users: rows,
      },
    });
  } catch (error) {
    console.error("[Wishlist Admin] Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

module.exports = {
  getWishlist,
  checkWishlistStatus,
  toggleWishlist,
  addToWishlist,
  removeFromWishlist,
  getAdminWishlists,
};
