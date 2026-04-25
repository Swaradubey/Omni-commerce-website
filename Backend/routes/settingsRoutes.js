const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");

const PROFILE_PHOTO_MAX_LENGTH = 600_000;
const {
  getSettings,
  updateSettings,
  resetSettings,
  updateProfile,
  updateStore,
  updateNotifications,
  updateSecurity,
  updateBilling,
} = require("../controllers/settingsController");

router.get("/", protect, getSettings);
router.put("/", protect, updateSettings);
router.delete("/reset", protect, resetSettings);

router.put(
  "/profile",
  protect,
  [
    body("fullName").optional().trim().notEmpty().withMessage("Full name cannot be empty"),
    body("email").optional().isEmail().withMessage("Valid email required"),
    body("username").optional().isString(),
    body("countryOrRegion").optional().isString(),
    body("bio").optional().isString().isLength({ max: 5000 }),
    body("profilePhoto").optional().isString().isLength({ max: PROFILE_PHOTO_MAX_LENGTH }),
  ],
  updateProfile
);

router.put(
  "/store",
  protect,
  [
    body("storeName").optional().isString(),
    body("storeEmail").optional().isString(),
    body("storePhone").optional().isString(),
    body("storeAddress").optional().isString(),
    body("currency").optional().isString(),
    body("timezone").optional().isString(),
    body("taxRate")
      .optional()
      .custom((v) => {
        const n = Number(v);
        return !Number.isNaN(n) && n >= 0 && n <= 100;
      })
      .withMessage("taxRate must be between 0 and 100"),
    body("language").optional().isString(),
  ],
  updateStore
);

router.put("/notifications", protect, updateNotifications);

router.put(
  "/security",
  protect,
  [
    body("twoFactorEnabled").optional().isBoolean(),
    body("loginAlerts").optional().isBoolean(),
    body("sessionTimeout").optional().isInt({ min: 5, max: 1440 }),
    body("allowedDevices").optional().isInt({ min: 1, max: 100 }),
    body("currentPassword").optional().isString(),
    body("newPassword").optional().isString(),
    body("confirmPassword").optional().isString(),
  ],
  updateSecurity
);

router.put(
  "/billing",
  protect,
  [
    body("currentPlan").optional().isString(),
    body("billingEmail").optional().isString(),
    body("billingAddress").optional().isString(),
    body("autoRenew").optional().isBoolean(),
    body("paymentMethodLast4").optional().isString(),
    body("subscriptionStatus").optional().isString(),
  ],
  updateBilling
);

module.exports = router;
