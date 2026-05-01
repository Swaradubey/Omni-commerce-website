const User = require("../models/User");
const { resolveClientId } = require("../utils/tenantResolver");


/** Registered storefront accounts included in customer analytics (excludes staff/admin). */
const CUSTOMER_ROLES = ["user", "customer"];

/**
 * "Active" = last activity within this many days (max of lastActiveAt, lastLoginAt).
 * Documented for admin dashboard consistency with list/status.
 */
const ACTIVE_WINDOW_DAYS = 30;

/** "Live" / currently active = activity within last 24 hours (summary field liveCustomers). */
const LIVE_WINDOW_HOURS = 24;

/**
 * Churn rate (admin summary):
 * Share of customer accounts with no qualifying activity in ACTIVE_WINDOW_DAYS.
 * Formula: (totalCustomers - activeMembers) / totalCustomers * 100 when totalCustomers > 0.
 * This is an engagement/churn proxy, not subscription cancellation data.
 */

function startOfCurrentMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function daysAgoMs(days) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// @desc    Customer KPIs for admin dashboard
// @route   GET /api/admin/customers/summary
// @access  Private / admin
const getCustomerSummary = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const clientId = await resolveClientId(req); 

    
    // Requirement 10 & 16: Log data retrieval details
    console.log(`[adminCustomer] getCustomerSummary - Page: Customers, Role: ${req.user?.role}, ClientId: ${clientId || "global"}`);

    const activeSince = new Date(daysAgoMs(ACTIVE_WINDOW_DAYS));
    const liveSince = new Date(Date.now() - LIVE_WINDOW_HOURS * 60 * 60 * 1000);
    const monthStart = startOfCurrentMonth();

    const baseMatch = { role: { $in: CUSTOMER_ROLES } };
    if (!isSuperAdmin && clientId) {
      baseMatch.clientId = clientId;
    }

    // Requirement 16: Log DB query details
    console.log(`[adminCustomer] DB Aggregate - Collection: users, Filter: ${JSON.stringify(baseMatch)}`);

    const [agg] = await User.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          lastSeen: { $max: ["$lastActiveAt", "$lastLoginAt"] },
        },
      },
      {
        $facet: {
          totals: [{ $count: "totalCustomers" }],
          active: [
            {
              $match: {
                $or: [
                  { lastActiveAt: { $gte: activeSince } },
                  { lastLoginAt: { $gte: activeSince } },
                  { lastSeen: { $gte: activeSince } },
                ],
              },
            },
            { $count: "activeMembers" },
          ],
          newMonth: [
            { $match: { createdAt: { $gte: monthStart } } },
            { $count: "newThisMonth" },
          ],
          live: [
            {
              $match: {
                $or: [
                  { lastActiveAt: { $gte: liveSince } },
                  { lastLoginAt: { $gte: liveSince } },
                  { lastSeen: { $gte: liveSince } },
                ],
              },
            },
            { $count: "liveCustomers" },
          ],
        },
      },
    ]);

    const totalCustomers = agg?.totals?.[0]?.totalCustomers ?? 0;
    const activeMembers = agg?.active?.[0]?.activeMembers ?? 0;
    const newThisMonth = agg?.newMonth?.[0]?.newThisMonth ?? 0;
    const liveCustomers = agg?.live?.[0]?.liveCustomers ?? 0;

    let churnRate = 0;
    if (totalCustomers > 0) {
      churnRate = ((totalCustomers - activeMembers) / totalCustomers) * 100;
    }

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeMembers,
        newThisMonth,
        churnRate: Math.round(churnRate * 10) / 10,
        liveCustomers,
        activeWindowDays: ACTIVE_WINDOW_DAYS,
        liveWindowHours: LIVE_WINDOW_HOURS,
      },
    });
  } catch (error) {
    console.error("[adminCustomer] getCustomerSummary:", error.message);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// @desc    Paginated customer directory with order totals
// @route   GET /api/admin/customers
// @access  Private / admin
const getCustomers = async (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.role === "super_admin";
    const clientId = await resolveClientId(req);


    // Requirement 10 & 16: Log data retrieval details
    console.log(`[adminCustomer] getCustomers - Page: Customers, Role: ${req.user?.role}, ClientId: ${clientId || "global"}`);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const statusFilter = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "all";

    const activeSince = new Date(daysAgoMs(ACTIVE_WINDOW_DAYS));

    const match = { role: { $in: CUSTOMER_ROLES } };
    if (!isSuperAdmin && clientId) {
      match.clientId = clientId;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      match.$or = [{ name: rx }, { email: rx }];
    }

    // Requirement 16: Log DB query details
    console.log(`[adminCustomer] DB Aggregate (List) - Collection: users, Filter: ${JSON.stringify(match)}`);

    /*
  .
     */
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "orders",
          let: {
            uid: "$_id",
            uemail: { $toLower: { $trim: { input: { $ifNull: ["$email", ""] } } } },
          },
          pipeline: [
            {
              $addFields: {
                _orderEmailNorm: {
                  $let: {
                    vars: {
                      ce: { $toLower: { $trim: { input: { $ifNull: ["$customerEmail", ""] } } } },
                      se: {
                        $toLower: {
                          $trim: { input: { $ifNull: ["$shippingAddress.email", ""] } },
                        },
                      },
                    },
                    in: {
                      $cond: [{ $gt: [{ $strLenCP: "$$ce" }, 0] }, "$$ce", "$$se"],
                    },
                  },
                },
                _hasLinkedUser: {
                  $ne: [{ $ifNull: ["$user", null] }, null],
                },
              },
            },
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$_hasLinkedUser", true] },
                        {
                          $or: [
                            { $eq: ["$user", "$$uid"] },
                            {
                              $eq: [{ $toString: "$user" }, { $toString: "$$uid" }],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$_hasLinkedUser", false] },
                        { $gt: [{ $strLenCP: "$_orderEmailNorm" }, 0] },
                        { $gt: [{ $strLenCP: "$$uemail" }, 0] },
                        { $eq: ["$_orderEmailNorm", "$$uemail"] },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                _itemQtySum: {
                  $cond: [
                    { $isArray: "$items" },
                    {
                      $reduce: {
                        input: "$items",
                        initialValue: 0,
                        in: {
                          $add: [
                            "$$value",
                            {
                              $convert: {
                                input: { $ifNull: ["$$this.quantity", "$$this.qty"] },
                                to: "double",
                                onError: 1,
                                onNull: 1,
                              },
                            },
                          ],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: { $ifNull: ["$totalPrice", 0] } },
                totalOrders: { $sum: 1 },
              },
            },
          ],
          as: "_orderAgg",
        },
      },
      {
        $addFields: {
          totalSpent: {
            $ifNull: [{ $arrayElemAt: ["$_orderAgg.totalSpent", 0] }, 0],
          },
          totalOrders: {
            $ifNull: [{ $arrayElemAt: ["$_orderAgg.totalOrders", 0] }, 0],
          },
          lastSeen: { $max: ["$lastActiveAt", "$lastLoginAt"] },
        },
      },
      {
        $addFields: {
          status: {
            $cond: {
              if: {
                $or: [
                  { $gte: ["$lastActiveAt", activeSince] },
                  { $gte: ["$lastLoginAt", activeSince] },
                  {
                    $and: [{ $ne: ["$lastSeen", null] }, { $gte: ["$lastSeen", activeSince] }],
                  },
                ],
              },
              then: "active",
              else: "inactive",
            },
          },
        },
      },
    ];

    if (statusFilter === "active") {
      pipeline.push({ $match: { status: "active" } });
    } else if (statusFilter === "inactive") {
      pipeline.push({ $match: { status: "inactive" } });
    }

    pipeline.push({
      $facet: {
        rows: [
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              totalSpent: 1,
              totalOrders: 1,
              status: 1,
              createdAt: 1,
              lastLoginAt: 1,
              lastActiveAt: 1,
              profilePhoto: 1,
            },
          },
        ],
        totalCount: [{ $count: "total" }],
      },
    });

    const [result] = await User.aggregate(pipeline);
    const rows = result?.rows ?? [];
    const total = result?.totalCount?.[0]?.total ?? 0;
    const pages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: {
        customers: rows,
        page,
        pages,
        total,
        limit,
        activeWindowDays: ACTIVE_WINDOW_DAYS,
      },
    });
  } catch (error) {
    console.error("[adminCustomer] getCustomers:", error.message);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// @desc    Get single customer with full order details
// @route   GET /api/admin/customers/:id
// @access  Private / Super Admin
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid customer ID" });
    }

    const user = await User.findById(id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    if (!CUSTOMER_ROLES.includes(user.role)) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const Order = require("../models/Order");
    const activeSince = new Date(daysAgoMs(ACTIVE_WINDOW_DAYS));

    const emailNorm = String(user.email || "").toLowerCase().trim();

    const orders = await Order.find({
      $or: [
        { user: user._id },
        { customerEmail: emailNorm },
        { "shippingAddress.email": emailNorm },
      ],
    })
      .select("orderId totalPrice items createdAt status")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    let totalSpent = 0;
    let totalItems = 0;
    for (const o of orders) {
      totalSpent += Number(o.totalPrice) || 0;
      if (Array.isArray(o.items)) {
        for (const item of o.items) {
          totalItems += Number(item.quantity || item.qty || 0);
        }
      }
    }

    const lastSeen = user.lastActiveAt && user.lastLoginAt
      ? new Date(Math.max(new Date(user.lastActiveAt).getTime(), new Date(user.lastLoginAt).getTime()))
      : user.lastActiveAt || user.lastLoginAt;

    const isActive =
      user.lastActiveAt >= activeSince ||
      user.lastLoginAt >= activeSince ||
      (lastSeen && lastSeen >= activeSince);

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        address: user.address || "",
        country: user.country || "",
        bio: user.bio || "",
        profilePhoto: user.profilePhoto || "",
        isActive: user.isActive,
        status: isActive ? "active" : "inactive",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        lastActiveAt: user.lastActiveAt,
        lastSeen,
        stats: {
          totalSpent,
          totalOrders: orders.length,
          totalItems,
        },
        recentOrders: orders.slice(0, 10).map((o) => ({
          orderId: o.orderId,
          totalPrice: o.totalPrice,
          itemCount: Array.isArray(o.items) ? o.items.length : 0,
          status: o.status,
          createdAt: o.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("[adminCustomer] getCustomerById:", error.message);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

module.exports = {
  getCustomerSummary,
  getCustomers,
  getCustomerById,
  ACTIVE_WINDOW_DAYS,
  LIVE_WINDOW_HOURS,
};
