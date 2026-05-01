const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CustomDomain = require('../models/CustomDomain');

async function addMainDomainMapping() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const targetClientId = '69dce45464810f12af941695'; // Kirana store
    
    const domains = ['storesetgo.online', 'www.storesetgo.online'];
    
    for (const d of domains) {
      const existing = await CustomDomain.findOne({ domainName: d });
      if (existing) {
        existing.clientId = targetClientId;
        await existing.save();
        console.log(`Updated existing mapping for ${d}`);
      } else {
        await CustomDomain.create({
          domainName: d,
          clientId: targetClientId,
          isActive: true
        });
        console.log(`Created new mapping for ${d}`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

addMainDomainMapping();
