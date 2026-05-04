const Order = require("../models/Order");
const User = require("../models/User");
const { 
  resolveClientId: resolveTenant, 
  buildScopeQuery, 
  applyScope 
} = require("../utils/tenantResolver");



/** Same storefront roles as adminCustomerController — denominator for conversion-style metrics. */
const CUSTOMER_ROLES = ["user", "customer"];

/**
 * Analytics order scope (website + POS):
 * - Headline `totalRevenue` / MoM trends: all orders in the month (unchanged), sum of `totalPrice`.
 * - `salesThisMonth`: subset treated as fulfilled / paid-intent (see salesThisMonthForWindow).
 * - Loss uses optional `refundAmount` + `refundedAt`, and `cancelledAt` + `totalPrice` when no refund recorded.
 */

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Calendar [start, end) for the month containing `ref`. */
function monthWindowContaining(ref) {
  const start = startOfMonth(ref);
  const end = addMonths(start, 1);
  return { start, end };
}

/** Previous calendar month window relative to `ref`. */
function previousMonthWindow(ref) {
  const thisStart = startOfMonth(ref);
  const prevEnd = thisStart;
  const prevStart = addMonths(thisStart, -1);
  return { start: prevStart, end: prevEnd };
}

function trendFromChange(pct) {
  if (pct == null || Number.isNaN(pct)) return "neutral";
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "neutral";
}

function pctChange(current, previous) {
  if (previous == null || Number.isNaN(previous) || previous === 0) {
    if (current == null || Number.isNaN(current) || current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Conversion rate (no visit/session collection in this project):
 * (distinct registered customers who placed at least one order in the window with `user` set) /
 * (total registered storefront accounts) * 100.
 * Guest checkout and walk-in POS without a linked User are excluded from the numerator so the rate stays bounded
 * against the registered-customer denominator.
 */
async function conversionRateForWindow(start, end, scopeQuery) {
  const userQuery = { role: { $in: CUSTOMER_ROLES } };
  applyScope(userQuery, scopeQuery);
  const registered = await User.countDocuments(userQuery);
  if (registered === 0) return { rate: 0, registered };

  const orderQuery = {
    createdAt: { $gte: start, $lt: end },
    user: { $exists: true, $ne: null },
  };
  applyScope(orderQuery, scopeQuery);

  const withUser = await Order.distinct("user", orderQuery);
  const purchasers = withUser.filter((id) => id != null).length;
  const rate = Math.min(100, (purchasers / registered) * 100);
  return { rate, registered, purchasers };
}

async function orderTotalsForWindow(start, end, scopeQuery) {
  // Only include paid or POS orders for revenue as per requirement "only paid/completed"
  const match = {
    createdAt: { $gte: start, $lt: end },
    $or: [
      { isPaid: true },
      { orderSource: "pos" },
      { paymentStatus: "paid" },
      { orderStatus: { $in: ["delivered", "completed", "shipped"] } }
    ]
  };
  applyScope(match, scopeQuery);

  const [agg] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        revenue: { $sum: { $ifNull: ["$totalPrice", 0] } },
      },
    },
  ]);
  const orderCount = agg?.orderCount ?? 0;
  const revenue = agg?.revenue ?? 0;
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
  return { orderCount, revenue, avgOrderValue };
}

const FULFILLED_STATUS_LOWER = [
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

/**
 * Sales this month: sum(totalPrice) for orders placed in [start,end) that are not cancelled
 * and match at least one “successful sale” signal (paid, POS, delivered, stage ≥ 2, or fulfilled status).
 */
/**
 * Sales this month: sum(totalPrice) for ALL orders placed in [start,end) regardless of status
 * (matches requirement "SALES THIS MONTH: orders in current month").
 */
async function salesThisMonthForWindow(start, end, scopeQuery) {
  const match = {
    createdAt: { $gte: start, $lt: end },
  };
  applyScope(match, scopeQuery);
  const [agg] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        sales: { $sum: { $ifNull: ["$totalPrice", 0] } },
      },
    },
  ]);
  return agg?.sales ?? 0;
}

