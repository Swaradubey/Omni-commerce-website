const CustomDomain = require("../models/CustomDomain");
const Client = require("../models/Client");
const vercelService = require("../services/vercelService");

// @desc    Get all custom domains
// @route   GET /api/custom-domains
// @access  Private (Super Admin)
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
// @access  Private (Super Admin)
const createCustomDomain = async (req, res) => {
  try {
    const { domainName, clientId } = req.body;

    if (!domainName || domainName.trim() === "") {
      return res.status(400).json({ message: "Domain name is required" });
    }

    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required" });
    }

    console.log("Incoming domain:", domainName);

    const formattedDomain = domainName.trim().toLowerCase();
    
    // Check if domain exists in DB
    const existingDomain = await CustomDomain.findOne({ $or: [{ domainName: formattedDomain }, { domain: formattedDomain }] });
    if (existingDomain) {
      return res.status(400).json({ message: "Domain already exists" });
    }

    // Fetch client to get name
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Add to Vercel
    try {
      await vercelService.addDomain(formattedDomain);
    } catch (vercelError) {
      return res.status(500).json({ message: `Vercel Error: ${vercelError.message}` });
    }

    // DNS Instructions
    const dnsInstructions = {
      root: { type: "A", name: "@", value: "76.76.21.21" },
      subdomain: { type: "CNAME", name: "www", value: "cname.vercel-dns.com" }
    };

    const customDomain = await CustomDomain.create({
      domainName: formattedDomain,
      domain: formattedDomain,
      clientId,
      clientName: client.companyName || client.shopName || "Client",
      status: "Pending",
      dnsInstructions
    });

    res.status(201).json({ success: true, data: customDomain });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Domain already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check domain status from Vercel
// @route   GET /api/custom-domains/:id/status
// @access  Private (Super Admin)
const checkDomainStatus = async (req, res) => {
  try {
    const customDomain = await CustomDomain.findById(req.params.id);

    if (!customDomain) {
      return res.status(404).json({ success: false, message: "Custom domain not found" });
    }

    const vStatus = await vercelService.checkDomainStatus(customDomain.domainName);
    
    customDomain.status = vStatus.status;
    await customDomain.save();

    res.status(200).json({ 
      success: true, 
      status: vStatus.status, 
      message: vStatus.message,
      data: customDomain 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a custom domain
// @route   DELETE /api/custom-domains/:id
// @access  Private (Super Admin)
const deleteCustomDomain = async (req, res) => {
  try {
    const customDomain = await CustomDomain.findById(req.params.id);

    if (!customDomain) {
      return res.status(404).json({ success: false, message: "Custom domain not found" });
    }

    // Remove from Vercel
    try {
      await vercelService.removeDomain(customDomain.domainName);
    } catch (vercelError) {
      console.error("Failed to remove domain from Vercel:", vercelError.message);
      // We continue to delete from DB even if Vercel fails (maybe it was already deleted there)
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
  checkDomainStatus,
  deleteCustomDomain,
};
