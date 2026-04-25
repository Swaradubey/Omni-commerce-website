const express = require("express");
const { check } = require("express-validator");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const {
  createStoreManager,
  listStoreManagers,
  getStoreManagersByClient,
  getStoreManagerById,
  updateStoreManager,
  deleteStoreManager,
} = require("../controllers/storeManagerController");

const router = express.Router();

const phoneValidator = check("phone")
  .trim()
  .notEmpty()
  .withMessage("Phone number is required")
  .custom((value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length < 10) {
      throw new Error("Enter a valid phone number (at least 10 digits)");
    }
    return true;
  });

const createValidators = [
  check("name", "Name is required").trim().notEmpty(),
  check("email", "Email is required").trim().notEmpty().isEmail().withMessage("Please enter a valid email"),
  phoneValidator,
  check("address", "Address is required").trim().notEmpty(),
  check("password", "Password is required").trim().notEmpty(),
  check("password", "Password must be at least 8 characters").isLength({ min: 8 }),
  check("clientId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("clientId cannot be empty when provided"),
  check("shopName").optional().trim(),
];

const updatePhoneOptional = check("phone")
  .optional({ checkFalsy: true })
  .trim()
  .custom((value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length < 10) {
      throw new Error("Enter a valid phone number (at least 10 digits)");
    }
    return true;
  });

const updateValidators = [
  check("name").optional().trim().notEmpty(),
  updatePhoneOptional,
  check("address").optional().trim().notEmpty(),
  check("shopName").optional().trim(),
  check("status").optional().isIn(["active", "inactive"]),
];

router.post(
  "/",
  protect,
  allowRoles("super_admin", "client"),
  createValidators,
  createStoreManager
);

router.get("/", protect, allowRoles("super_admin", "client"), listStoreManagers);

router.get(
  "/client/:clientId",
  protect,
  allowRoles("super_admin", "client"),
  getStoreManagersByClient
);

router.get("/:id", protect, allowRoles("super_admin", "client"), getStoreManagerById);

router.put(
  "/:id",
  protect,
  allowRoles("super_admin", "client"),
  updateValidators,
  updateStoreManager
);

router.delete("/:id", protect, allowRoles("super_admin", "client"), deleteStoreManager);

module.exports = router;