/** Refunds recorded in the window (by refundedAt). */
async function lossFromRefundsForWindow(start, end, scopeQuery) {
  const match = {
    refundAmount: { $gt: 0 },
    refundedAt: { $gte: start, $lt: end },
  };
  applyScope(match, scopeQuery);
  const [agg] = await Order.aggregate([
    {
      $match: match,
    },
    { $group: { _id: null, t: { $sum: "$refundAmount" } } },
  ]);
  return agg?.t ?? 0;
}

/**
 * Cancellations in the window: sum(totalPrice) when no refund amount is stored (avoids double-count with refund loss).
 */
async function lossFromCancellationsForWindow(start, end, scopeQuery) {
  const match = {
    cancelledAt: { $gte: start, $lt: end },
    $or: [{ refundAmount: { $exists: false } }, { refundAmount: null }, { refundAmount: 0 }],
  };
  applyScope(match, scopeQuery);
  const [agg] = await Order.aggregate([
    {
      $match: match,
    },
    { $group: { _id: null, t: { $sum: { $ifNull: ["$totalPrice", 0] } } } },
  ]);
  return agg?.t ?? 0;
}

async function lossThisMonthForWindow(start, end, scopeQuery) {
  const [a, b] = await Promise.all([
    lossFromRefundsForWindow(start, end, scopeQuery),
    lossFromCancellationsForWindow(start, end, scopeQuery),
  ]);
  return a + b;
}

/**
 * Distinct "active ordering customers" in [start, end): same identity keys as conversion/CLV
 * (linked User id, else normalized customerEmail on the order). Orders with neither are excluded.
 */
async function activeOrderingCustomersCountForWindow(start, end, scopeQuery) {
  const match = { createdAt: { $gte: start, $lt: end } };
  applyScope(match, scopeQuery);
  const [agg] = await Order.aggregate([
    { $match: match },
    {
      $project: {
        payerKey: {
          $cond: {
            if: { $ne: [{ $ifNull: ["$user", null] }, null] },
            then: { $concat: ["uid:", { $toString: "$user" }] },
            else: {
              $cond: {
                if: { $gt: [{ $strLenCP: { $ifNull: ["$customerEmail", ""] } }, 0] },
                then: { $concat: ["em:", { $toLower: { $trim: { input: "$customerEmail" } } }] },
                else: null,
              },
            },
          },
        },
      },
    },
    { $match: { payerKey: { $ne: null } } },
    { $group: { _id: "$payerKey" } },
    { $count: "c" },
  ]);
  return agg?.c ?? 0;
}

/**
 * Customer lifetime value (all-time):
 * total revenue from valid orders / count of distinct paying identities (user id or normalized guest email on orders).
 */
async function customerLifetimeValueAllTime(scopeQuery) {
  const match = {};
  applyScope(match, scopeQuery);
  const [revAgg] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: { $ifNull: ["$totalPrice", 0] } },
      },
    },
  ]);
  const totalRevenue = revAgg?.revenue ?? 0;

  const keys = await Order.aggregate([
    { $match: match },
    {
      $project: {
        k: {
          $cond: {
            if: { $ne: [{ $ifNull: ["$user", null] }, null] },
            then: { $concat: ["uid:", { $toString: "$user" }] },
            else: {
              $cond: {
                if: { $gt: [{ $strLenCP: { $ifNull: ["$customerEmail", ""] } }, 0] },
                then: { $concat: ["em:", { $toLower: { $trim: { input: "$customerEmail" } } }] },
                else: null,
              },
            },
          },
        },
      },
    },
    { $match: { k: { $ne: null } } },
    { $group: { _id: "$k" } },
    { $count: "c" },
  ]);
  const distinctPayers = keys[0]?.c ?? 0;
  const clv = distinctPayers > 0 ? totalRevenue / distinctPayers : 0;
  return { customerLifetimeValue: clv, totalRevenue, distinctPayers };
}

/**
 * Sessions proxy (no PageView/Session model):
 * Count of registered storefront accounts with activity (lastActiveAt, lastLoginAt, or max of both) in [start, end).
 * Documented as "monthly active registered customers" rather than raw HTTP sessions.
 */
/** New storefront registrations (user/customer role) created in [start, end). */
async function newCustomersForWindow(start, end, scopeQuery) {
  const query = {
    role: { $in: CUSTOMER_ROLES },
    createdAt: { $gte: start, $lt: end },
  };
  applyScope(query, scopeQuery);
  return User.countDocuments(query);
}

