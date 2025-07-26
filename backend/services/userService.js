import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Review from '../models/Review.js';

class UserService {
  /**
   * Get current user profile
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');
    // Return both profiles if present
    return {
      ...user,
      seekerProfile: user.seekerProfile || null,
      providerProfile: user.providerProfile || null,
      roles: user.roles || []
    };
  }

  /**
   * Update current user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user object without password
   */
  async updateCurrentUser(userId, updateData) {
    try {
      // Remove sensitive fields that shouldn't be updated directly
      const { password, email, role, isActive, isBlocked, ...safeUpdateData } = updateData;

      // Validate location if provided
      if (safeUpdateData.profile?.location) {
        const location = safeUpdateData.profile.location;
        if (location.coordinates && (!Array.isArray(location.coordinates) || location.coordinates.length !== 2)) {
          throw new Error('Location coordinates must be an array of [longitude, latitude]');
        }
      }

      // Validate bio length if provided
      if (safeUpdateData.profile?.bio && safeUpdateData.profile.bio.length > 1000) {
        throw new Error('Bio cannot exceed 1000 characters');
      }

      // Validate name fields if provided
      if (safeUpdateData.name) {
        if (safeUpdateData.name.first && safeUpdateData.name.first.length < 2) {
          throw new Error('First name must be at least 2 characters');
        }
        if (safeUpdateData.name.last && safeUpdateData.name.last.length < 2) {
          throw new Error('Last name must be at least 2 characters');
        }
      }

      // Validate phone if provided
      if (safeUpdateData.phone) {
        const phoneRegex = /^(\+20|0)?1[0125][0-9]{8}$/;
        if (!phoneRegex.test(safeUpdateData.phone)) {
          throw new Error('Please enter a valid Egyptian phone number');
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: safeUpdateData },
        { 
          new: true, 
          runValidators: true,
          select: '-password'
        }
      );

      if (!updatedUser) {
        throw new Error('User not found');
      }

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get public user profile by ID
   */
  async getPublicUserProfile(userId, requestingUserId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');
    // Add trust signals for premium providers
    let trustSignals = {};
    if (user.roles.includes('provider') && user.isPremium) {
      trustSignals = {
        totalJobsCompleted: user.providerProfile?.totalJobsCompleted || 0,
        averageRating: user.providerProfile?.rating || 0,
        memberSince: user.createdAt,
        isVerified: user.isVerified || false
      };
    }
    // Return both profiles if present, plus trust signals
    return {
      ...user,
      seekerProfile: user.seekerProfile || null,
      providerProfile: user.providerProfile || null,
      roles: user.roles || [],
      ...trustSignals
    };
  }

  /**
   * Get user statistics based on role
   * @param {string} userId - User ID
   * @returns {Object} User statistics
   */
  async getUserStats(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      let stats = {
        userId: user._id,
        roles: user.roles || [],
        rating: user.rating || 0,
        reviewCount: user.reviewCount || 0
      };

      // Add role-specific stats
      if (user.roles.includes('provider')) {
        stats = {
          ...stats,
          totalJobsCompleted: user.providerProfile?.totalJobsCompleted || 0,
          totalEarnings: user.providerProfile?.totalEarnings || 0,
          averageRating: user.providerProfile?.rating || user.rating || 0,
          totalReviews: user.providerProfile?.reviewCount || user.reviewCount || 0,
          responseTime: user.providerProfile?.averageResponseTime || 'غير محدد',
          completionRate: user.providerProfile?.completionRate || 0
        };
      } else if (user.roles.includes('seeker')) {
        stats = {
          ...stats,
          totalJobsPosted: user.totalJobsPosted || 0,
          totalSpent: user.totalSpent || 0
        };
      }

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user exists and is active
   * @param {string} userId - User ID
   * @returns {boolean} True if user exists and is active
   */
  async userExistsAndActive(userId) {
    try {
      const user = await User.findById(userId);
      return user && user.isActive && !user.isBlocked;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update user rating and review count
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async updateUserRatingAndReviewCount(userId) {
    const user = await User.findById(userId);
    if (!user) return;
    // Get all reviews for this user
    const reviews = await Review.find({ reviewedUser: userId });
    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) : 0;
    user.rating = avgRating;
    user.reviewCount = reviewCount;
    // Also update providerProfile if user is a provider
    if (user.roles.includes('provider') && user.providerProfile) {
      user.providerProfile.rating = avgRating;
      user.providerProfile.reviewCount = reviewCount;
    }
    await user.save();
  }

  /**
   * Get provider skills for current user
   */
  async getProviderSkills(userId) {
    const user = await User.findById(userId).lean();
    if (!user || !user.roles.includes('provider')) throw new Error('User is not a provider');
    return user.providerProfile?.skills || [];
  }

  /**
   * Update provider skills for current user
   */
  async updateProviderSkills(userId, skills) {
    if (!Array.isArray(skills)) throw new Error('Skills must be an array');
    const user = await User.findById(userId);
    if (!user || !user.roles.includes('provider')) throw new Error('User is not a provider');
    user.providerProfile.skills = skills;
    await user.save();
    return user.providerProfile.skills;
  }

  async addPortfolioImage(userId, imageUrl) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { portfolio: imageUrl } },
      { new: true }
    );
    return user;
  }

  async removePortfolioImage(userId, imageUrl) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { portfolio: imageUrl } },
      { new: true }
    );
    return user;
  }

  /**
   * Get user's public listings/services
   */
  async getUserListings(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get user's service listings
    const ServiceListing = (await import('../models/ServiceListing.js')).default;
    const listings = await ServiceListing.find({ 
      provider: userId, 
      status: 'active' 
    }).populate('provider', 'name avatarUrl');

    return listings;
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get reviews for this user (when they were the provider)
    const Review = (await import('../models/Review.js')).default;
    const reviews = await Review.find({ 
      reviewedUser: userId 
    }).populate('reviewer', 'name avatarUrl').sort({ createdAt: -1 });

    return reviews;
  }

  /**
   * Update provider availability
   */
  async updateAvailability(userId, { workingDays, startTime, endTime }) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.providerProfile) user.providerProfile = {};
    user.providerProfile.workingDays = workingDays;
    user.providerProfile.startTime = startTime;
    user.providerProfile.endTime = endTime;
    await user.save();
    return user;
  }

  // Admin: Get all users (paginated, filterable)
  async getAllUsers({ page = 1, limit = 20, search = '', role, isVerified, isBlocked }) {
    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'name.first': { $regex: search, $options: 'i' } },
        { 'name.last': { $regex: search, $options: 'i' } },
      ];
    }
    if (role) {
      query.roles = role;
    }
    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }
    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(query);
    return {
      users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  // Admin: Block a user
  async blockUser(id, adminId) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    
    // Prevent admin from blocking themselves
    if (id === adminId) {
      throw new Error('Cannot block your own account');
    }
    
    user.isBlocked = true;
    await user.save();
    return user;
  }

  // Admin: Unblock a user
  async unblockUser(id, adminId) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    
    // Prevent admin from unblocking themselves (though this is less critical)
    if (id === adminId) {
      throw new Error('Cannot modify your own account status');
    }
    
    user.isBlocked = false;
    await user.save();
    return user;
  }

  // Get up to 5 premium providers for featured sections
  async getFeaturedPremiumProviders(limit = 5) {
    const users = await User.find({
      roles: 'provider',
      isPremium: true
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name avatarUrl providerProfile isPremium isTopRated isVerified createdAt profile.location');
    return users;
  }
}

export default new UserService(); 