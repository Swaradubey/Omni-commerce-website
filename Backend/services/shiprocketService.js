/**
 * Shiprocket API client (server-only). Credentials from env — never exposed to clients.
 * Docs: https://apiv2.shiprocket.in (auth, courier track, orders).
 */

const DEFAULT_BASE = "https://apiv2.shiprocket.in";

let tokenCache = {
  token: null,
  /** epoch ms when token should be considered expired */
  expiresAtMs: 0,
};

function getBaseUrl() {
  const raw = process.env.SHIPROCKET_BASE_URL;
  const base = (raw && String(raw).trim()) || DEFAULT_BASE;
  return base.replace(/\/$/, "");
}

function isShiprocketConfigured() {
  const email = process.env.SHIPROCKET_EMAIL && String(process.env.SHIPROCKET_EMAIL).trim();
  const password = process.env.SHIPROCKET_PASSWORD && String(process.env.SHIPROCKET_PASSWORD).trim();
  return !!(email && password);
}

/** Names of env vars missing for API login (never log values). */
function getMissingAuthEnvNames() {
  const missing = [];
  if (!process.env.SHIPROCKET_EMAIL || !String(process.env.SHIPROCKET_EMAIL).trim()) {
    missing.push("SHIPROCKET_EMAIL");
  }
  if (!process.env.SHIPROCKET_PASSWORD || !String(process.env.SHIPROCKET_PASSWORD).trim()) {
    missing.push("SHIPROCKET_PASSWORD");
  }
  return missing;
}

/**
 * Pickup nickname shown in Shiprocket → Settings → Pickup locations.
 * Adhoc shipment creation always sends exactly `"Home"` (product requirement); this helper is for logs/diagnostics only.
 */
function getPickupLocationNickname() {
  const raw = process.env.SHIPROCKET_PICKUP_LOCATION;
  return (raw && String(raw).trim()) || "Home";
}

/** Optional: warn if base URL unset (defaults are used). */
function getShiprocketEnvDiagnostics() {
  const missingAuth = getMissingAuthEnvNames();
  const baseSet = !!(process.env.SHIPROCKET_BASE_URL && String(process.env.SHIPROCKET_BASE_URL).trim());
  const pickupSet = !!(
    process.env.SHIPROCKET_PICKUP_LOCATION && String(process.env.SHIPROCKET_PICKUP_LOCATION).trim()
  );
  return {
    configuredForTracking: missingAuth.length === 0,
    missingAuthEnv: missingAuth,
    baseUrlSet: baseSet,
    pickupLocationSet: pickupSet,
    /** Adhoc API always uses `Home`. */
    effectivePickupNickname: getPickupLocationNickname(),
  };
}

function clearToken() {
  tokenCache = { token: null, expiresAtMs: 0 };
}

/** Redact PII for logs (never log passwords). */
function sanitizeShipmentBodyForLog(body) {
  if (!body || typeof body !== "object") return body;
  const b = { ...body };
  if (b.billing_phone) b.billing_phone = String(b.billing_phone).replace(/\d(?=\d{4})/g, "*");
  if (b.billing_email) {
    const e = String(b.billing_email);
    const at = e.indexOf("@");
    b.billing_email = at > 1 ? `${e[0]}***${e.slice(at)}` : "***";
  }
  return b;
}

/**
 * Sanitize and validate phone number for Shiprocket.
 * - Removes spaces, +, -, (, )
 * - Removes non-numeric characters
 * - Normalizes Indian numbers (removes 91/0 prefix, ensures 10 digits)
 * - Returns clean numeric string or empty string if invalid.
 */
