const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { globalSearch } = require("../controllers/searchController");

// @route   GET /api/search
// @desc    Global search across multiple entities
// @access  Private
router.get("/", protect, globalSearch);

module.exports = router;
