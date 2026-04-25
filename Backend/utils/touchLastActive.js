const User = require("../models/User");

/** Minimum interval between DB writes for the same user (reduces load on high-traffic APIs). */
const THROTTLE_MS = 10 * 60 * 1000;

/**
 * Updates lastActiveAt only if missing, stale, or older than THROTTLE_MS.
 * Fire-and-forget from auth middleware; failures are ignored.
 */
async function touchLastActiveThrottled(userId) {
  try {
    const cutoff = new Date(Date.now() - THROTTLE_MS);
    await User.updateOne(
      {
        _id: userId,
        $or: [
          { lastActiveAt: { $exists: false } },
          { lastActiveAt: null },
          { lastActiveAt: { $lt: cutoff } },
        ],
      },
      { $set: { lastActiveAt: new Date() } }
    );
  } catch (_) {
    /* ignore */
  }
}

module.exports = { touchLastActiveThrottled, THROTTLE_MS };
