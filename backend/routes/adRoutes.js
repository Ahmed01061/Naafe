import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import adController from '../controllers/adController.js';

const router = express.Router();

/**
 * @route   POST /api/ads
 * @desc    Create a new advertisement
 * @access  Private
 * @body    {string} type - Ad type (featured, sidebar, banner)
 * @body    {string} title - Ad title
 * @body    {string} description - Ad description
 * @body    {string} imageUrl - Ad image URL
 * @body    {string} targetUrl - Target URL for the ad
 * @body    {string} duration - Duration (daily, weekly, monthly)
 * @body    {object} targeting - Targeting options
 * @returns {object} Created ad
 */
router.post('/', authenticateToken, adController.createAd);

/**
 * @route   POST /api/ads/:id/checkout
 * @desc    Create Stripe checkout session for ad purchase
 * @access  Private
 * @param   {string} id - Ad ID
 * @returns {object} Checkout session URL
 */
router.post('/:id/checkout', authenticateToken, adController.createCheckoutSession);

/**
 * @route   GET /api/ads/active
 * @desc    Get active ads for display
 * @access  Public
 * @query   {string} type - Filter by ad type
 * @query   {string} location - Filter by location
 * @query   {string} category - Filter by category
 * @returns {array} Active ads
 */
router.get('/active', adController.getActiveAds);

/**
 * @route   GET /api/ads/my-ads
 * @desc    Get user's ads
 * @access  Private
 * @query   {string} status - Filter by status
 * @query   {string} type - Filter by type
 * @returns {array} User's ads
 */
router.get('/my-ads', authenticateToken, adController.getUserAds);

/**
 * @route   GET /api/ads/stats
 * @desc    Get ad statistics for user
 * @access  Private
 * @returns {object} Ad statistics
 */
router.get('/stats', authenticateToken, adController.getAdStats);

/**
 * @route   GET /api/ads/:id
 * @desc    Get ad by ID
 * @access  Public
 * @param   {string} id - Ad ID
 * @returns {object} Ad details
 */
router.get('/:id', adController.getAdById);

/**
 * @route   PATCH /api/ads/:id/status
 * @desc    Update ad status
 * @access  Private (Owner or Admin)
 * @param   {string} id - Ad ID
 * @body    {string} status - New status
 * @body    {string} adminNotes - Admin notes (optional)
 * @returns {object} Updated ad
 */
router.patch('/:id/status', authenticateToken, adController.updateAdStatus);

/**
 * @route   POST /api/ads/:id/cancel
 * @desc    Cancel ad and process refund
 * @access  Private (Owner)
 * @param   {string} id - Ad ID
 * @returns {object} Cancellation result with refund details
 */
router.post('/:id/cancel', authenticateToken, adController.cancelAd);

/**
 * @route   POST /api/ads/:id/refund-estimate
 * @desc    Get refund estimate for ad cancellation
 * @access  Private (Owner)
 * @param   {string} id - Ad ID
 * @returns {object} Refund estimate details
 */
router.post('/:id/refund-estimate', authenticateToken, adController.getRefundEstimate);

/**
 * @route   DELETE /api/ads/:id
 * @desc    Delete ad
 * @access  Private (Owner or Admin)
 * @param   {string} id - Ad ID
 * @returns {object} Success message
 */
router.delete('/:id', authenticateToken, adController.deleteAd);

/**
 * @route   POST /api/ads/:id/impression
 * @desc    Track ad impression
 * @access  Public
 * @param   {string} id - Ad ID
 * @returns {object} Success message
 */
router.post('/:id/impression', adController.trackImpression);

/**
 * @route   POST /api/ads/:id/click
 * @desc    Track ad click
 * @access  Public
 * @param   {string} id - Ad ID
 * @returns {object} Success message
 */
router.post('/:id/click', adController.trackClick);

export default router; 