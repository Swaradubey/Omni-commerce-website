/**
 * Verification script for Shiprocket Sync logic.
 * This mocks a Shiprocket tracking response and verifies that normalizeTrackingPayload
 * correctly extracts the new fields (shippedAtIso, deliveredAtIso).
 */

const shiprocketService = require('../services/shiprocketService');

const mockTrackingResponse = {
  tracking_data: {
    courier_name: "Delhivery",
    awb_code: "123456789",
    track_url: "https://track.delhivery.com/123456789",
    shipment_status: "Delivered",
    shipment_track: [
      {
        activity: "Picked up",
        location: "Mumbai",
        date: "2024-04-10 10:00:00"
      },
      {
        activity: "Shipped",
        location: "In Transit",
        date: "2024-04-12 14:00:00"
      },
      {
        activity: "Delivered",
        location: "Delhi",
        date: "2024-04-15 11:00:00"
      }
    ],
    edd: "2024-04-16"
  }
};

try {
  console.log("Testing normalizeTrackingPayload...");
  const normalized = shiprocketService.normalizeTrackingPayload(mockTrackingResponse);

  console.log("Normalized result:", JSON.stringify(normalized, null, 2));

  if (normalized.shippedAtIso && normalized.deliveredAtIso) {
    console.log("SUCCESS: shippedAtIso and deliveredAtIso extracted correctly.");
  } else {
    console.log("FAILURE: Missing shippedAtIso or deliveredAtIso.");
    if (!normalized.shippedAtIso) console.log("- shippedAtIso is missing");
    if (!normalized.deliveredAtIso) console.log("- deliveredAtIso is missing");
  }

  // Verify mapping
  const layout = shiprocketService.buildStagesFromNormalized(normalized);
  console.log("Timeline resolved stage:", layout.currentStageResolved);
  console.log("Timeline status resolved:", layout.trackingStatusResolved);

  if (layout.currentStageResolved === 6 && layout.trackingStatusResolved === "Delivered") {
    console.log("SUCCESS: Stage mapping for Delivered is correct.");
  } else {
    console.log("FAILURE: Stage mapping is incorrect.");
  }

} catch (err) {
  console.error("Test failed with error:", err);
}
