import Review from '../models/Review.js';
import User from '../models/User.js';
import userService from '../services/userService.js';

class ReviewController {
  /**
   * Create a review for a user (as seeker or provider)
   * POST /api/reviews
   */
  async createReview(req, res) {
    try {
      const { reviewedUser, role, rating, comment, jobRequest, serviceListing } = req.body;
      const reviewer = req.user._id;

      // Validate role
      if (!['seeker', 'provider'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid review role' },
          timestamp: new Date().toISOString()
        });
      }

      // Validate reviewed user has the role
      const user = await User.findById(reviewedUser);
      if (!user || !user.roles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `User does not have the role: ${role}` },
          timestamp: new Date().toISOString()
        });
      }

      // Create review
      const review = new Review({
        reviewer,
        reviewedUser,
        role,
        rating,
        comment,
        jobRequest,
        serviceListing
      });
      await review.save();

      // Update the reviewed user's rating and review count
      await userService.updateUserRatingAndReviewCount(reviewedUser);

      res.status(201).json({
        success: true,
        data: { review },
        message: 'Review created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get reviews for a user by role
   * GET /api/reviews/user/:userId?role=provider|seeker
   */
  async getUserReviews(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.query;
      if (role && !['seeker', 'provider'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid review role' },
          timestamp: new Date().toISOString()
        });
      }
      const filter = { reviewedUser: userId };
      if (role) filter.role = role;
      const reviews = await Review.find(filter).sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: { reviews },
        message: 'Reviews retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  // ...other review endpoints as needed...
}

export default new ReviewController(); 