async function monthlyActiveCustomers(start, end, scopeQuery) {
  const match = { role: { $in: CUSTOMER_ROLES } };
  applyScope(match, scopeQuery);
  const [agg] = await User.aggregate([
    { $match: match },
    {
      $addFields: {
        lastSeen: { $max: ["$lastActiveAt", "$lastLoginAt"] },
      },
    },
    {
      $match: {
        $or: [
          { lastActiveAt: { $gte: start, $lt: end } },
          { lastLoginAt: { $gte: start, $lt: end } },
          { lastSeen: { $gte: start, $lt: end } },
        ],
      },
    },
    { $count: "c" },
  ]);
  return agg?.c ?? 0;
}

/**
 * MoM trend for CLV: compares average revenue per distinct paying identity (user or email) within each calendar month.
 * This is not the lifetime CLV delta (that would need historical snapshots); it is documented as a revenue-intensity trend.
 */
async function monthlyRevenuePerPayer(start, end, scopeQuery) {
  const match = { createdAt: { $gte: start, $lt: end } };
  applyScope(match, scopeQuery);
  const rows = await Order.aggregate([
    { $match: match },
    {
      $project: {
        payerKey: {
          $cond: {
            if: { $ne: [{ $ifNull: ["$user", null] }, null] },
            then: { $concat: ["uid:", { $toString: "$user" }] },
            else: {
              $cond: {
                if: { $gt: [{ $strLenCP: { $ifNull: ["$customerEmail", ""] } }, 0] },
                then: { $concat: ["em:", { $toLower: { $trim: { input: "$customerEmail" } } }] },
                else: null,
              },
            },
          },
        },
        totalPrice: { $ifNull: ["$totalPrice", 0] },
      },
    },
    { $match: { payerKey: { $ne: null } } },
    {
      $group: {
        _id: "$payerKey",
        rev: { $sum: "$totalPrice" },
      },
    },
    {
      $group: {
        _id: null,
        payers: { $sum: 1 },
        revenue: { $sum: "$rev" },
      },
    },
  ]);
  const payers = rows[0]?.payers ?? 0;
  const revenue = rows[0]?.revenue ?? 0;
  return payers > 0 ? revenue / payers : 0;
}

/** Last 7 local days (including today): label + total revenue (website + POS). */
async function revenueFlowLast7Days(scopeQuery) {
  const now = new Date();
  const days = [];
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);
    const match = { createdAt: { $gte: day, $lt: next } };
    applyScope(match, scopeQuery);
    const [agg] = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          sales: { $sum: { $ifNull: ["$totalPrice", 0] } },
          orders: { $sum: 1 },
        },
      },
    ]);
    const sales = Math.round((agg?.sales ?? 0) * 100) / 100;
    const orders = agg?.orders ?? 0;
    days.push({
      name: short[day.getDay()],
      sales,
      orders,
      date: day.toISOString().slice(0, 10),
    });
  }
  return days;
}

const PIE_COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f43f5e"];

/**
 * Category revenue for orders in [start, end): join line items to Product when productId is a valid ObjectId.
 * Orders without resolvable category bucket as "Uncategorized".
 */
