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
    
    const domainPairs = [
      { domainName: 'storesetgo.online', domain: 'storesetgo.online' },
      { domainName: 'www.storesetgo.online', domain: 'www.storesetgo.online' }
    ];
    
    for (const pair of domainPairs) {
      const existing = await CustomDomain.findOne({ domainName: pair.domainName });
      if (existing) {
        existing.clientId = targetClientId;
        existing.domain = pair.domain;
        await existing.save();
        console.log(`Updated existing mapping for ${pair.domainName}`);
      } else {
        await CustomDomain.create({
          domainName: pair.domainName,
          domain: pair.domain,
          clientId: targetClientId,
          status: 'Verified'
        });
        console.log(`Created new mapping for ${pair.domainName}`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

addMainDomainMapping();
