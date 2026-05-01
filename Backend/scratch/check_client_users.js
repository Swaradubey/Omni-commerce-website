const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function checkAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const targetClientId = '69dce45464810f12af941695';
    const users = await User.find({ clientId: targetClientId });
    console.log(`Found ${users.length} users for clientId: ${targetClientId}:`);
    for (const u of users) {
      console.log(`- Email: ${u.email}, Role: ${u.role}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkAdmins();
