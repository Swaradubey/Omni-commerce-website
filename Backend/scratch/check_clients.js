const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Client = require('../models/Client');

async function checkClients() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const clients = await Client.find({});
    console.log(`Found ${clients.length} clients:`);
    for (const c of clients) {
      console.log(`- ID: ${c._id}, Name: ${c.companyName}, Shop: ${c.shopName}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkClients();
