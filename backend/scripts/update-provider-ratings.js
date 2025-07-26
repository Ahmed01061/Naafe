import mongoose from 'mongoose';
import User from '../models/User.js';
import userService from '../services/userService.js';

const updateAllProviderRatings = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/naafe');
    console.log('Connected to MongoDB');

    // Find all users with provider role
    const providers = await User.find({ roles: 'provider' });
    console.log(`Found ${providers.length} providers to update`);

    // Update each provider's rating
    for (const provider of providers) {
      try {
        await userService.updateUserRatingAndReviewCount(provider._id.toString());
        console.log(`Updated rating for provider: ${provider.name.first} ${provider.name.last} (${provider._id})`);
      } catch (error) {
        console.error(`Failed to update rating for provider ${provider._id}:`, error.message);
      }
    }

    console.log('Provider rating update completed');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
};

updateAllProviderRatings(); 