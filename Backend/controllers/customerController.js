const mongoose = require("mongoose");
const Order = require("../models/Order");

const toObjectId = (id) => {
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
};

// @desc    Get customers for logged-in client based on orders
// @route   GET /api/customers/my-customers
// @access  Private
const getMyCustomers = async (req, res) => {
  try {
    const rawClientId =
      req.user?.clientId ||
      req.user?.linkedClientId ||
      req.user?.storeId ||
      req.user?.tenantId ||
      req.user?._id;

    if (!rawClientId) {
      return res.status(400).json({ success: false, message: "Client ID not found for user." });
    }

    const clientObjectId = toObjectId(rawClientId);

    const clientMatch = {
      $or: [
        { clientId: clientObjectId },
        { storeId: clientObjectId },
        { tenantId: clientObjectId },
        { clientId: String(rawClientId) },
        { storeId: String(rawClientId) },
        { tenantId: String(rawClientId) }
      ]
    };

    const customers = await Order.aggregate([
      { $match: clientMatch },
      {
        $group: {
          _id: {
            $ifNull: [
              "$customerEmail",
              "$customer.email"
            ]
          },
          name: {
            $first: {
              $ifNull: ["$customerName", "$customer.name"]
            }
          },
          email: {
            $first: {
              $ifNull: ["$customerEmail", "$customer.email"]
            }
          },
          phone: {
            $first: {
              $ifNull: ["$customerPhone", "$customer.phone"]
            }
          },
          totalSpent: {
            $sum: {
              $ifNull: ["$totalAmount", "$totalPrice", "$total"]
            }
          },
          totalOrders: { $sum: 1 },
          joined: { $min: "$createdAt" },
          lastOrder: { $max: "$createdAt" }
        }
      },
      { 
        $match: {
          _id: { $ne: null }
        }
      },
      { $sort: { lastOrder: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        customers,
        stats: {
          totalCustomers: customers.length,
          activeMembers: customers.length,
          newThisMonth: customers.filter(c => {
            const d = new Date(c.joined);
            const now = new Date();
            return d.getMonth() === now.getMonth() &&
                   d.getFullYear() === now.getFullYear();
          }).length,
          churnRate: 0
        }
      }
    });
  } catch (error) {
    console.error("[customerController] getMyCustomers:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

module.exports = {
  getMyCustomers
};
