const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const connectDB = require("./config/db");

dotenv.config();

const seedUser = async () => {
  try {
    await connectDB();

    // Remove existing demo user if present
    await User.deleteMany({ email: "swara@example.com" });

    const demoUser = {
      name: "Swara Kumari",
      email: "swara@example.com",
      password: "123456",
      role: "customer",
      storeId: "",
      isActive: true,
    };

    const user = await User.create(demoUser);

    console.log("Demo user created successfully:");
    console.log({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      passwordHash: user.password,
    });

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding user: ${error.message}`);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedUser();
