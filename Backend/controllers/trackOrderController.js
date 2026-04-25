const TrackOrder = require("../models/TrackOrder");
const Order = require("../models/Order");

// @desc    Log a new track order event
// @route   POST /api/track-orders/log
// @access  Public (Optional Auth)
const createTrackOrderLog = async (req, res) => {
  try {
    const { orderId, trackingId, searchedValue, source } = req.body;

    if (!orderId && !trackingId) {
      return res.status(400).json({
        success: false,
        message: "Please provide either orderId or trackingId",
      });
    }

    // Find the actual order based on either orderId or trackingId
    const query = [];
    if (orderId) query.push({ orderId });
    if (trackingId) query.push({ trackingId });

    // Try finding by matching trackingId or orderId exactly
    const order = await Order.findOne({ $or: query });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const newLog = new TrackOrder({
      orderId: order.orderId,
      trackingId: order.trackingId || trackingId || "",
      userId: req.user ? req.user._id : undefined,
      userName: req.user ? req.user.name : undefined,
      userEmail: req.user ? req.user.email : undefined,
      source: source || "track-page",
      statusAtTimeOfTracking: order.trackingStatus || order.orderStatus,
      orderStatusTimeline: order.trackingHistory || [],
      orderDetails: {
        totalPrice: order.totalPrice,
        itemsCount: order.items ? order.items.length : 0,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
      },
      searchedValue: searchedValue || orderId || trackingId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    const savedLog = await newLog.save();

    res.status(201).json({
      success: true,
      data: savedLog,
    });
  } catch (error) {
    console.error("[TrackOrder] Error creating log:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get all track order logs
// @route   GET /api/track-orders
// @access  Private/Admin
const getAllTrackOrders = async (req, res) => {
  try {
    const logs = await TrackOrder.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get track order logs by order ID
// @route   GET /api/track-orders/order/:orderId
// @access  Private/Admin
const getTrackOrdersByOrderId = async (req, res) => {
  try {
    const logs = await TrackOrder.find({ orderId: req.params.orderId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createTrackOrderLog,
  getAllTrackOrders,
  getTrackOrdersByOrderId,
};
