const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");

// @desc    Create Razorpay order
// @route   POST /api/payments/razorpay/create-order
// @access  Public
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("[RAZORPAY ERROR]: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env");
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are missing in the server configuration. Please contact the administrator.",
      });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(Number(amount) * 100), // convert to paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);

    if (!order) {
      return res.status(500).json({
        success: false,
        message: "Failed to create Razorpay order",
      });
    }

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("[RAZORPAY CREATE ORDER ERROR]:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/razorpay/verify
// @access  Public
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      internal_order_id, // our business orderId
    } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("[RAZORPAY ERROR]: Missing RAZORPAY_KEY_SECRET in .env for verification");
      return res.status(500).json({
        success: false,
        message: "Razorpay configuration is incomplete. Verification failed.",
      });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Signature verified
      
      // Update order in database if internal_order_id is provided
      if (internal_order_id) {
        const order = await Order.findOne({ orderId: internal_order_id });
        if (order) {
          order.razorpayOrderId = razorpay_order_id;
          order.razorpayPaymentId = razorpay_payment_id;
          order.razorpaySignature = razorpay_signature;
          order.paymentStatus = "paid";
          order.isPaid = true;
          order.paidAt = Date.now();
          await order.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      // Verification failed
      if (internal_order_id) {
        const order = await Order.findOne({ orderId: internal_order_id });
        if (order) {
          order.paymentStatus = "failed";
          await order.save();
        }
      }
      return res.status(400).json({
        success: false,
        message: "Invalid signature, payment verification failed",
      });
    }
  } catch (error) {
    console.error("[RAZORPAY VERIFY ERROR]:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
};