async function topCategoriesForWindow(start, end, scopeQuery, limit = 8) {
  const match = { createdAt: { $gte: start, $lt: end } };
  applyScope(match, scopeQuery);
  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: "$items" },
    {
      $addFields: {
        lineRevenue: {
          $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 0] }],
        },
        pidStr: { $toString: "$items.productId" },
      },
    },
    {
      $addFields: {
        pidForLookup: {
          $cond: {
            if: {
              $regexMatch: { input: "$pidStr", regex: /^[a-fA-F0-9]{24}$/ },
            },
            then: { $toObjectId: "$pidStr" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "pidForLookup",
        foreignField: "_id",
        as: "p",
      },
    },
    {
      $addFields: {
        categoryName: {
          $let: {
            vars: {
              categoryRaw: {
                $ifNull: [{ $arrayElemAt: ["$p.category", 0] }, ""],
              },
            },
            in: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $strLenCP: {
                        $trim: {
                          input: { $toString: "$$categoryRaw" },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: {
                  $trim: {
                    input: { $toString: "$$categoryRaw" },
                  },
                },
                else: "Uncategorized",
              },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: "$categoryName",
        value: { $sum: "$lineRevenue" },
      },
    },
    { $sort: { value: -1 } },
    { $limit: limit },
  ]);

  const total = rows.reduce((s, r) => s + (r.value || 0), 0);
  return rows.map((r, i) => {
    const value = Math.round((r.value || 0) * 100) / 100;
    const percent = total > 0 ? Math.round(((r.value || 0) / total) * 1000) / 10 : 0;
    return {
      name: r._id || "Uncategorized",
      value,
      percent,
      color: PIE_COLORS[i % PIE_COLORS.length],
    };
  });
}

/** Top products by line revenue in window; growth vs previous window of equal length. */
async function topProductsForWindow(start, end, scopeQuery, limit = 3) {
  const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  const prevEnd = start;

  const productLineStages = (windowStart, windowEnd) => {
    const match = { createdAt: { $gte: windowStart, $lt: windowEnd } };
    applyScope(match, scopeQuery);
    return [
      { $match: match },
      { $unwind: "$items" },
      {
        $addFields: {
          lineRevenue: {
            $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 0] }],
          },
          pidStr: { $toString: "$items.productId" },
        },
      },
      {
        $addFields: {
          pidForLookup: {
            $cond: {
              if: {
                $regexMatch: { input: "$pidStr", regex: /^[a-fA-F0-9]{24}$/ },
              },
              then: { $toObjectId: "$pidStr" },
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "pidForLookup",
          foreignField: "_id",
          as: "p",
        },
      },
      {
        $addFields: {
          productName: {
            $trim: {
              input: {
                $toString: {
                  $ifNull: [{ $arrayElemAt: ["$p.name", 0] }, { $ifNull: ["$items.name", "Product"] }],
                },
              },
            },
          },
          productImage: {
            $ifNull: [{ $arrayElemAt: ["$p.image", 0] }, { $ifNull: ["$items.image", ""] }],
          },
        },
      },
      {
        $group: {
          _id: "$pidStr",
          revenue: { $sum: "$lineRevenue" },
          name: { $first: "$productName" },
          image: { $first: "$productImage" },
        },
      },
    ];
  };

  const currentAgg = await Order.aggregate([
    ...productLineStages(start, end),
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);

  const prevAgg = await Order.aggregate([
    ...productLineStages(prevStart, prevEnd),
    { $sort: { revenue: -1 } },
  ]);
  const prevMap = Object.fromEntries(prevAgg.map((x) => [x._id, x.revenue]));

  return currentAgg.map((row) => {
    const prevRev = prevMap[row._id] ?? 0;
    let growthPercent = 0;
    if (prevRev > 0) growthPercent = ((row.revenue - prevRev) / prevRev) * 100;
    else if (row.revenue > 0) growthPercent = 100;
    return {
      name: row.name || "Product",
      sales: Math.round(row.revenue * 100) / 100,
      growthPercent: Math.round(growthPercent * 10) / 10,
      image: row.image || "",
    };
  });
}

// @desc    Admin dashboard analytics (summary, revenue flow, categories, top products)
// @route   GET /api/admin/analytics
// @access  Private / admin
const getAdminAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const resolvedClientId = await resolveTenant(req);
    const scopeQuery = buildScopeQuery(req.user, resolvedClientId);

    const isSuperAdmin = userRole === "super_admin";

    // Get total orders for debug log
    const debugQuery = Object.keys(scopeQuery).length > 0 ? scopeQuery : {};
    const totalOrdersFound = await Order.countDocuments(debugQuery);

    // Requirement 5: Add detailed debug logs
    console.log("ADMIN OVERVIEW DEBUG", {
      origin: req.headers.origin,
      host: req.headers.host,
      userId: req.user?._id,
      email: req.user?.email,
      role: req.user?.role,
      userClientId: req.user?.clientId,
      linkedClientId: req.user?.linkedClientId,
      headerClientId: req.headers["x-client-id"],
      resolvedClientId,
      scopeQuery,
      totalOrdersFound
    });

    console.log(`[adminAnalytics] getAdminAnalytics - Page: Analytics, Role: ${userRole}, Scope: ${JSON.stringify(scopeQuery)}`);

    const now = new Date();
    const cur = monthWindowContaining(now);
    const prev = previousMonthWindow(now);

    const [convCur, convPrev] = await Promise.all([
      conversionRateForWindow(cur.start, cur.end, scopeQuery),
      conversionRateForWindow(prev.start, prev.end, scopeQuery),
    ]);

    const [totCur, totPrev] = await Promise.all([
      orderTotalsForWindow(cur.start, cur.end, scopeQuery),
      orderTotalsForWindow(prev.start, prev.end, scopeQuery),
    ]);

    const clv = await customerLifetimeValueAllTime(scopeQuery);
    const [mrpCur, mrpPrev] = await Promise.all([
      monthlyRevenuePerPayer(cur.start, cur.end, scopeQuery),
      monthlyRevenuePerPayer(prev.start, prev.end, scopeQuery),
    ]);

    const [mauCur, mauPrev] = await Promise.all([
      monthlyActiveCustomers(cur.start, cur.end, scopeQuery),
      monthlyActiveCustomers(prev.start, prev.end, scopeQuery),
    ]);

    const [newCustCur, newCustPrev] = await Promise.all([
      newCustomersForWindow(cur.start, cur.end, scopeQuery),
      newCustomersForWindow(prev.start, prev.end, scopeQuery),
    ]);

    const [activeCustCur, activeCustPrev] = await Promise.all([
      activeOrderingCustomersCountForWindow(cur.start, cur.end, scopeQuery),
      activeOrderingCustomersCountForWindow(prev.start, prev.end, scopeQuery),
    ]);

    const [revenueFlow, topCategories, topProducts, salesThisMonthRaw, lossThisMonthRaw] =
      await Promise.all([
        revenueFlowLast7Days(scopeQuery),
        topCategoriesForWindow(cur.start, cur.end, scopeQuery),
        topProductsForWindow(cur.start, cur.end, scopeQuery, 3),
        salesThisMonthForWindow(cur.start, cur.end, scopeQuery),
        lossThisMonthForWindow(cur.start, cur.end, scopeQuery),
      ]);

    const salesThisMonth = Math.round(salesThisMonthRaw * 100) / 100;
    const lossThisMonth = Math.round(lossThisMonthRaw * 100) / 100;
    // PROFIT: use total revenue for now
    const profitThisMonth = Math.round(totCur.revenue * 100) / 100;

    const conversionRateChange = pctChange(convCur.rate, convPrev.rate);
    const avgOrderValueChange = pctChange(totCur.avgOrderValue, totPrev.avgOrderValue);
    const clvTrendChange = pctChange(mrpCur, mrpPrev);
    const sessionsChange = pctChange(mauCur, mauPrev);
    const totalRevenueChange = pctChange(totCur.revenue, totPrev.revenue);
    const orderCountChange = pctChange(totCur.orderCount, totPrev.orderCount);
    const newCustomersChange = pctChange(newCustCur, newCustPrev);
    const activeCustomersChange = pctChange(activeCustCur, activeCustPrev);

    const fullSummary = {
      totalRevenue: Math.round(totCur.revenue * 100) / 100,
      totalRevenueChange: Math.round(totalRevenueChange * 10) / 10,
      totalRevenueTrend: trendFromChange(totalRevenueChange),
      orderCount: totCur.orderCount,
      orderCountChange: Math.round(orderCountChange * 10) / 10,
      orderCountTrend: trendFromChange(orderCountChange),
      activeCustomers: activeCustCur,
      activeCustomersChange: Math.round(activeCustomersChange * 10) / 10,
      activeCustomersTrend: trendFromChange(activeCustomersChange),
      newCustomersThisMonth: newCustCur,
      newCustomersChange: Math.round(newCustomersChange * 10) / 10,
      newCustomersTrend: trendFromChange(newCustomersChange),
      conversionRate: Math.round(convCur.rate * 100) / 100,
      conversionRateChange: Math.round(conversionRateChange * 10) / 10,
      conversionRateTrend: trendFromChange(conversionRateChange),
      avgOrderValue: Math.round(totCur.avgOrderValue * 100) / 100,
      avgOrderValueChange: Math.round(avgOrderValueChange * 10) / 10,
      avgOrderValueTrend: trendFromChange(avgOrderValueChange),
      customerLifetimeValue: Math.round(clv.customerLifetimeValue * 100) / 100,
      customerLifetimeValueChange: Math.round(clvTrendChange * 10) / 10,
      customerLifetimeValueTrend: trendFromChange(clvTrendChange),
      sessions: mauCur,
      sessionsChange: Math.round(sessionsChange * 10) / 10,
      sessionsTrend: trendFromChange(sessionsChange),
      salesThisMonth,
      lossThisMonth,
      profitThisMonth,
      meta: {
        conversionNote:
          "Registered-customer conversion: share of storefront accounts (user/customer role) that placed at least one order this month with a linked User id. Guest and unlinked POS sales are excluded from the numerator.",
        sessionsNote:
          "Monthly active registered customers: count of customer-role users with lastActiveAt, lastLoginAt, or last seen in this calendar month (proxy for engagement; not raw HTTP session counts).",
        customerLifetimeValueNote:
          "Headline CLV = all-time total order revenue / distinct payers (user or guest email on orders). Month % change compares average monthly revenue per distinct payer vs last month (ARPB-style trend).",
        ordersIncluded:
          "All persisted orders (website and POS) in the orders collection; headline revenue uses totalPrice for the month.",
        totalRevenueNote:
          "Sum of totalPrice for orders placed in the current calendar month (website + POS).",
        salesThisMonthNote:
          "Subset of this month’s orders: not cancelled, and at least one of isPaid, POS (orderSource=pos), delivered, currentStage≥2, or fulfilled orderStatus (confirmed→delivered).",
        lossThisMonthNote:
          "Sum of refundAmount where refundedAt falls in this month, plus totalPrice for orders with cancelledAt in this month when refundAmount is absent or zero (no double-count).",
        profitThisMonthNote:
          "salesThisMonth − lossThisMonth (no product cost field in schema; COGS not applied).",
        orderCountNote:
          "Count of orders created in the current calendar month (same scope as total revenue).",
        activeCustomersNote:
          "Distinct customers who placed at least one order in the current calendar month: linked account (user id) or guest email on the order (same identity rules as conversion metrics). Orders with no user and no email are excluded.",
        newCustomersNote:
          "Count of new storefront accounts (user/customer role) registered in the current calendar month.",
      },
    };

    const periods = {
      summaryMonth: { start: cur.start.toISOString(), end: cur.end.toISOString() },
      previousMonth: { start: prev.start.toISOString(), end: prev.end.toISOString() },
    };

    const fullPayload = {
      analyticsScope: "full",
      summary: fullSummary,
      revenueFlow,
      topCategories,
      topProducts,
      periods,
    };

    if (isSuperAdmin) {
      return res.json({ success: true, data: fullPayload });
    }

    const operationalSummary = {
      totalRevenue: fullSummary.totalRevenue,
      totalRevenueChange: fullSummary.totalRevenueChange,
      totalRevenueTrend: fullSummary.totalRevenueTrend,
      orderCount: fullSummary.orderCount,
      orderCountChange: fullSummary.orderCountChange,
      orderCountTrend: fullSummary.orderCountTrend,
      avgOrderValue: fullSummary.avgOrderValue,
      avgOrderValueChange: fullSummary.avgOrderValueChange,
      avgOrderValueTrend: fullSummary.avgOrderValueTrend,
      salesThisMonth: fullSummary.salesThisMonth,
      lossThisMonth: fullSummary.lossThisMonth,
      profitThisMonth: fullSummary.profitThisMonth,
      meta: {
        operationalNote:
          "Conversion, sessions, new signups, and CLV are available to Super Admin only. This view is limited to revenue and order operations.",
      },
    };

    return res.json({
      success: true,
      data: {
        analyticsScope: "operational",
        summary: operationalSummary,
        revenueFlow,
        topCategories,
        topProducts,
        periods,
      },
    });
  } catch (error) {
    console.error("[adminAnalytics] getAdminAnalytics:", error.message);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

module.exports = {
  getAdminAnalytics,
};
