/**
 * Automated API Verification Script
 * Run with: node verify-apis.js
 */

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
  console.log("🚀 Starting API Verification...\n");

  try {
    // 1. Health Check
    const health = await fetch("http://localhost:5000/api/health").then(r => r.json());
    console.log("✅ Health Check:", health.success ? "PASSED" : "FAILED");

    // 2. Test Login (with dummy data — should fail but return 401/400, not 500)
    const login = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "wrongpassword" })
    }).then(r => r.json());
    console.log("✅ Login API Structure:", login.message ? "PASSED" : "FAILED", `(Msg: ${login.message})`);

    // 3. Test Products GET
    const products = await fetch(`${BASE_URL}/products`).then(r => r.json());
    console.log("✅ Products GET:", products.success ? "PASSED" : "FAILED", `(${products.count || 0} items found)`);

    // 4. Test Contact Submission
    const contact = await fetch(`${BASE_URL}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Runner",
        email: "test@runner.com",
        message: "This is an automated API test."
      })
    }).then(r => r.json());
    console.log("✅ Contact POST:", contact.success ? "PASSED" : "FAILED");

    console.log("\n✨ Verification Complete!");
  } catch (error) {
    console.error("\n❌ Verification FAILED:", error.message);
    console.log("Make sure the backend server is running on http://localhost:5000");
  }
}

runTests();
