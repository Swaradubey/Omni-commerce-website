const express = require("express");
const { check } = require("express-validator");
const router = express.Router();
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { createClient, listClients, deleteClient } = require("../controllers/clientController");

router.post(
  "/",
  protect,
  allowRoles("super_admin"),
  [
    check("companyName", "Company name is required").trim().not().isEmpty(),
    check("gst", "GST is required").trim().not().isEmpty(),
    check("phone", "Phone is required").trim().not().isEmpty(),
    check("phone", "Enter a valid phone number (at least 10 digits)").custom((value) => {
      const digits = String(value || "").replace(/\D/g, "");
      if (digits.length < 10) {
        throw new Error("Enter a valid phone number (at least 10 digits)");
      }
      return true;
    }),
    check("email", "Email is required").trim().not().isEmpty(),
    check("email", "Please enter a valid email").isEmail(),
    check("panNo", "PAN is required").trim().not().isEmpty(),
    check("permanentAddress", "Permanent address is required").trim().not().isEmpty(),
    check("shopName", "Shop name is required").trim().not().isEmpty(),
    check("password", "Login password is required").trim().not().isEmpty(),
    check("password", "Password must be at least 8 characters").isLength({ min: 8 }),
  ],
  createClient
);

router.get("/", protect, allowRoles("super_admin", "admin"), listClients);

router.delete("/:id", protect, allowRoles("super_admin"), deleteClient);

module.exports = router;
