const CustomDomain = require("../models/CustomDomain");
const Client = require("../models/Client");
const vercelService = require("../services/vercelService");
const { isValidObjectId } = require("../utils/tenantResolver");

// @desc    Resolve a custom domain
// @route   GET /api/custom-domains/resolve
// @access  Public
const resolveDomain = async (req, res) => {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ success: false, message: "Domain query parameter is required" });
    }

    console.log("[Backend] Incoming domain resolution request for:", domain);

    // Normalize domain: remove protocol, trailing slash, and www.
    let normalizedDomain = domain.toLowerCase().trim();
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, ""); // Remove http:// or https://
    normalizedDomain = normalizedDomain.replace(/\/$/, ""); // Remove trailing slash
    normalizedDomain = normalizedDomain.replace(/^www\./, ""); // Remove www.

    console.log("[Backend] Normalized domain for lookup:", normalizedDomain);

    const customDomain = await CustomDomain.findOne({
      $or: [
        { domainName: normalizedDomain },
        { domainName: `www.${normalizedDomain}` },
        { domain: normalizedDomain },
        { domain: `www.${normalizedDomain}` }
      ]
    }).populate("clientId");

    if (!customDomain) {
      console.log(`[Backend] Domain not found for: ${normalizedDomain}`);
      return res.status(404).json({ success: false, message: "Custom domain not found" });
    }

    console.log(`[Backend] Matched domain record:`, customDomain.domainName);

    res.status(200).json({
      success: true,
      data: {
        domain: customDomain,
        client: customDomain.clientId
      }
    });
  } catch (error) {
    console.error("[Backend] Error resolving domain:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all custom domains
// @route   GET /api/custom-domains
// @access  Private (Super Admin)
const getAllCustomDomains = async (req, res) => {
  try {
    const isSuperAdmin = req.user && (req.user.role === "super_admin" || req.user.role === "admin");
    const isClient = req.user && (req.user.role === "client" || req.user.role === "client_admin");
    const userClientId = req.user?.clientId;
    const resolvedClientId = req.clientId;
    
    // Determine the effective clientId to filter by
    let clientId = isSuperAdmin ? null : (userClientId || resolvedClientId);

    // Requirement 10 & 16: Log data retrieval details
    console.log(`[customDomain] getAllCustomDomains - Page: Custom Domains, Role: ${req.user?.role}, UserClientId: ${userClientId}, ResolvedClientId: ${resolvedClientId}`);

    const query = isSuperAdmin ? {} : { clientId };
    console.log("-----------------------------------------");
    console.log("role:", req.user?.role, "clientId:", clientId, "query:", JSON.stringify(query));
    console.log("-----------------------------------------");
    const domains = await CustomDomain.find(query).sort({ createdAt: -1 });

    // Requirement 16: Log DB query details
    console.log(`[customDomain] DB Query - Collection: customdomains, Filter: ${JSON.stringify(query)}, Count: ${domains.length}`);

    res.status(200).json({ success: true, count: domains.length, data: domains });
  } catch (error) {
    console.error("[customDomain] getAllCustomDomains error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a custom domain
// @route   POST /api/custom-domains
// @access  Private (Super Admin)
const createCustomDomain = async (req, res) => {
  try {
    let { domainName, clientId } = req.body;

    if (!domainName || domainName.trim() === "") {
      return res.status(400).json({ message: "Domain name is required" });
    }

    const isSuperAdmin = req.user && (req.user.role === "super_admin" || req.user.role === "admin");
    const isClient = req.user && (req.user.role === "client" || req.user.role === "client_admin");

    // If client, enforce their own clientId
    if (isClient) {
      clientId = req.user.clientId;
    }

    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required" });
    }

    console.log("Incoming domain:", domainName);

    let formattedDomain = domainName.trim().toLowerCase();
    formattedDomain = formattedDomain.replace(/^https?:\/\//, ""); // Remove http:// or https://
    formattedDomain = formattedDomain.replace(/\/$/, ""); // Remove trailing slash
    
    console.log("Normalized incoming domain:", formattedDomain);

    // Fetch client to get name
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    let alreadyInVercel = false;
    let successMessage = "Custom domain created successfully and sent to Vercel";

    // Add to Vercel
    try {
      await vercelService.addDomain(formattedDomain);
    } catch (vercelError) {
      const errorMsg = vercelError.message || "";
      // Requirement 3 & 4: If Vercel returns an error that the domain is already in use, do not completely fail.
      if (
        errorMsg.includes("already in use") || 
        errorMsg.includes("already_exists") || 
        errorMsg.includes("already exists")
      ) {
        console.log(`[Vercel] Domain ${formattedDomain} already exists or is in use in Vercel.`);
        alreadyInVercel = true;
        // Requirement 7: Add proper response message
        successMessage = "Domain already exists in Vercel and has been linked to this client.";
      } else {
        console.error(`[Vercel] Error adding domain: ${errorMsg}`);
        return res.status(500).json({ message: `Vercel Error: ${errorMsg}` });
      }
    }

    // DNS Instructions
    const dnsInstructions = {
      root: { type: "A", name: "@", value: "76.76.21.21" },
      subdomain: { type: "CNAME", name: "www", value: "cname.vercel-dns.com" }
    };

    // Requirement 6: Avoid duplicate MongoDB entries for the same domain.
    // Check if domain exists in DB
    let customDomain = await CustomDomain.findOne({ 
      $or: [{ domainName: formattedDomain }, { domain: formattedDomain }] 
    });

    if (customDomain) {
      // Requirement 5: If domain is already configured, save/update it in MongoDB for the selected client.
      customDomain.clientId = clientId;
      customDomain.clientName = client.companyName || client.shopName || "Client";
      customDomain.dnsInstructions = dnsInstructions;
      customDomain.status = "Pending";
      customDomain.sslStatus = "Pending";
      await customDomain.save();
      return res.status(200).json({ success: true, data: customDomain, message: successMessage });
    } else {
      // Create new record
      customDomain = await CustomDomain.create({
        domainName: formattedDomain,
        domain: formattedDomain,
        clientId,
        clientName: client.companyName || client.shopName || "Client",
        status: "Pending",
        sslStatus: "Pending",
        dnsInstructions
      });
      return res.status(201).json({ success: true, data: customDomain, message: successMessage });
    }

  } catch (error) {
    console.error("Error in createCustomDomain:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Domain already exists in the system" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const checkDomainStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Custom domain not found (Invalid ID)" });
    }
    const customDomain = await CustomDomain.findById(req.params.id);

    if (!customDomain) {
      return res.status(404).json({ success: false, message: "Custom domain not found" });
    }

    // Ownership check for clients
    const isSuperAdmin = req.user && (req.user.role === "super_admin" || req.user.role === "admin");
    if (!isSuperAdmin && String(customDomain.clientId) !== String(req.user?.clientId)) {
      return res.status(403).json({ success: false, message: "You are not allowed to access this domain" });
    }

    const vStatus = await vercelService.checkDomainStatus(customDomain.domainName);
    
    customDomain.status = vStatus.status;
    // If domain is Verified, we assume SSL is active or soon will be. 
    // In a real Vercel API check, we could check certs specifically, 
    // but mapping Verified to Active is a common pattern for these integrations.
    customDomain.sslStatus = vStatus.status === 'Verified' ? 'Active' : (vStatus.status === 'Error' ? 'Error' : 'Pending');
    
    await customDomain.save();

    res.status(200).json({ 
      success: true, 
      status: vStatus.status, 
      sslStatus: customDomain.sslStatus,
      message: vStatus.message,
      data: customDomain 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCustomDomain = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Custom domain not found (Invalid ID)" });
    }
    const customDomain = await CustomDomain.findById(req.params.id);

    if (!customDomain) {
      return res.status(404).json({ success: false, message: "Custom domain not found" });
    }

    // Ownership check for clients
    const isSuperAdmin = req.user && (req.user.role === "super_admin" || req.user.role === "admin");
    if (!isSuperAdmin && String(customDomain.clientId) !== String(req.user?.clientId)) {
      return res.status(403).json({ success: false, message: "You are not allowed to delete this domain" });
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
  resolveDomain,
};
