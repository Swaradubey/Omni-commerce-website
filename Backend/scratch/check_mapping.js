const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CustomDomain = require('../models/CustomDomain');
const Product = require('../models/Product');

async function checkMapping() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const domain = 'retailverse.in';
    const domains = await CustomDomain.find({
      $or: [
        { domainName: domain },
        { domainName: `www.${domain}` },
        { domain: domain },
        { domain: `www.${domain}` }
      ]
    });

    console.log(`Found ${domains.length} mappings for ${domain}:`);
    for (const d of domains) {
      console.log(`- Domain: ${d.domainName || d.domain}, ClientId: ${d.clientId}`);
      const productCount = await Product.countDocuments({ clientId: d.clientId });
      console.log(`  Products count for this clientId: ${productCount}`);
    }

    // Also search for the "main" client if possible.
    // Usually the main client is the one with the most products?
    const allProductCounts = await Product.aggregate([
      { $group: { _id: "$clientId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\nTop clients by product count:');
    for (const c of allProductCounts.slice(0, 5)) {
        console.log(`- ClientId: ${c._id}, Count: ${c.count}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkMapping();
