const mongoose = require("mongoose");

const HELP_TYPES = [
  "page_config",
  "category",
  "faq",
  "article",
  "documentation",
  "tutorial",
  "support_topic",
  "support_block",
];

const helpCenterContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      required: true,
      enum: HELP_TYPES,
      index: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    icon: {
      type: String,
      default: "",
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    searchKeywords: {
      type: [String],
      default: [],
    },
    href: {
      type: String,
      default: "",
      trim: true,
    },
    actionLabel: {
      type: String,
      default: "",
      trim: true,
    },
    actionHref: {
      type: String,
      default: "",
      trim: true,
    },
    variant: {
      type: String,
      default: "",
      trim: true,
    },
    /** When type is `page_config`: small pill above the title */
    badgeLabel: {
      type: String,
      default: "",
      trim: true,
    },
    /** When type is `page_config`: main heading if set */
    pageTitle: {
      type: String,
      default: "",
      trim: true,
    },
    /** When type is `page_config`: search input placeholder */
    searchPlaceholder: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

helpCenterContentSchema.index({ type: 1, isPublished: 1, displayOrder: 1 });

module.exports = mongoose.model("HelpCenterContent", helpCenterContentSchema);
module.exports.HELP_TYPES = HELP_TYPES;
