/**
 * Idempotent seed for Help Center dashboard content.
 * Run from Backend folder: node scripts/seedHelpCenter.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const HelpCenterContent = require("../models/HelpCenterContent");

const PAGE_SLUG = "help-center-home";

const DOCS = [
  {
    type: "page_config",
    slug: PAGE_SLUG,
    title: "Help Center",
    badgeLabel: "Support Hub",
    pageTitle: "How can we help today?",
    description: "Search our knowledge base or browse help topics below.",
    searchPlaceholder: "Search tutorials, documentation, and FAQs...",
    isPublished: true,
    displayOrder: 0,
  },
  {
    type: "category",
    slug: "documentation",
    title: "Documentation",
    description: "Detailed guides for every feature of the Nexus platform.",
    icon: "book",
    isPublished: true,
    displayOrder: 1,
  },
  {
    type: "category",
    slug: "help-articles",
    title: "Help Articles",
    description: "Short tutorials and quick tips for everyday tasks.",
    icon: "file-text",
    isPublished: true,
    displayOrder: 2,
  },
  {
    type: "category",
    slug: "video-tutorials",
    title: "Video Tutorials",
    description: "Watch step-by-step videos on setting up your store.",
    icon: "play-circle",
    isPublished: true,
    displayOrder: 3,
  },
  {
    type: "faq",
    slug: "faq-add-product",
    title: "How do I add a new product?",
    description:
      "Navigate to the Inventory page and click the 'Add Product' button in the top right corner.",
    content:
      "Navigate to the Inventory page and click the 'Add Product' button in the top right corner.",
    category: "Inventory",
    tags: ["products", "inventory"],
    searchKeywords: ["add product", "inventory", "new product"],
    isPublished: true,
    displayOrder: 1,
  },
  {
    type: "faq",
    slug: "faq-export-orders",
    title: "Can I export my order history?",
    description:
      "Yes, go to Analytics, select the time range, and click 'Export Report' from the actions menu.",
    content:
      "Yes, go to Analytics, select the time range, and click 'Export Report' from the actions menu.",
    category: "Analytics",
    tags: ["orders", "export", "analytics"],
    isPublished: true,
    displayOrder: 2,
  },
  {
    type: "faq",
    slug: "faq-shipping-fees",
    title: "How are shipping fees calculated?",
    description:
      "In Store Settings, you can define flat rates or integrate with carrier APIs for real-time calculation.",
    content:
      "In Store Settings, you can define flat rates or integrate with carrier APIs for real-time calculation.",
    category: "Shipping",
    tags: ["shipping", "rates", "settings"],
    isPublished: true,
    displayOrder: 3,
  },
  {
    type: "faq",
    slug: "faq-store-access",
    title: "Where can I manage store access?",
    description:
      "Go to Settings > Security & Access to invite team members and define their roles.",
    content:
      "Go to Settings > Security & Access to invite team members and define their roles.",
    category: "Security",
    tags: ["team", "roles", "access"],
    isPublished: true,
    displayOrder: 4,
  },
  {
    type: "documentation",
    slug: "doc-getting-started",
    title: "Getting started with your storefront",
    description: "Connect payments, shipping, and branding in under an hour.",
    content: "Step-by-step checklist for launching your first catalog and going live.",
    category: "Onboarding",
    tags: ["setup", "guide"],
    searchKeywords: ["getting started", "onboarding", "setup"],
    isPublished: true,
    displayOrder: 10,
  },
  {
    type: "tutorial",
    slug: "tutorial-pos-basics",
    title: "POS basics: ringing up sales",
    description: "Learn cart actions, discounts, and receipts from the register.",
    content: "Short walkthrough for cashiers using the in-store POS.",
    category: "POS",
    tags: ["pos", "cashier"],
    searchKeywords: ["pos", "tutorial", "sales"],
    isPublished: true,
    displayOrder: 11,
  },
  {
    type: "support_block",
    slug: "support-priority",
    title: "24/7 Priority Support",
    description: "Our expert support team is always available to help you with any issues.",
    icon: "life-buoy",
    actionLabel: "Launch Chat",
    actionHref: "",
    variant: "hero",
    isPublished: true,
    displayOrder: 1,
  },
  {
    type: "support_block",
    slug: "support-live",
    title: "Live Support",
    description: "",
    icon: "message-circle",
    variant: "tile-emerald",
    isPublished: true,
    displayOrder: 2,
  },
  {
    type: "support_block",
    slug: "support-email",
    title: "Email Us",
    description: "",
    icon: "mail",
    variant: "tile-orange",
    isPublished: true,
    displayOrder: 3,
  },
];

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri || !String(uri).trim()) {
    console.error("MONGO_URI missing. Set Backend/.env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("[seedHelpCenter] Connected");

  for (const doc of DOCS) {
    const { slug, type } = doc;
    if (!slug) {
      console.warn("[seedHelpCenter] skip entry without slug", doc.title);
      // eslint-disable-next-line no-continue
      continue;
    }
    await HelpCenterContent.findOneAndUpdate(
      { slug },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log("[seedHelpCenter] upserted", type, slug);
  }

  await mongoose.disconnect();
  console.log("[seedHelpCenter] Done");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
