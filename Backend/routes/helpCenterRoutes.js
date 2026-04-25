const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { allowDashboardHelpCenter } = require("../middleware/helpCenterAccessMiddleware");
const {
  getHelpCenter,
  searchHelpCenter,
  getHelpCenterCategories,
  getHelpCenterBySlug,
} = require("../controllers/helpCenterController");

router.use(protect, allowDashboardHelpCenter);

router.get("/search", searchHelpCenter);
router.get("/categories", getHelpCenterCategories);
router.get("/", getHelpCenter);
/** Single published entry; register after /search and /categories so reserved paths are not captured */
router.get("/:slug", getHelpCenterBySlug);

module.exports = router;
