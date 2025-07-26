import express from 'express';
import AdminController from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.js';
import User from '../models/User.js';
import userService from '../services/userService.js';

const router = express.Router();

const adminController = new AdminController();

// GET /api/admin/stats - Admin dashboard stats
router.get('/stats', authenticateToken, requireRole(['admin']), adminController.getDashboardStats.bind(adminController));

// GET /api/admin/charts/user-growth - User growth chart data
router.get('/charts/user-growth', authenticateToken, requireRole(['admin']), adminController.getUserGrowthData.bind(adminController));

// GET /api/admin/charts/service-categories - Service categories chart data
router.get('/charts/service-categories', authenticateToken, requireRole(['admin']), adminController.getServiceCategoriesData.bind(adminController));

// GET /api/admin/charts/revenue - Revenue chart data
router.get('/charts/revenue', authenticateToken, requireRole(['admin']), adminController.getRevenueData.bind(adminController));

// GET /api/admin/activity - Recent activity data
router.get('/activity', authenticateToken, requireRole(['admin']), adminController.getRecentActivity.bind(adminController));

// Upgrade Requests
router.get('/upgrade-requests', authenticateToken, requireRole(['admin']), AdminController.getUpgradeRequests);
router.post('/upgrade-requests/:id/accept', authenticateToken, requireRole(['admin']), AdminController.acceptUpgradeRequest);
router.post('/upgrade-requests/:id/reject', authenticateToken, requireRole(['admin']), AdminController.rejectUpgradeRequest);

// User submits an upgrade request (with attachments)
router.post('/upgrade-requests', authenticateToken, requireRole(['admin', 'seeker']), async (req, res) => {
  try {
    const { user } = req;
    const { attachments, comment } = req.body;
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'يجب رفع صورة واحدة على الأقل' } });
    }
    // Validate all are image URLs
    for (const url of attachments) {
      if (typeof url !== 'string' || !url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        return res.status(400).json({ success: false, error: { message: 'جميع المرفقات يجب أن تكون روابط صور صالحة' } });
      }
    }
    const UpgradeRequest = (await import('../models/UpgradeRequest.js')).default;
    // Check for existing pending request
    const existing = await UpgradeRequest.findOne({ userId: user._id, status: 'pending' });
    // Enforce max 3 requests per user
    const totalRequests = await UpgradeRequest.countDocuments({ userId: user._id });
    if (totalRequests >= 3) {
      return res.status(400).json({ success: false, error: { message: 'لقد وصلت إلى الحد الأقصى لعدد محاولات الترقية (3 مرات)' } });
    }
    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'لديك طلب ترقية قيد الانتظار بالفعل' }, data: { request: existing } });
    }
    const newRequest = await UpgradeRequest.create({
      userId: user._id,
      attachments,
      status: 'pending',
      comment: comment || '',
    });
    res.json({ success: true, data: { request: newRequest } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Update provider rating (temporary endpoint for testing)
 * POST /api/admin/update-provider-rating/:userId
 */
router.post('/update-provider-rating/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    await userService.updateUserRatingAndReviewCount(userId);
    
    res.json({
      success: true,
      message: `Updated rating for provider ${userId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Update all provider ratings (temporary endpoint for testing)
 * POST /api/admin/update-all-provider-ratings
 */
router.post('/update-all-provider-ratings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const providers = await User.find({ roles: 'provider' });
    let updatedCount = 0;
    
    for (const provider of providers) {
      try {
        await userService.updateUserRatingAndReviewCount(provider._id.toString());
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update provider ${provider._id}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: `Updated ratings for ${updatedCount} providers`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 