const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/Product");

const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const products = [
  // Electronics
  {
    name: "Quantum Ultra Wireless Headphones",
    sku: "ELE-PH-001",
    category: "Electronics",
    price: 349.99,
    originalPrice: 449.99,
    isFeatured: true,
    stock: 25,
    description: "Next-gen spatial audio with 60-hour battery life and advanced noise cancellation.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Mirrorless 4K Pro Camera",
    sku: "ELE-CAM-002",
    category: "Electronics",
    price: 1299.00,
    isFeatured: true,
    stock: 8,
    description: "Professional mirrorless camera with 4K 60fps video recording and 24MP sensor.",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Ultra-Slim OLED Laptop",
    sku: "ELE-LAP-003",
    category: "Electronics",
    price: 1599.99,
    originalPrice: 1799.99,
    isFeatured: true,
    stock: 12,
    description: "Powerful performance meets stunning OLED display in a thin and light aluminum body.",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=1000"
  },

  // Accessories
  {
    name: "Handcrafted Leather Wallet",
    sku: "ACC-WLT-001",
    category: "Accessories",
    price: 75.00,
    stock: 50,
    description: "Premium full-grain leather wallet with RFID protection and slim design.",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Polarized Aviator Sunglasses",
    sku: "ACC-SUN-002",
    category: "Accessories",
    price: 120.00,
    stock: 30,
    description: "Classic aviator style with polarized lenses for superior glare reduction.",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Titanium Mechanical Watch",
    sku: "ACC-WCH-003",
    category: "Accessories",
    price: 450.00,
    originalPrice: 550.0,
    isFeatured: true,
    stock: 5,
    description: "Automatic mechanical movement housed in a lightweight titanium case.",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=1000"
  },

  // Food & Beverage
  {
    name: "Artisan Dark Roast Coffee",
    sku: "FNB-COF-001",
    category: "Food & Beverage",
    price: 24.99,
    stock: 100,
    description: "Small-batch roasted Arabica beans with notes of chocolate and caramel.",
    image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Organic Matcha Green Tea",
    sku: "FNB-TEA-002",
    category: "Food & Beverage",
    price: 35.00,
    stock: 60,
    description: "Ceremonial grade pure matcha powder from Uji, Japan.",
    image: "https://images.unsplash.com/photo-1582793988951-9aed5509eb97?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Raw Wildflower Honey",
    sku: "FNB-HNY-003",
    category: "Food & Beverage",
    price: 18.50,
    stock: 45,
    description: "Unfiltered and unpasteurized honey harvested from local wildflower meadows.",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=1000"
  },

  // Home & Living
  {
    name: "Ceramic Minimalist Vase",
    sku: "HML-VAS-001",
    category: "Home & Living",
    price: 45.00,
    stock: 20,
    description: "Elegant matte ceramic vase perfect for modern home decor.",
    image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Weighted Velvet Throw",
    sku: "HML-BLN-002",
    category: "Home & Living",
    price: 129.99,
    stock: 15,
    description: "Luxurious weighted blanket for improved sleep and relaxation.",
    image: "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Smart Ambient Lamp",
    sku: "HML-LMP-003",
    category: "Home & Living",
    price: 89.00,
    isFeatured: true,
    stock: 40,
    description: "App-controlled LED lamp with 16 million colors and sunrise simulation.",
    image: "https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&q=80&w=1000"
  },

  // Health & Beauty
  {
    name: "Hyaluronic Acid Serum",
    sku: "HNB-SRM-001",
    category: "Health & Beauty",
    price: 38.00,
    stock: 80,
    description: "Deeply hydrating serum with pure hyaluronic acid and Vitamin B5.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Electric Sonic Toothbrush",
    sku: "HNB-TBR-002",
    category: "Health & Beauty",
    price: 110.00,
    stock: 25,
    description: "Advanced sonic technology for a superior clean and healthier gums.",
    image: "https://images.unsplash.com/photo-1559591937-e62ca344f6f2?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Aromatherapy Diffuser",
    sku: "HNB-DIF-003",
    category: "Health & Beauty",
    price: 55.00,
    stock: 35,
    description: "Ultra-quiet ultrasonic diffuser with wood grain finish and 7 color LEDs.",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=1000"
  },

  // Footwear
  {
    name: "Urban Knit Sneakers",
    sku: "FTW-SNK-001",
    category: "Footwear",
    price: 95.00,
    stock: 45,
    description: "Breathable knit upper with responsive cushioning for all-day comfort.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Classic Chelsea Boots",
    sku: "FTW-BTS-002",
    category: "Footwear",
    price: 185.00,
    stock: 20,
    description: "Timeless suede Chelsea boots with elastic side panels and durable sole.",
    image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Performance Trail Runner",
    sku: "FTW-RUN-003",
    category: "Footwear",
    price: 140.00,
    stock: 15,
    description: "Rugged outsole and waterproof upper for extreme trail conditions.",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=1000"
  },

  // Sports & Fitness
  {
    name: "Non-Slip Yoga Mat",
    sku: "SNF-MAT-001",
    category: "Sports & Fitness",
    price: 65.00,
    stock: 50,
    description: "Eco-friendly natural rubber mat with excellent grip and 5mm cushioning.",
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Adjustable Dumbbell Set",
    sku: "SNF-DBL-002",
    category: "Sports & Fitness",
    price: 299.00,
    stock: 10,
    description: "Space-saving adjustable dumbbells replacing 15 sets of weights.",
    image: "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Pro Resistance Bands",
    sku: "SNF-BND-003",
    category: "Sports & Fitness",
    price: 35.00,
    stock: 100,
    description: "Set of 5 heavy-duty latex bands for full-body strength training.",
    image: "https://images.unsplash.com/photo-1598289431512-b97b0917abbc?auto=format&fit=crop&q=80&w=1000"
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    await Product.deleteMany({});
    console.log("Cleared existing products.");

    await Product.insertMany(products);
    console.log("Seeded products successfully!");

    process.exit();
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedDB();
