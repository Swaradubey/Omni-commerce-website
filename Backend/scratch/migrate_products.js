const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

async function migrateProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const targetClientId = '69dce45464810f12af941695'; // Kirana store
    
    console.log(`Updating all products to clientId: ${targetClientId}`);
    const productResult = await Product.updateMany({}, { $set: { clientId: targetClientId } });
    console.log(`Updated ${productResult.modifiedCount} products.`);

    console.log(`Updating all inventories to clientId: ${targetClientId}`);
    const inventoryResult = await Inventory.updateMany({}, { $set: { clientId: targetClientId } });
    console.log(`Updated ${inventoryResult.modifiedCount} inventories.`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

migrateProducts();
