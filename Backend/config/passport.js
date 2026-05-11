const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ── Google OAuth Strategy (safe guard) ──────────────────────────────────────
console.log("Google Client ID Loaded:", !!process.env.GOOGLE_CLIENT_ID);
console.log("Google Client Secret Loaded:", !!process.env.GOOGLE_CLIENT_SECRET);
console.log("Google Callback URL Loaded:", !!process.env.GOOGLE_CALLBACK_URL);

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error(
    "[Google OAuth] ⚠  Missing Google OAuth environment variables (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). " +
    "Google Sign-In will be disabled. Add them to your .env file to enable it."
  );
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails && profile.emails[0] && profile.emails[0].value || "").toLowerCase().trim();
          const name = profile.displayName || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim() || "Google User";
          const googleId = profile.id;

          console.log(`[Google OAuth] Processing login for googleId=${googleId} email=${email}`);

          // 1. Find user by googleId
          let user = await User.findOne({ googleId });

          if (user) {
            console.log(`[Google OAuth] Found existing user by googleId: ${user._id}`);
            return done(null, user);
          }

          // 2. Find user by email
          user = await User.findByNormalizedEmail(email);

          if (user) {
            // Attach googleId to existing user
            console.log(`[Google OAuth] Found existing user by email, attaching googleId: ${user._id}`);
            user.googleId = googleId;
            await user.save();
            return done(null, user);
          }

          // 3. Create new user
          console.log(`[Google OAuth] Creating new user for email=${email}`);
          user = await User.create({
            name,
            email,
            googleId,
            role: "user",
          });

          console.log(`[Google OAuth] New user created: ${user._id}`);
          return done(null, user);
        } catch (err) {
          console.error("[Google OAuth] Strategy error:", err.message);
          return done(err, null);
        }
      }
    )
  );
  console.log("[Google OAuth] Strategy registered successfully.");
}

module.exports = passport;
