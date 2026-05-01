const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ role: { $in: ['admin', 'super_admin'] } });
    console.log(`Found ${users.length} admin/super_admin users:`);
    for (const u of users) {
      console.log(`- Email: ${u.email}, Role: ${u.role}, ClientId: ${u.clientId}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
