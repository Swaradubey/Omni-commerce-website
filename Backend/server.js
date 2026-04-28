const path = require("path");

const envPath = path.resolve(__dirname, ".env");
const envLoad = require("dotenv").config({ path: envPath });
if (envLoad.error) {
  console.warn(`[env] dotenv could not read ${envPath}: ${envLoad.error.message}`);
} else {
  console.log(`[env] Loaded ${envPath}`);
}

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminLoginRoutes = require("./routes/adminLoginRoutes");
const userRoutes = require("./routes/userRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const inboxRoutes = require("./routes/inboxRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const adminRoutes = require("./routes/adminRoutes");
const trackOrderRoutes = require("./routes/trackOrderRoutes");
const clientRoutes = require("./routes/clientRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const storeManagerRoutes = require("./routes/storeManagerRoutes");
const superadminRoutes = require("./routes/superadminRoutes");
const helpCenterRoutes = require("./routes/helpCenterRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const supportTicketRoutes = require("./routes/supportTicketRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const shiprocketService = require("./services/shiprocketService");

const customDomainRoutes = require("./routes/customDomainRoutes");

console.log("[Backend Debug] Mounting API routes...");
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/custom-domains", customDomainRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user", userRoutes); // Alias for frontend singular use cases
app.use("/api/settings", settingsRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/track-orders", trackOrderRoutes);
app.use("/api/admin-login", adminLoginRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/store-managers", storeManagerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/help-center", helpCenterRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/support-tickets", supportTicketRoutes);
app.use("/api/support/tickets", supportTicketRoutes); // Alias as per request
app.use("/api/invoices", invoiceRoutes);

// Health route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect before listening so Atlas/network errors fail fast with clear logs
(async () => {
  try {
    console.log("[Backend Debug] Connecting to MongoDB...");
    await connectDB();
    console.log("[Backend Debug] MongoDB Connected successfully.");
    
    const server = app.listen(PORT, () => {
      console.log(`\n================================================`);
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`================================================\n`);
      
      const sr = shiprocketService.getShiprocketEnvDiagnostics();
      if (sr.configuredForTracking) {
        console.log("[Shiprocket] API credentials loaded — courier tracking enabled.");
      } else {
        console.warn(
          `[Shiprocket] Courier tracking disabled: set ${sr.missingAuthEnv.join(", ")} in .env`
        );
      }
    });

    // Handle server-level errors
    server.on('error', (error) => {
      console.error("[CRITICAL] Server failed to start or encountered an error:");
      console.error(error);
      process.exit(1);
    });

  } catch (error) {
    console.error("[CRITICAL] Failed to initialize backend:");
    console.error(error);
    process.exit(1);
  }
})();

// Safety Net for unhandled errors
process.on("unhandledRejection", (err) => {
  console.error(`[CRITICAL] Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
  // Do not exit in dev, but log it clearly
});

process.on("uncaughtException", (err) => {
  console.error(`[CRITICAL] Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});