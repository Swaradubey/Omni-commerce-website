const Contact = require("../models/Contact");
const { validationResult } = require("express-validator");

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContact = async (req, res) => {
  console.log("[Backend Debug] POST /api/contact - Body:", req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[Backend Debug] Validation Errors:", errors.array());
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const contact = await Contact.create(req.body);
    console.log("[Backend Debug] Contact Request Saved Successfully:", contact._id);
    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: contact,
    });
  } catch (error) {
    console.error("[Backend Debug] Controller Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all contact requests
// @route   GET /api/contact
// @access  Private (Admin/Staff)
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({}).sort("-createdAt");
    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single contact request
// @route   GET /api/contact/:id
// @access  Private (Admin/Staff)
const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (contact) {
      res.json({ success: true, data: contact });
    } else {
      res.status(404).json({ success: false, message: "Contact request not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update contact status
// @route   PATCH /api/contact/:id/status
// @access  Private (Admin/Staff)
const updateContactStatus = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (contact) {
      contact.status = req.body.status || contact.status;
      const updatedContact = await contact.save();
      res.json({
        success: true,
        message: "Status updated successfully",
        data: updatedContact,
      });
    } else {
      res.status(404).json({ success: false, message: "Contact request not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete contact request
// @route   DELETE /api/contact/:id
// @access  Private (Admin/Staff)
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (contact) {
      res.json({ success: true, message: "Contact entry removed safely" });
    } else {
      res.status(404).json({ success: false, message: "Contact request not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};
