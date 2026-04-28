const CustomDomain = require("../models/CustomDomain");

// @desc    Get all custom domains
// @route   GET /api/custom-domains
// @access  Public (protected by middleware in routes)
const getAllCustomDomains = async (req, res) => {
  try {
    const domains = await CustomDomain.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: domains.length, data: domains });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a custom domain
// @route   POST /api/custom-domains
// @access  Public (protected by middleware in routes)
const createCustomDomain = async (req, res) => {
  try {
    const { domain, clientName } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, message: "Domain is required" });
    }

    const trimmedDomain = domain.trim().toLowerCase();
    
    // Check if domain exists
    const existingDomain = await CustomDomain.findOne({ domain: trimmedDomain });
    if (existingDomain) {
      return res.status(400).json({ success: false, message: "Domain already exists" });
    }

    const customDomain = await CustomDomain.create({
      domain: trimmedDomain,
      clientName: clientName || "",
      status: "Pending"
    });

    res.status(201).json({ success: true, data: customDomain });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a custom domain
// @route   DELETE /api/custom-domains/:id
// @access  Public (protected by middleware in routes)
const deleteCustomDomain = async (req, res) => {
  try {
    const customDomain = await CustomDomain.findById(req.params.id);

    if (!customDomain) {
      return res.status(404).json({ success: false, message: "Custom domain not found" });
    }

    await customDomain.deleteOne();

    res.status(200).json({ success: true, message: "Custom domain removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllCustomDomains,
  createCustomDomain,
  deleteCustomDomain,
};
