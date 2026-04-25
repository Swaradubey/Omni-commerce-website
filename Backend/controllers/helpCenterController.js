const HelpCenterContent = require("../models/HelpCenterContent");

const PAGE_SLUG = "help-center-home";

const DEFAULT_PAGE = {
  badgeLabel: "Support Hub",
  title: "How can we help today?",
  subtitle: "Search our knowledge base or browse help topics below.",
  searchPlaceholder: "Search tutorials, documentation, and FAQs...",
};

const SEARCHABLE_TYPES = [
  "category",
  "faq",
  "article",
  "documentation",
  "tutorial",
  "support_topic",
  "support_block",
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPublicLean(doc) {
  if (!doc) return null;
  const o = { ...doc };
  o.id = String(o._id);
  delete o._id;
  delete o.__v;
  return o;
}

function buildPagePayload(pageDoc) {
  if (!pageDoc) {
    return { ...DEFAULT_PAGE };
  }
  const base = toPublicLean(pageDoc.toObject ? pageDoc.toObject() : pageDoc) || {};
  return {
    badgeLabel: base.badgeLabel || DEFAULT_PAGE.badgeLabel,
    title: base.pageTitle || base.title || DEFAULT_PAGE.title,
    subtitle: base.description || DEFAULT_PAGE.subtitle,
    searchPlaceholder: base.searchPlaceholder || DEFAULT_PAGE.searchPlaceholder,
  };
}

// @desc    Published Help Center bundle for dashboard
// @route   GET /api/help-center
// @access  Private (dashboard users; not Super Admin)
const getHelpCenter = async (req, res) => {
  try {
    let pageDoc = await HelpCenterContent.findOne({
      type: "page_config",
      isPublished: true,
      slug: PAGE_SLUG,
    });
    if (!pageDoc) {
      pageDoc = await HelpCenterContent.findOne({
        type: "page_config",
        isPublished: true,
      }).sort({ displayOrder: 1 });
    }

    const [categories, faqs, articles, supportBlocks, faqTotal] = await Promise.all([
      HelpCenterContent.find({ type: "category", isPublished: true })
        .sort({ displayOrder: 1, title: 1 })
        .lean(),
      HelpCenterContent.find({ type: "faq", isPublished: true })
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(24)
        .lean(),
      HelpCenterContent.find({
        type: { $in: ["article", "documentation", "tutorial", "support_topic"] },
        isPublished: true,
      })
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(48)
        .lean(),
      HelpCenterContent.find({ type: "support_block", isPublished: true })
        .sort({ displayOrder: 1 })
        .lean(),
      HelpCenterContent.countDocuments({ type: "faq", isPublished: true }),
    ]);

    res.json({
      success: true,
      data: {
        page: buildPagePayload(pageDoc),
        categories: categories.map(toPublicLean),
        faqs: faqs.map(toPublicLean),
        articles: articles.map(toPublicLean),
        supportBlocks: supportBlocks.map(toPublicLean),
        faqTotal,
      },
    });
  } catch (error) {
    console.error("[HelpCenter] getHelpCenter:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search published Help Center content
// @route   GET /api/help-center/search?q=
// @access  Private(dashboard users; not Super Admin)
const searchHelpCenter = async (req, res) => {
  try {
    const raw = (req.query.q ?? req.query.query ?? "").toString().trim();
    if (!raw) {
      return res.json({
        success: true,
        data: { query: "", results: [] },
      });
    }

    const rx = new RegExp(escapeRegex(raw), "i");
    const filter = {
      isPublished: true,
      type: { $in: SEARCHABLE_TYPES },
      $or: [
        { title: rx },
        { description: rx },
        { content: rx },
        { category: rx },
        { slug: rx },
        { tags: rx },
        { searchKeywords: rx },
      ],
    };

    const docs = await HelpCenterContent.find(filter)
      .sort({ displayOrder: 1, title: 1 })
      .limit(75)
      .lean();

    res.json({
      success: true,
      data: {
        query: raw,
        results: docs.map((d) => toPublicLean(d)),
      },
    });
  } catch (error) {
    console.error("[HelpCenter] searchHelpCenter:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Distinct topic categories from published entries
// @route   GET /api/help-center/categories
// @access  Private(dashboard users; not Super Admin)
const getHelpCenterCategories = async (req, res) => {
  try {
    const categories = await HelpCenterContent.distinct("category", {
      isPublished: true,
      category: { $nin: ["", null] },
      type: { $in: ["faq", "article", "documentation", "tutorial", "support_topic"] },
    });
    categories.sort((a, b) => a.localeCompare(b));
    res.json({ success: true, data: { categories } });
  } catch (error) {
    console.error("[HelpCenter] getHelpCenterCategories:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Single published item by slug
// @route   GET /api/help-center/item/:slug
// @access  Private(dashboard users; not Super Admin)
const getHelpCenterBySlug = async (req, res) => {
  try {
    const slug = (req.params.slug || "").toString().trim();
    if (!slug) {
      return res.status(400).json({ success: false, message: "Slug is required" });
    }

    const doc = await HelpCenterContent.findOne({
      slug,
      isPublished: true,
      type: { $ne: "page_config" },
    }).lean();

    if (!doc) {
      return res.status(404).json({ success: false, message: "Help content not found" });
    }

    res.json({ success: true, data: toPublicLean(doc) });
  } catch (error) {
    console.error("[HelpCenter] getHelpCenterBySlug:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHelpCenter,
  searchHelpCenter,
  getHelpCenterCategories,
  getHelpCenterBySlug,
};
