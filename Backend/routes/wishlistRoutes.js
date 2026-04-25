const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getWishlist,
  checkWishlistStatus,
  toggleWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController");

router.get("/check", protect, checkWishlistStatus);
router.get("/check/:productId", protect, checkWishlistStatus);
router.get("/", protect, getWishlist);
router.post("/toggle", protect, toggleWishlist);
router.post("/", protect, addToWishlist);
router.delete("/:productId", protect, removeFromWishlist);

module.exports = router;
