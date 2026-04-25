const mongoose = require("mongoose");

const wishlistItemSchema = new mongoose.Schema(
  {
    productKey: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["mongo", "static", "catalog", "inventory"],
    },
    productRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    /** Denormalized fields for readable MongoDB documents and APIs; legacy rows may omit these. */
    productId: {
      type: String,
      default: "",
      trim: true,
    },
    name: { type: String, default: "" },
    price: { type: Number, default: 0 },
    image: { type: String, default: "" },
    slug: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    productType: { type: String, default: "product" },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    snapshot: {
      name: { type: String, default: "" },
      slug: { type: String, default: "" },
      price: { type: Number, default: 0 },
      salePrice: { type: Number },
      image: { type: String, default: "" },
      category: { type: String, default: "" },
      sku: { type: String, default: "" },
      stock: { type: Number, default: 0 },
    },
  },
  { _id: true }
);

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    /** @deprecated Kept for backward compatibility; new entries use `items`. */
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    items: [wishlistItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);
