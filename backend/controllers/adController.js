import adService from '../services/adService.js';

class AdController {
  /**
   * Create a new advertisement
   * POST /api/ads
   */
  async createAd(req, res) {
    try {
      const adData = req.body;
      const userId = req.user._id;

      // Validate required fields
      const requiredFields = ['type', 'title', 'description', 'imageUrl', 'targetUrl', 'duration'];
      for (const field of requiredFields) {
        if (!adData[field]) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_FIELD',
              message: `حقل ${field} مطلوب`
            }
          });
        }
      }

      const ad = await adService.createAd(adData, userId);

      res.status(201).json({
        success: true,
        data: ad,
        message: 'تم إنشاء الإعلان بنجاح'
      });
    } catch (error) {
      console.error('Error creating ad:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error.message || 'حدث خطأ أثناء إنشاء الإعلان'
        }
      });
    }
  }

  /**
   * Create checkout session for ad purchase
   * POST /api/ads/:id/checkout
   */
  async createCheckoutSession(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const session = await adService.createCheckoutSession(id, userId);

      res.status(200).json({
        success: true,
        data: session,
        message: 'تم إنشاء جلسة الدفع بنجاح'
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CHECKOUT_ERROR',
          message: error.message || 'حدث خطأ أثناء إنشاء جلسة الدفع'
        }
      });
    }
  }

  /**
   * Get active ads for display
   * GET /api/ads/active
   */
  async getActiveAds(req, res) {
    try {
      const filters = req.query;
      const ads = await adService.getActiveAds(filters);

      res.status(200).json({
        success: true,
        data: ads,
        message: 'تم جلب الإعلانات النشطة بنجاح'
      });
    } catch (error) {
      console.error('Error getting active ads:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'حدث خطأ أثناء جلب الإعلانات'
        }
      });
    }
  }

  /**
   * Get user's ads
   * GET /api/ads/my-ads
   */
  async getUserAds(req, res) {
    try {
      const userId = req.user._id;
      const filters = req.query;
      
      const ads = await adService.getUserAds(userId, filters);

      res.status(200).json({
        success: true,
        data: ads,
        message: 'تم جلب إعلاناتك بنجاح'
      });
    } catch (error) {
      console.error('Error getting user ads:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'حدث خطأ أثناء جلب إعلاناتك'
        }
      });
    }
  }

  /**
   * Get ad statistics
   * GET /api/ads/stats
   */
  async getAdStats(req, res) {
    try {
      const userId = req.user._id;
      const stats = await adService.getAdStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'تم جلب إحصائيات الإعلانات بنجاح'
      });
    } catch (error) {
      console.error('Error getting ad stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: error.message || 'حدث خطأ أثناء جلب الإحصائيات'
        }
      });
    }
  }

  /**
   * Update ad status
   * PATCH /api/ads/:id/status
   */
  async updateAdStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      const userId = req.user._id;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_STATUS',
            message: 'حالة الإعلان مطلوبة'
          }
        });
      }

      const ad = await adService.updateAdStatus(id, userId, status, adminNotes);

      res.status(200).json({
        success: true,
        data: ad,
        message: 'تم تحديث حالة الإعلان بنجاح'
      });
    } catch (error) {
      console.error('Error updating ad status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'حدث خطأ أثناء تحديث حالة الإعلان'
        }
      });
    }
  }

  /**
   * Track ad impression
   * POST /api/ads/:id/impression
   */
  async trackImpression(req, res) {
    try {
      const { id } = req.params;
      
      // Track impression asynchronously (don't wait for it)
      adService.trackImpression(id);

      res.status(200).json({
        success: true,
        message: 'تم تتبع المشاهدة'
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TRACKING_ERROR',
          message: 'حدث خطأ أثناء تتبع المشاهدة'
        }
      });
    }
  }

  /**
   * Track ad click
   * POST /api/ads/:id/click
   */
  async trackClick(req, res) {
    try {
      const { id } = req.params;
      
      // Track click asynchronously (don't wait for it)
      adService.trackClick(id);

      res.status(200).json({
        success: true,
        message: 'تم تتبع النقر'
      });
    } catch (error) {
      console.error('Error tracking click:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TRACKING_ERROR',
          message: 'حدث خطأ أثناء تتبع النقر'
        }
      });
    }
  }

  /**
   * Get ad by ID
   * GET /api/ads/:id
   */
  async getAdById(req, res) {
    try {
      const { id } = req.params;
      const Ad = (await import('../models/Ad.js')).default;
      
      const ad = await Ad.findById(id)
        .populate('advertiserId', 'name email avatarUrl');

      if (!ad) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'الإعلان غير موجود'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: ad,
        message: 'تم جلب الإعلان بنجاح'
      });
    } catch (error) {
      console.error('Error getting ad by ID:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'حدث خطأ أثناء جلب الإعلان'
        }
      });
    }
  }

  /**
   * Cancel ad and process refund
   * POST /api/ads/:id/cancel
   */
  async cancelAd(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const result = await adService.cancelAd(id, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error('Error cancelling ad:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CANCEL_ERROR',
          message: error.message || 'حدث خطأ أثناء إلغاء الإعلان'
        }
      });
    }
  }

  /**
   * Get refund estimate for ad cancellation
   * POST /api/ads/:id/refund-estimate
   */
  async getRefundEstimate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const Ad = (await import('../models/Ad.js')).default;
      
      const ad = await Ad.findById(id);
      
      if (!ad) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'الإعلان غير موجود'
          }
        });
      }

      // Check authorization
      if (ad.advertiserId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'غير مصرح لك بإلغاء هذا الإعلان'
          }
        });
      }

      const { refundAmount, refundType, daysSinceStart } = adService.calculateRefundAmount(ad, new Date());

      res.status(200).json({
        success: true,
        data: {
          refundAmount,
          refundType,
          daysSinceStart,
          adId: id
        },
        message: 'تم حساب مبلغ الاسترداد بنجاح'
      });
    } catch (error) {
      console.error('Error getting refund estimate:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ESTIMATE_ERROR',
          message: error.message || 'حدث خطأ أثناء حساب مبلغ الاسترداد'
        }
      });
    }
  }

  /**
   * Delete ad
   * DELETE /api/ads/:id
   */
  async deleteAd(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const Ad = (await import('../models/Ad.js')).default;
      
      const ad = await Ad.findById(id);
      
      if (!ad) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'الإعلان غير موجود'
          }
        });
      }

      // Check if user is admin or ad owner
      const user = await (await import('../models/User.js')).default.findById(userId);
      const isAdmin = user && user.roles.includes('admin');
      const isOwner = ad.advertiserId.toString() === userId.toString();

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'غير مصرح لك بحذف هذا الإعلان'
          }
        });
      }

      await Ad.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'تم حذف الإعلان بنجاح'
      });
    } catch (error) {
      console.error('Error deleting ad:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || 'حدث خطأ أثناء حذف الإعلان'
        }
      });
    }
  }
}

export default new AdController(); 