function normalizePhoneNumber(phone, country = "India") {
  if (!phone) return "";
  
  // 1. Remove all non-numeric characters
  let clean = String(phone).replace(/\D/g, "");
  
  // 2. Reject known placeholder/demo numbers
  const placeholders = ["9999999999", "0000000000", "1234567890", "1111111111", "8888888888", "7777777777", "5555555555"];
  if (placeholders.includes(clean)) return "";
  
  // 3. Handle India specific normalization
  const isIndia = String(country).toLowerCase() === "india" || country === "IN";
  
  if (isIndia) {
    // If it starts with 91 and is 12 digits, strip the 91
    if (clean.length === 12 && clean.startsWith("91")) {
      clean = clean.slice(2);
    }
    // If it starts with 0 and is 11 digits, strip the 0
    else if (clean.length === 11 && clean.startsWith("0")) {
      clean = clean.slice(1);
    }
    
    // Check if it's a valid 10-digit mobile number
    // Indian mobile numbers typically start with 6, 7, 8, or 9
    if (clean.length === 10 && /^[6-9]/.test(clean)) {
      return clean;
    }
    
    // If it's 10 digits but starts with something else, we still check against placeholders
    // but generally Indian mobiles should match the prefix.
    // If it doesn't match the prefix and is India, we might want to be stricter.
    // However, to avoid breaking anything, let's keep it 10 digits.
    if (clean.length === 10) return clean;
    
    return ""; // India requires 10 digits
  }
  
  // 4. General fallback/International: Shiprocket prefers clean digits.
  // Validate standard length (10-15 digits).
  if (clean.length >= 10 && clean.length <= 15) {
    return clean;
  }
  
  return "";
}

