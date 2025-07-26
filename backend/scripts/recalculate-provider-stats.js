// backend/scripts/recalculate-provider-stats.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Review from '../models/Review.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/naafe';

async function recalculateProviderStats() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const providers = await User.find({ roles: 'provider' });
  let updatedCount = 0;

  for (const provider of providers) {
    // Get all reviews for this provider
    const reviews = await Review.find({ reviewedUser: provider._id });
    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) : 0;
    provider.rating = avgRating;
    provider.reviewCount = reviewCount;
    if (provider.providerProfile) {
      provider.providerProfile.rating = avgRating;
      provider.providerProfile.reviewCount = reviewCount;
    }
    await provider.save();
    updatedCount++;
    console.log(`Updated provider ${provider.email} (${provider._id}): rating=${avgRating}, reviews=${reviewCount}`);
  }

  console.log(`\nUpdated stats for ${updatedCount} providers.`);
  await mongoose.disconnect();
  process.exit(0);
}

recalculateProviderStats().catch(err => {
  console.error('Error updating provider stats:', err);
  process.exit(1);
}); 