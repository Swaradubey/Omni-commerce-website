const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function updateAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const targetClientId = '69dce45464810f12af941695';
    
    // Update super admins and main admins
    const emails = ['hexerve@gmail.com', 'hexerv@gmail.com', 'admin@pos.com'];
    const result = await User.updateMany(
      { email: { $in: emails } },
      { $set: { clientId: targetClientId } }
    );
    console.log(`Updated ${result.modifiedCount} admin users.`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

updateAdmin();
