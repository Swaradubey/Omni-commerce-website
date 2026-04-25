const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const {
  listInbox,
  getInboxById,
  createInbox,
  appendMessage,
  markRead,
  updateStatus,
} = require("../controllers/inboxController");

const dashboardRoles = allowRoles("super_admin", "admin", "staff");

router.get(
  "/",
  protect,
  dashboardRoles,
  [query("search").optional().isString().isLength({ max: 200 })],
  listInbox
);

router.get("/:id", protect, dashboardRoles, getInboxById);

router.post(
  "/",
  protect,
  dashboardRoles,
  [
    body("customerName").trim().notEmpty().withMessage("customerName is required"),
    body("customerEmail").optional().trim().isString(),
    body("subject").trim().notEmpty().withMessage("subject is required"),
    body("text").trim().notEmpty().withMessage("text is required"),
    body("senderName").optional().trim().isString(),
    body("senderEmail").optional().trim().isString(),
  ],
  createInbox
);

router.post(
  "/:id/messages",
  protect,
  dashboardRoles,
  [
    body("text").trim().notEmpty().withMessage("text is required"),
    body("senderType")
      .trim()
      .isIn(["customer", "admin"])
      .withMessage("senderType must be customer or admin"),
    body("senderName").optional().trim().isString(),
    body("senderEmail").optional().trim().isString(),
  ],
  appendMessage
);

router.patch("/:id/read", protect, dashboardRoles, markRead);

router.patch(
  "/:id/status",
  protect,
  dashboardRoles,
  [body("status").trim().isIn(["open", "closed", "pending"]).withMessage("Invalid status")],
  updateStatus
);

module.exports = router;
