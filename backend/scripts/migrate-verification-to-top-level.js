// Migration script: Move profile verification to top-level user.verification
// Usage: node backend/scripts/migrate-verification-to-top-level.js

import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mohamedgshoaib:ulhBfsTrpI4r0Ohc@cluster0.ngjwxhp.mongodb.net/?';

async function migrate() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const users = await User.find({ $or: [
    { 'seekerProfile.verification': { $exists: true, $ne: null } },
    { 'providerProfile.verification': { $exists: true, $ne: null } }
  ] });

  let migrated = 0;
  for (const user of users) {
    let moved = false;
    // Prefer top-level if already exists
    if (!user.verification) {
      if (user.seekerProfile?.verification) {
        user.verification = user.seekerProfile.verification;
        moved = true;
      } else if (user.providerProfile?.verification) {
        user.verification = user.providerProfile.verification;
        moved = true;
      }
    }
    // Set isVerified if verification is approved
    if (user.verification && user.verification.status === 'approved') {
      user.isVerified = true;
    } else {
      user.isVerified = false;
    }
    // Remove old fields
    if (user.seekerProfile?.verification) {
      user.seekerProfile.verification = undefined;
      moved = true;
    }
    if (user.providerProfile?.verification) {
      user.providerProfile.verification = undefined;
      moved = true;
    }
    if (moved) {
      await user.save();
      migrated++;
      console.log(`Migrated user ${user._id}`);
    }
  }
  console.log(`Migration complete. Migrated ${migrated} users.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 