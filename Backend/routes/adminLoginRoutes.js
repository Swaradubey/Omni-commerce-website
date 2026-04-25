const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const AdminLoginLog = require("../models/AdminLoginLog");
const { createLoginLog } = require("../utils/createLoginLog");
const { protect, allowRoles } = require("../middleware/authMiddleware");

// @desc    Log admin login activity
// @route   POST /api/admin-login/log
// @access  Public (called by frontend after successful admin login)
const logAdminLogin = async (req, res) => {
  try {
    const { email, role, message, source } = req.body;
    const actor = {
      _id: req.user && req.user._id ? req.user._id : null,
      name: req.user && req.user.name ? req.user.name : null,
      email: email || (req.user && req.user.email ? req.user.email : ""),
      role: role || (req.user && req.user.role ? req.user.role : "admin"),
    };
    const loginLog = await createLoginLog(actor, req, {
      message: message || `${actor.role} logged in successfully`,
      source: source || "admin_panel",
    });

    res.status(201).json({
      success: true,
      message: "Login activity logged",
      data: loginLog,
    });
  } catch (error) {
    console.error(`[ERROR] Admin login log error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to log login activity",
    });
  }
};

// @desc    Get admin login activity logs
// @route   GET /api/admin-login/logs
// @access  Public (can be restricted if needed)
const getAdminLoginLogs = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const logs = await AdminLoginLog.find()
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await AdminLoginLog.countDocuments();

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
      },
    });
  } catch (error) {
    console.error(`[ERROR] Get admin login logs error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve login logs",
    });
  }
};

// @desc    Delete one admin login log by id
// @route   DELETE /api/admin-login/logs/:id
// @access  Private / super_admin only
const deleteAdminLoginLog = async (req, res) => {
  try {
    const raw = req.params.id;
    if (raw == null || typeof raw !== "string" || raw.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Log id is required",
      });
    }
    const id = raw.trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid log id",
      });
    }

    const deleted = await AdminLoginLog.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Log entry not found",
      });
    }

    return res.json({
      success: true,
      message: "Login log deleted",
      data: { _id: deleted._id.toString() },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid log id",
      });
    }
    console.error(`[ERROR] Delete admin login log: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete login log",
    });
  }
};

router.post("/log", protect, allowRoles("super_admin", "admin"), logAdminLogin);
router.get("/logs", protect, allowRoles("super_admin"), getAdminLoginLogs);
router.delete("/logs/:id", protect, allowRoles("super_admin"), deleteAdminLoginLog);

module.exports = router;