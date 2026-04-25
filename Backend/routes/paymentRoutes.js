const express = require("express");
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/paymentController");

// Use specific path as requested: /api/payments/razorpay/...
router.post("/razorpay/create-order", (req, res, next) => {
  console.log("[Payment Route] POST /api/payments/razorpay/create-order");
  next();
}, createRazorpayOrder);

router.post("/razorpay/verify", (req, res, next) => {
  console.log("[Payment Route] POST /api/payments/razorpay/verify");
  next();
}, verifyRazorpayPayment);

module.exports = router;
