import userService from '../services/userService.js';
import { logger } from '../middlewares/logging.middleware.js';
import UpgradeRequest from '../models/UpgradeRequest.js';
import jobRequestService from '../services/jobRequestService.js';

class UserController {
  /**
   * Get current user profile
   * GET /api/users/me
   */
  async getCurrentUser(req, res) {
    try {
      const userId = req.user._id;
      const user = await userService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: {
          user
        },
        message: 'User profile retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      if (error.message.includes('Account is blocked') || error.message.includes('Account is deactivated')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.error(`Get current user error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update current user profile
   * PATCH /api/users/me
   */
  async updateCurrentUser(req, res) {
    try {
      const userId = req.user._id;
      const updateData = req.body;

      const updatedUser = await userService.updateCurrentUser(userId, updateData);

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      if (error.message.includes('Location coordinates') || 
          error.message.includes('Bio cannot exceed') ||
          error.message.includes('First name must be') ||
          error.message.includes('Last name must be') ||
          error.message.includes('valid Egyptian phone number')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationErrors
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.error(`Update current user error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get public user profile by ID
   * GET /api/users/:id
   */
  async getPublicUserProfile(req, res) {
    try {
      const { id } = req.params;
      const requestingUserId = req.user?._id; // Optional, for authenticated requests

      const publicProfile = await userService.getPublicUserProfile(id, requestingUserId);

      res.status(200).json({
        success: true,
        data: {
          user: publicProfile
        },
        message: 'User profile retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('User not found') || error.message.includes('User profile not available')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.error(`Get public user profile error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/users/:id/stats
   */
  async getUserStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await userService.getUserStats(id);

      res.status(200).json({
        success: true,
        data: {
          stats
        },
        message: 'User statistics retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.error(`Get user stats error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all upgrade requests for the current user
   * GET /api/upgrade-requests/me
   */
  async getAllMyUpgradeRequests(req, res) {
    try {
      const userId = req.user._id;
      const requests = await UpgradeRequest.find({ userId }).sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: { requests },
        message: 'تم جلب جميع طلبات الترقية بنجاح',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Get all my upgrade requests error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'حدث خطأ أثناء جلب طلبات الترقية' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Mark all unviewed upgrade requests as viewed for the current user
   * PATCH /api/upgrade-requests/viewed
   */
  async markUpgradeRequestsViewed(req, res) {
    try {
      const userId = req.user._id;
      await UpgradeRequest.updateMany({ userId, viewedByUser: false, status: { $in: ['accepted', 'rejected'] } }, { $set: { viewedByUser: true } });
      res.status(200).json({
        success: true,
        message: 'تم تحديث حالة الاطلاع على الطلبات',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Mark upgrade requests viewed error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'حدث خطأ أثناء تحديث حالة الاطلاع' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get provider skills for current user
   * GET /api/users/me/skills
   */
  async getProviderSkills(req, res) {
    try {
      const userId = req.user._id;
      const skills = await userService.getProviderSkills(userId);
      res.status(200).json({
        success: true,
        data: { skills },
        message: 'Provider skills retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update provider skills for current user
   * PATCH /api/users/me/skills
   */
  async updateProviderSkills(req, res) {
    try {
      const userId = req.user._id;
      const { skills } = req.body;
      const updatedSkills = await userService.updateProviderSkills(userId, skills);
      res.status(200).json({
        success: true,
        data: { skills: updatedSkills },
        message: 'Provider skills updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update provider availability
   * PATCH /api/users/me/availability
   */
  async updateAvailability(req, res) {
    try {
      const userId = req.user._id;
      const { workingDays, startTime, endTime } = req.body;
      const user = await userService.updateAvailability(userId, { workingDays, startTime, endTime });
      res.status(200).json({
        success: true,
        data: { user },
        message: 'Availability updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get provider availability
   * GET /api/users/me/availability
   */
  async getAvailability(req, res) {
    try {
      const userId = req.user._id;
      const user = await userService.getCurrentUser(userId);
      if (!user.providerProfile) {
        return res.status(404).json({
          success: false,
          error: { message: 'Provider profile not found' },
          timestamp: new Date().toISOString()
        });
      }
      const { workingDays, startTime, endTime } = user.providerProfile;
      res.status(200).json({
        success: true,
        data: { workingDays, startTime, endTime },
        message: 'Availability fetched successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Portfolio: Get own portfolio
  async getOwnPortfolio(req, res) {
    try {
      const user = await userService.getCurrentUser(req.user._id);
      res.json({ success: true, data: { images: user.portfolio || [] } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // Portfolio: Add image
  async addPortfolioImage(req, res) {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) return res.status(400).json({ success: false, error: { message: 'Missing imageUrl' } });
      const user = await userService.addPortfolioImage(req.user._id, imageUrl);
      res.json({ success: true, data: { images: user.portfolio } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // Portfolio: Remove image
  async removePortfolioImage(req, res) {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) return res.status(400).json({ success: false, error: { message: 'Missing imageUrl' } });
      const user = await userService.removePortfolioImage(req.user._id, imageUrl);
      res.json({ success: true, data: { images: user.portfolio } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // Portfolio: Get public user portfolio
  async getUserPortfolio(req, res) {
    try {
      const user = await userService.getPublicUserProfile(req.params.id);
      res.json({ success: true, data: { images: user.portfolio || [] } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Get user's public listings/services
   * GET /api/users/:id/listings
   */
  async getUserListings(req, res) {
    try {
      const { id } = req.params;
      const listings = await userService.getUserListings(id);

      res.status(200).json({
        success: true,
        data: {
          listings
        },
        message: 'User listings retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.error(`Get user listings error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user listings'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user's reviews
   * GET /api/users/:id/reviews
   */
  async getUserReviews(req, res) {
    try {
      const { id } = req.params;
      const reviews = await userService.getUserReviews(id);

      res.status(200).json({
        success: true,
        data: {
          reviews
        },
        message: 'User reviews retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.error(`Get user reviews error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user reviews'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get up to 5 featured premium providers for homepage/category
   * GET /api/providers/featured
   */
  async getFeaturedPremiumProviders(req, res) {
    try {
      const providers = await userService.getFeaturedPremiumProviders(5);
      res.status(200).json({
        success: true,
        data: { providers },
        message: 'Featured premium providers retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Get featured premium providers error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get targeted leads for the current provider (premium only)
   * GET /api/providers/me/targeted-leads
   */
  async getTargetedLeads(req, res) {
    try {
      const providerId = req.user._id;
      const filters = req.query;
      const leads = await jobRequestService.getTargetedLeadsForProvider(providerId, filters);
      res.status(200).json({ success: true, data: { leads }, message: 'Targeted leads retrieved successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  }

  // Admin: Get all users (paginated, filterable)
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, search = '', role, isVerified, isBlocked } = req.query;
      const result = await userService.getAllUsers({ page, limit, search, role, isVerified, isBlocked });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
  }

  // Admin: Block a user
  async blockUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      await userService.blockUser(id, adminId);
      res.json({ message: 'User blocked successfully' });
    } catch (err) {
      res.status(400).json({ message: 'Failed to block user', error: err.message });
    }
  }

  // Admin: Unblock a user
  async unblockUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      await userService.unblockUser(id, adminId);
      res.json({ message: 'User unblocked successfully' });
    } catch (err) {
      res.status(400).json({ message: 'Failed to unblock user', error: err.message });
    }
  }
}

export default new UserController(); 