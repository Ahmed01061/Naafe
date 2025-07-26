import express from 'express';
import userController from '../controllers/userController.js';
import jobRequestController from '../controllers/jobRequestController.js';
import { validateUpdateProfile, validateUserId } from '../validation/userValidation.js';
import { authenticateToken, optionalAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, userController.getCurrentUser);

/**
 * @route   PATCH /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.patch('/me', authenticateToken, validateUpdateProfile, userController.updateCurrentUser);

/**
 * @route   GET /api/users/me/requests
 * @desc    Get current user's job requests
 * @access  Private
 */
router.get('/me/requests', authenticateToken, jobRequestController.getMyJobRequests);

/**
 * @route   GET /api/users/me/skills
 * @desc    Get current user's provider skills
 * @access  Private
 */
router.get('/me/skills', authenticateToken, userController.getProviderSkills);

/**
 * @route   PATCH /api/users/me/skills
 * @desc    Update current user's provider skills
 * @access  Private
 */
router.patch('/me/skills', authenticateToken, userController.updateProviderSkills);

/**
 * @route   GET /api/users/me/portfolio
 * @desc    Get current user's portfolio images
 * @access  Private
 */
router.get('/me/portfolio', authenticateToken, userController.getOwnPortfolio);
/**
 * @route   POST /api/users/me/portfolio
 * @desc    Add a portfolio image to current user
 * @access  Private
 */
router.post('/me/portfolio', authenticateToken, userController.addPortfolioImage);
/**
 * @route   DELETE /api/users/me/portfolio
 * @desc    Remove a portfolio image from current user
 * @access  Private
 */
router.delete('/me/portfolio', authenticateToken, userController.removePortfolioImage);

/**
 * @route   GET /api/users/me/availability
 * @desc    Get current user's availability
 * @access  Private
 */
router.get('/me/availability', authenticateToken, userController.getAvailability);

/**
 * @route   PATCH /api/users/me/availability
 * @desc    Update current user's availability
 * @access  Private
 */
router.patch('/me/availability', authenticateToken, userController.updateAvailability);

/**
 * @route   GET /api/users/:id
 * @desc    Get public user profile by ID
 * @access  Public (with optional auth)
 */
router.get('/:id', optionalAuth, validateUserId, userController.getPublicUserProfile);

/**
 * @route   GET /api/users/:id/portfolio
 * @desc    Get public user's portfolio images
 * @access  Public
 */
router.get('/:id/portfolio', optionalAuth, userController.getUserPortfolio);

/**
 * @route   GET /api/users/:id/stats
 * @desc    Get user statistics
 * @access  Public
 */
router.get('/:id/stats', validateUserId, userController.getUserStats);

/**
 * @route   GET /api/users/:id/listings
 * @desc    Get user's public listings/services
 * @access  Public
 */
router.get('/:id/listings', validateUserId, userController.getUserListings);

/**
 * @route   GET /api/users/:id/reviews
 * @desc    Get user's reviews
 * @access  Public
 */
router.get('/:id/reviews', validateUserId, userController.getUserReviews);

// Admin: Get all users (paginated, filterable)
router.get('/', authenticateToken, requireRole(['admin']), userController.getAllUsers);
// Admin: Block a user
router.patch('/:id/block', authenticateToken, requireRole(['admin']), userController.blockUser);
// Admin: Unblock a user
router.patch('/:id/unblock', authenticateToken, requireRole(['admin']), userController.unblockUser);

// Featured premium providers for homepage/category
router.get('/providers/featured', userController.getFeaturedPremiumProviders);
// Targeted leads for premium providers
router.get('/providers/me/targeted-leads', authenticateToken, userController.getTargetedLeads);

export default router; 