async function shiprocketRequest(path, { method = "GET", body, token } = {}) {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

/**
 * Login and cache token until ~1 min before expiry (default 10 days if API omits ttl).
 */
async function getShiprocketToken() {
  if (!isShiprocketConfigured()) {
    const missing = getMissingAuthEnvNames();
    console.warn(
      `[Shiprocket] Auth skipped — missing env: ${missing.join(", ")}. Add them to Backend/.env and restart (credentials are never logged).`
    );
    const err = new Error("Shiprocket is not configured (missing SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD)");
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.token;
  }

  console.log(
    "[Shiprocket] Auth start — POST /v1/external/auth/login (no valid cached token; credentials not logged)"
  );

  const email = String(process.env.SHIPROCKET_EMAIL).trim();
  const password = String(process.env.SHIPROCKET_PASSWORD).trim();

  const { ok, status, json } = await shiprocketRequest("/v1/external/auth/login", {
    method: "POST",
    body: { email, password },
  });

  if (!ok || !json || !json.token) {
    clearToken();
    const msg =
      (json && (json.message || json.error || json.exception)) ||
      `Shiprocket auth failed (${status})`;
    console.error(
      `[Shiprocket] Auth failure — HTTP ${status} — ${typeof msg === "string" ? msg : JSON.stringify(msg).slice(0, 400)}`
    );
    console.error(
      `[Shiprocket] Auth failure raw JSON (truncated): ${JSON.stringify(json || {}).slice(0, 800)}`
    );
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.code = "AUTH_FAILED";
    err.status = status;
    err.shiprocketJson = json;
    throw err;
  }

  const ttlSec =
    typeof json.expires_in === "number" && json.expires_in > 0
      ? json.expires_in
      : 10 * 24 * 60 * 60; // 10 days (Shiprocket default per docs)

  tokenCache.token = json.token;
  tokenCache.expiresAtMs = now + ttlSec * 1000;
  console.log(
    `[Shiprocket] Auth succeeded — token cached (~${Math.round(ttlSec / 86400)}d TTL, credentials not logged)`
  );
  return tokenCache.token;
}

async function shiprocketAuthedRequest(path, options = {}) {
  let token = await getShiprocketToken();
  let { ok, status, json } = await shiprocketRequest(path, { ...options, token });
  if (status === 401) {
    clearToken();
    token = await getShiprocketToken();
    ({ ok, status, json } = await shiprocketRequest(path, { ...options, token }));
  }
  return { ok, status, json };
}

/**
 * True if value should be sent to Shiprocket courier track (not our TRK-* id, not order/tracking id mistaken for AWB).
 */
function isCourierTrackableAwb(awb, order) {
  const code = awb != null ? String(awb).trim() : "";
  if (!code) return false;
  if (/^TRK-/i.test(code)) return false;
  if (order && order.trackingId != null && String(order.trackingId).trim() === code) return false;
  if (order && order.orderId != null && String(order.orderId).trim() === code) return false;
  return true;
}

function awbSuffixForLog(code) {
  const s = code != null ? String(code).trim() : "";
  if (!s) return "(empty)";
  if (s.length <= 4) return "…" + s;
  return "…" + s.slice(-4);
}

/**
 * GET /v1/external/courier/track/awb/{awb}
 */
async function trackByAwb(awb) {
  const code = awb != null ? String(awb).trim() : "";
  if (!code) {
    const err = new Error("AWB is required");
    err.code = "INVALID_AWB";
    throw err;
  }
  console.log(
    `[Shiprocket] Tracking request — identifier=courier_awb suffix=${awbSuffixForLog(code)} len=${code.length}`
  );
  const encoded = encodeURIComponent(code);
  const { ok, status, json } = await shiprocketAuthedRequest(`/v1/external/courier/track/awb/${encoded}`, {
    method: "GET",
  });
  if (status === 404) {
    console.warn(
      `[Shiprocket] Tracking response — HTTP 404 AWB not found (courier track) suffix=${awbSuffixForLog(code)}`
    );
    return { ok: false, notFound: true, json: null, status };
  }
  if (!ok) {
    const msg =
      (json && (json.message || json.error || json.exception)) || `Track request failed (${status})`;
    console.warn(
      `[Shiprocket] Tracking response — HTTP ${status} suffix=${awbSuffixForLog(code)} msg=${typeof msg === "string" ? msg.slice(0, 200) : JSON.stringify(msg).slice(0, 200)}`
    );
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.code = "TRACK_FAILED";
    err.status = status;
    throw err;
  }
  console.log(
    `[Shiprocket] Tracking response — ok HTTP ${status} suffix=${awbSuffixForLog(code)} (payload keys: ${json && typeof json === "object" ? Object.keys(json).slice(0, 8).join(",") : "n/a"})`
  );
  return { ok: true, notFound: false, json, status };
}

/** Pick first non-empty string from object paths */
function pickString(obj, keys) {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

/** Best-effort EDD from Shiprocket tracking JSON (ISO string or ""). */
function parseEstimatedDeliveryIso(td, apiJson) {
  const raw =
    pickString(td || {}, [
      "edd",
      "etd",
      "expected_delivery_date",
      "delivery_date",
      "promised_delivery_date",
      "courier_edd",
      "edd_f",
      "edd_s",
    ]) || pickString(apiJson || {}, ["edd", "etd", "expected_delivery_date"]);
  if (!raw) return "";
  const normalized = raw.replace(/^(\d{1,2})-(\d{1,2})-(\d{4})/, "$2/$1/$3");
  let d = new Date(normalized);
  if (Number.isNaN(d.getTime())) d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/**
 * Map Shiprocket tracking payload to timeline rows + UI hints.
 */
function normalizeTrackingPayload(apiJson) {
  const td =
    apiJson &&
    apiJson.tracking_data &&
    typeof apiJson.tracking_data === "object"
      ? apiJson.tracking_data
      : apiJson && apiJson.data && apiJson.data.tracking_data
        ? apiJson.data.tracking_data
        : null;

  if (!td) {
    return {
      courierName: "",
      awbCode: "",
      trackingUrl: "",
      shipmentStatus: "",
      scanEvents: [],
      estimatedDeliveryIso: parseEstimatedDeliveryIso(null, apiJson),
      raw: apiJson,
    };
  }

  const courierName =
    pickString(td, ["courier_name", "courierName"]) ||
    pickString(apiJson, ["courier_name"]) ||
    "";

  const awbCode = pickString(td, ["awb_code", "awb"]) || "";

  const trackingUrl =
    pickString(td, ["track_url", "tracking_url", "trackingUrl"]) ||
    pickString(apiJson, ["track_url", "tracking_url"]) ||
    "";

  const shipmentStatus = String(
    td.shipment_status || td.current_status || td.track_status || ""
  ).trim();

  const rawTrack = Array.isArray(td.shipment_track)
    ? td.shipment_track
    : Array.isArray(td.scan_detail)
      ? td.scan_detail
      : [];

  const scanEvents = rawTrack
    .map((row, idx) => {
      const activity =
        pickString(row, ["activity", "status", "sr-status", "sr_status"]) ||
        pickString(row, ["location"]) ||
        "Update";
      const dateStr = pickString(row, ["date", "timestamp", "created_at"]);
      let at = dateStr ? new Date(dateStr.replace(/-/g, "/")) : null;
      if (!at || Number.isNaN(at.getTime())) at = new Date();
      return {
        stage: null,
        label: activity,
        message: pickString(row, ["location", "city", "remarks"]) || activity,
        at: at.toISOString(),
        sortKey: at.getTime() + idx * 0.001,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...rest }) => rest);

  let shippedAtIso = "";
  let deliveredAtIso = "";

  for (const ev of scanEvents) {
    const stage = inferStageFromText(`${ev.label} ${ev.message}`);
    if (stage === 4 && !shippedAtIso) {
      shippedAtIso = ev.at;
    }
    if (stage === 6 && !deliveredAtIso) {
      deliveredAtIso = ev.at;
    }
  }

  return {
    courierName,
    awbCode,
    trackingUrl,
    shipmentStatus,
    scanEvents,
    estimatedDeliveryIso: parseEstimatedDeliveryIso(td, apiJson),
    shippedAtIso,
    deliveredAtIso,
    raw: apiJson,
  };
}

const STATUS_KEYWORDS = [
  { re: /delivered|delivery completed|handed|pod/i, stage: 6 },
  { re: /out for delivery|ofd|out_for_delivery/i, stage: 5 },
  { re: /in transit|dispatched|picked up|pickup|shipped|manifest|in-transit/i, stage: 4 },
  { re: /packed|processing|ready to ship|manifested/i, stage: 3 },
  { re: /confirmed|order confirmed/i, stage: 2 },
  { re: /cancelled|canceled|rto|return/i, stage: 0 },
];

function inferStageFromText(text) {
  if (!text) return null;
  const s = String(text);
  for (const { re, stage } of STATUS_KEYWORDS) {
    if (re.test(s)) return stage;
  }
  return null;
}

/**
 * Build 6-step timeline for storefront; uses Shiprocket scans when possible.
 */
function buildStagesFromNormalized(normalized) {
  const labels = [
    "Order Placed",
    "Confirmed",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];

  let maxStage = 1;
  const texts = [
    normalized.shipmentStatus,
    ...normalized.scanEvents.map((e) => `${e.label} ${e.message || ""}`),
  ].filter(Boolean);

  for (const t of texts) {
    const st = inferStageFromText(t);
    if (st === 0) {
      return {
        stages: labels.map((label, i) => ({
          step: i + 1,
          label,
          status: "pending",
        })),
        currentStageResolved: 1,
        trackingStatusResolved: "Cancelled / Returned",
        isCancelledCourier: true,
      };
    }
    if (st != null && st > maxStage) maxStage = st;
  }

  maxStage = Math.min(6, Math.max(1, maxStage));

  const stages = labels.map((label, i) => {
    const step = i + 1;
    let status;
    if (step < maxStage) status = "complete";
    else if (step === maxStage) status = "current";
    else status = "pending";
    return { step, label, status };
  });

  const trackingStatusResolved =
    maxStage >= 6
      ? "Delivered"
      : normalized.shipmentStatus || labels[maxStage - 1] || "Processing";

  return {
    stages,
    currentStageResolved: maxStage,
    trackingStatusResolved,
    isCancelledCourier: false,
  };
}

/**
 * True if this order already has a Shiprocket shipment reference (prevents duplicate create/adhoc).
 */
function orderAlreadyHasShipment(order) {
  if (!order || typeof order !== "object") return false;
  const awb = order.awbCode != null && String(order.awbCode).trim();
  if (awb) return true;
  const sid = order.shiprocketShipmentId != null && String(order.shiprocketShipmentId).trim();
  if (sid) return true;
  const oid = order.shiprocketOrderId != null && String(order.shiprocketOrderId).trim();
  if (oid) return true;
  return false;
}

/**
 * POST /v1/external/orders/create/adhoc — minimal payload from internal Order doc.
 * Pickup nickname: env SHIPROCKET_PICKUP_LOCATION or default `Home` (must exist in Shiprocket).
 */
async function createAdhocShipmentFromOrder(order) {
  if (!isShiprocketConfigured()) {
    const err = new Error("Shiprocket is not configured");
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  if (orderAlreadyHasShipment(order)) {
    console.log(
      `[Shiprocket] Duplicate shipment skip — orderId=${order.orderId || order._id} (AWB or Shiprocket ids already set)`
    );
    return {
      awbCode: order.awbCode != null ? String(order.awbCode).trim() : "",
      courierName: order.courierName != null ? String(order.courierName).trim() : "",
      shiprocketShipmentId: order.shiprocketShipmentId != null ? String(order.shiprocketShipmentId).trim() : "",
      shiprocketOrderId: order.shiprocketOrderId != null ? String(order.shiprocketOrderId).trim() : "",
      trackingUrl: order.trackingUrl != null ? String(order.trackingUrl).trim() : "",
      shipmentResponse: order.shiprocketRawResponse || order.shipmentResponse,
      trackingStatus: order.trackingStatus != null ? String(order.trackingStatus).trim() : "",
      duplicateSkipped: true,
      awbAssignErrorMessage: undefined,
      awbAssignErrorJson: undefined,
    };
  }

  /** Must match a pickup location nickname in Shiprocket (e.g. env "Home" or "Primary"). */
  const pickup = getPickupLocationNickname();

  const ship = order.shippingAddress && typeof order.shippingAddress === "object" ? order.shippingAddress : {};
  const pin = String(ship.zipCode || ship.pincode || "").trim() || "000000";
  const city = String(ship.city || "").trim() || "N/A";
  const state = String(ship.state || "").trim() || "N/A";
  const country = String(ship.country || "India").trim();
  let address = String(ship.address || "").trim() || "Address on file";
  /** Shiprocket rejects billing_address shorter than 3 characters combined with address line 2. */
  if (address.length < 3) {
    address = `${address} — delivery`.trim().slice(0, 500);
  }
  const name = String(ship.fullName || order.customerName || "Customer").trim();
  
  // Sanitize phone using helper
  const rawPhone = ship.phone || "";
  const phone = normalizePhoneNumber(rawPhone, country);

  // Validation before API call
  if (!phone) {
    const msg = rawPhone 
      ? `Invalid billing phone number format: "${rawPhone}". Shiprocket requires a valid 10-digit numeric mobile number.`
      : `Missing billing phone number. Shiprocket requires a valid 10-digit numeric mobile number.`;
    console.error(`[Shiprocket] Validation failed for orderId=${order.orderId || order._id}: ${msg}`);
    
    const err = new Error(msg);
    err.code = "VALIDATION_FAILED";
    err.status = 400;
    throw err;
  }

  const email =
    String(ship.email || order.customerEmail || process.env.SHIPROCKET_EMAIL || "").trim() ||
    "noreply@example.com";

  if (!String(ship.zipCode || ship.pincode || "").trim() || pin === "000000") {
    console.warn(
      `[Shiprocket] Missing or placeholder pincode for orderId=${order.orderId || order._id} — using "${pin}" (verify address data)`
    );
  }

  const defaultW = parseFloat(String(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || "0.5"), 10) || 0.5;
  const dim = parseFloat(String(process.env.SHIPROCKET_DEFAULT_DIMENSION_CM || "10"), 10) || 10;

  const items = Array.isArray(order.items) ? order.items : [];
  const totalUnits = items.reduce((acc, it) => acc + Math.max(1, Number(it.quantity) || 1), 0);
  const weight = Math.min(50, Math.max(defaultW, defaultW * Math.max(1, totalUnits || 1)));

  const orderItems = items.map((it, i) => ({
    name: String(it.name || `Item ${i + 1}`).slice(0, 200),
    sku: String(it.productId || `SKU-${i + 1}`).slice(0, 100),
    units: Math.max(1, Number(it.quantity) || 1),
    selling_price: Number(it.price) || 0,
  }));

  if (orderItems.length === 0) {
    console.warn(`[Shiprocket] No line items on order ${order.orderId || order._id} — using single fallback row`);
    orderItems.push({
      name: "Order",
      sku: String(order.orderId || "ITEM-1"),
      units: 1,
      selling_price: Number(order.totalPrice) || 0,
    });
  }

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toISOString().replace("T", " ").slice(0, 19)
    : new Date().toISOString().replace("T", " ").slice(0, 19);

  const paymentMethod = String(order.paymentMethod || "").toLowerCase().includes("cod") ? "COD" : "Prepaid";

  const body = {
    order_id: String(order.orderId || order._id).slice(0, 50),
    order_date: orderDate,
    pickup_location: pickup, // nickname in Shiprocket (default `Home`)
    billing_customer_name: name,
    billing_last_name: ".",
    billing_address: address,
    billing_city: city,
    billing_pincode: pin,
    billing_state: state,
    billing_country: country,
    billing_email: email,
    billing_phone: phone,
    shipping_is_billing: 1,
    order_items: orderItems,
    payment_method: paymentMethod,
    sub_total: Number(order.totalPrice) || 0,
    length: dim,
    breadth: dim,
    height: dim,
    weight,
  };

  const internalOrderId = String(order.orderId || order._id || "");
  const pinMask =
    pin.length >= 4 ? `${"*".repeat(Math.min(6, pin.length - 3))}${pin.slice(-3)}` : "(short)";
  console.log(
    `[Shiprocket] Shipment create start — order_id=${internalOrderId} pickup_location="${pickup}" items=${orderItems.length} payment=${paymentMethod} weight_kg=${weight} pin=${pinMask}`
  );
  console.log(
    `[Shiprocket] Shipment create payload (sanitized): ${JSON.stringify(sanitizeShipmentBodyForLog(body)).slice(0, 3500)}`
  );

  const { ok, status, json } = await shiprocketAuthedRequest("/v1/external/orders/create/adhoc", {
    method: "POST",
    body,
  });

  console.log(
    `[Shiprocket] Shipment create HTTP — order_id=${internalOrderId} status=${status} ok=${ok} body=${JSON.stringify(json || {}).slice(0, 2500)}`
  );

  if (!ok) {
    const msg =
      (json && (json.message || json.errors || json.error)) || `Create shipment failed (${status})`;
    console.error(
      `[Shiprocket] Shipment create failed — order_id=${internalOrderId} HTTP ${status}:`,
      typeof msg === "string" ? msg.slice(0, 500) : JSON.stringify(msg).slice(0, 500)
    );
    console.error(`[Shiprocket] Shipment create error JSON (truncated): ${JSON.stringify(json || {}).slice(0, 1500)}`);
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.code = "CREATE_FAILED";
    err.status = status;
    err.shiprocketJson = json;
    throw err;
  }

  const root = json || {};
  const rootShipmentId =
    root.shipment_id != null
      ? root.shipment_id
      : root.payload && root.payload.shipment_id != null
        ? root.payload.shipment_id
        : root.data && root.data.shipment_id != null
          ? root.data.shipment_id
          : null;
  const rootSrOrderId =
    root.order_id != null
      ? root.order_id
      : root.payload && root.payload.order_id != null
        ? root.payload.order_id
        : root.data && root.data.order_id != null
          ? root.data.order_id
          : null;
  if (rootShipmentId == null && rootSrOrderId == null) {
    const msg =
      (root.message && String(root.message)) ||
      "Shiprocket returned HTTP 200 but no shipment_id/order_id (unexpected body)";
    console.error(
      `[Shiprocket] Shipment create invalid body — order_id=${internalOrderId}:`,
      JSON.stringify(root).slice(0, 1200)
    );
    const err = new Error(msg);
    err.code = "CREATE_INVALID_RESPONSE";
    err.status = status;
    err.shiprocketJson = root;
    throw err;
  }
  const payload = root.payload != null ? root.payload : root.data != null ? root.data : root;
  let awb =
    pickString(payload || {}, ["awb_code", "awb", "airway_bill_number", "awb_no"]) ||
    pickString(root || {}, ["awb_code", "awb", "airway_bill_number"]) ||
    (payload &&
    typeof payload.response === "object" &&
    payload.response != null &&
    pickString(payload.response, ["awb_code", "awb", "airway_bill_number"]));
  let courier =
    pickString(payload || {}, ["courier_name", "courier", "assigned_courier"]) ||
    pickString(root || {}, ["courier_name"]);
  let shipmentId =
    (payload && payload.shipment_id != null ? String(payload.shipment_id) : "") ||
    (root.shipment_id != null ? String(root.shipment_id) : "") ||
    pickString(payload || {}, ["shipment_id"]);
  let srOrderId =
    payload && payload.order_id != null && String(payload.order_id).trim()
      ? String(payload.order_id)
      : root.order_id != null && String(root.order_id).trim()
        ? String(root.order_id)
        : "";

  /** Shiprocket often omits AWB on adhoc until courier is assigned — call assign AWB. */
  const shipmentIdNum = shipmentId ? Number(String(shipmentId).replace(/\D/g, "")) : NaN;
  let awbAssignErrorMessage = "";
  let awbAssignErrorJson = null;
  if (!awb && Number.isFinite(shipmentIdNum) && shipmentIdNum > 0) {
    console.log(
      `[Shiprocket] AWB missing after adhoc — calling assign/awb for shipment_id=${shipmentIdNum} order_id=${internalOrderId}`
    );
    try {
      const assignRes = await shiprocketAuthedRequest("/v1/external/courier/assign/awb", {
        method: "POST",
        body: { shipment_id: shipmentIdNum },
      });
      console.log(
        `[Shiprocket] AWB assign HTTP — shipment_id=${shipmentIdNum} status=${assignRes.status} ok=${assignRes.ok} body=${JSON.stringify(assignRes.json || {}).slice(0, 2000)}`
      );
      if (assignRes.ok && assignRes.json) {
        const aj = assignRes.json;
        const assignPayload = aj.payload != null ? aj.payload : aj.response != null ? aj.response : aj.data != null ? aj.data : aj;
        const nestedResp =
          assignPayload &&
          typeof assignPayload === "object" &&
          assignPayload.response &&
          typeof assignPayload.response === "object"
            ? assignPayload.response
            : null;
        const newAwb =
          pickString(assignPayload || {}, ["awb_code", "awb", "airway_bill_number", "awb_no"]) ||
          pickString(nestedResp || {}, ["awb_code", "awb", "airway_bill_number"]) ||
          pickString(aj || {}, ["awb_code"]);
        const newCourier =
          pickString(assignPayload || {}, ["courier_name", "courier"]) ||
          pickString(nestedResp || {}, ["courier_name", "courier"]) ||
          pickString(aj || {}, ["courier_name"]);
        if (newAwb) awb = newAwb;
        if (newCourier) courier = newCourier;
        if (!newAwb && (aj.message || aj.errors)) {
          awbAssignErrorJson = aj;
          awbAssignErrorMessage =
            typeof aj.message === "string"
              ? aj.message
              : typeof aj.errors === "string"
                ? aj.errors
                : JSON.stringify(aj.message || aj.errors || aj).slice(0, 500);
          console.error(
            `[Shiprocket] AWB assign returned no AWB — shipment_id=${shipmentIdNum}:`,
            awbAssignErrorMessage.slice(0, 400)
          );
        }
      } else {
        const aj = assignRes.json || {};
        awbAssignErrorJson = aj;
        const amsg =
          (aj && (aj.message || aj.errors)) || `assign/awb failed (${assignRes.status})`;
        awbAssignErrorMessage = typeof amsg === "string" ? amsg : JSON.stringify(amsg).slice(0, 500);
        console.error(
          `[Shiprocket] AWB assign failed — shipment_id=${shipmentIdNum} HTTP ${assignRes.status}:`,
          awbAssignErrorMessage.slice(0, 500)
        );
        console.error(
          `[Shiprocket] AWB assign exact error JSON (truncated): ${JSON.stringify(aj).slice(0, 1500)}`
        );
      }
    } catch (assignErr) {
      awbAssignErrorMessage = assignErr.message || String(assignErr);
      console.error(
        `[Shiprocket] AWB assign exception — shipment_id=${shipmentIdNum}:`,
        assignErr.message || assignErr
      );
    }
  }

  const trackingUrl =
    pickString(payload || {}, ["track_url", "tracking_url", "Courier Tracking Link", "tracking_link"]) ||
    pickString(root || {}, ["track_url", "tracking_url"]) ||
    "";
  const trackingStatus =
    pickString(payload || {}, ["status", "shipment_status", "current_status"]) ||
    pickString(root || {}, ["status"]) ||
    "";

  if (awb && order && !isCourierTrackableAwb(awb, order)) {
    console.warn(
      `[Shiprocket] Parsed awb looks like internal id, not using — order_id=${internalOrderId} suffix=${awbSuffixForLog(awb)}`
    );
    awb = "";
  }

  console.log(
    `[Shiprocket] Shipment create response summary — order_id=${internalOrderId} shipment_id=${shipmentId || "—"} sr_order_id=${srOrderId || "—"} awb=${awb ? "present" : "still_pending"} courier=${courier ? String(courier).slice(0, 40) : "—"}`
  );
  if (awb) {
    console.log(`[Shiprocket] awbCode from Shiprocket (will persist if order save succeeds) suffix=${awbSuffixForLog(awb)}`);
  } else if (shipmentId || srOrderId) {
    console.log(
      `[Shiprocket] awbCode not returned yet — shipment_id=${shipmentId || "—"} sr_order_id=${srOrderId || "—"} (DB may store ids without AWB until assigned)`
    );
  }

  return {
    awbCode: awb,
    courierName: courier,
    shiprocketShipmentId: shipmentId,
    shiprocketOrderId: srOrderId,
    trackingUrl,
    shipmentResponse: root,
    trackingStatus,
    /** When assign/awb fails (e.g. KYC), courier track will not work until resolved. */
    awbAssignErrorMessage: awbAssignErrorMessage || undefined,
    awbAssignErrorJson: awbAssignErrorJson || undefined,
  };
}

/**
 * GET /v1/external/orders/show/{id} — refresh AWB when DB has Shiprocket id but AWB was not stored yet.
 */
async function tryRefreshAwbFromShiprocket(order) {
  if (!isShiprocketConfigured() || !order || typeof order !== "object") return null;
  const oid = order.shiprocketOrderId != null && String(order.shiprocketOrderId).trim();
  if (!oid || !/^\d+$/.test(oid)) return null;
  try {
    const { ok, status, json } = await shiprocketAuthedRequest(`/v1/external/orders/show/${oid}`, {
      method: "GET",
    });
    if (!ok || !json) {
      console.warn(`[Shiprocket] orders/show failed — id=${oid} HTTP ${status}`);
      return null;
    }
    const data = json.data != null ? json.data : json.payload != null ? json.payload : json;
    const shipments = Array.isArray(data.shipments) ? data.shipments : [];
    let awb = "";
    let courier = "";
    for (const s of shipments) {
      awb = pickString(s || {}, ["awb", "awb_code"]) || awb;
      courier = pickString(s || {}, ["courier", "courier_name"]) || courier;
      if (awb) break;
    }
    if (!awb) awb = pickString(data || {}, ["awb_code", "awb"]);
    if (!courier) courier = pickString(data || {}, ["courier_name"]);
    if (awb) {
      console.log(`[Shiprocket] Refreshed AWB from orders/show — order_id=${order.orderId} sr_order=${oid}`);
      return { awbCode: awb, courierName: courier || undefined };
    }
  } catch (e) {
    console.warn(`[Shiprocket] tryRefreshAwbFromShiprocket:`, e.message || e);
  }
  return null;
}

module.exports = {
  isShiprocketConfigured,
  getShiprocketToken,
  getMissingAuthEnvNames,
  getShiprocketEnvDiagnostics,
  getPickupLocationNickname,
  normalizePhoneNumber,
  orderAlreadyHasShipment,
  isCourierTrackableAwb,
  trackByAwb,
  normalizeTrackingPayload,
  buildStagesFromNormalized,
  createAdhocShipmentFromOrder,
  tryRefreshAwbFromShiprocket,
};
