const express = require("express");
const { check } = require("express-validator");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const {
  createEmployee,
  listEmployees,
  getEmployeesByClientId,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

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
  check("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("clientId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("clientId cannot be empty when provided"),
  check("managerId").optional().trim(),
  check("shopName").optional().trim(),
  check("role")
    .optional()
    .trim()
    .customSanitizer((value) => String(value || "").toLowerCase().replace(/\s+/g, "_"))
    .isIn(["employee", "staff", "seo_manager", "store_manager", "inventory_manager", "counter_manager"])
    .withMessage("Role must be one of: employee, staff, seo_manager, store_manager, inventory_manager, counter_manager"),
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
  check("managerId").optional().trim(),
];

router.post("/", protect, allowRoles("super_admin", "admin", "client", "employee"), createValidators, createEmployee);

router.get("/", protect, allowRoles("super_admin", "client", "employee"), listEmployees);

router.get(
  "/client/:clientId",
  protect,
  allowRoles("super_admin", "client"),
  getEmployeesByClientId
);

router.get("/:id", protect, allowRoles("super_admin", "client"), getEmployeeById);

router.put(
  "/:id",
  protect,
  allowRoles("super_admin", "client"),
  updateValidators,
  updateEmployee
);

router.delete("/:id", protect, allowRoles("super_admin", "client"), deleteEmployee);

module.exports = router;
