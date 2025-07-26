import verificationService from '../services/verificationService.js';
import { logger } from '../middlewares/logging.middleware.js';

class VerificationController {
  /**
   * Request verification (provider or seeker)
   * POST /api/verification/request
   */
  async requestVerification(req, res) {
    try {
      const userId = req.user._id;
      const verificationData = req.body;
      const role = req.body.role || (req.user.roles.includes('provider') ? 'provider' : 'seeker');
      const result = await verificationService.requestVerification(userId, verificationData, role);
      res.status(200).json({ success: true, data: result, message: 'تم إرسال طلب التحقق بنجاح', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { message: error.message }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Upload verification documents
   * POST /api/verification/upload
   */
  async uploadDocuments(req, res) {
    try {
      const userId = req.user._id;
      const documents = req.files; // Assuming multer middleware
      
      logger.info(`Document upload for user: ${userId}`);
      
      const result = await verificationService.uploadDocuments(userId, documents);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Documents uploaded successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Document upload error: ${error.message}`);
      
      if (error.message.includes('Invalid file type') || 
          error.message.includes('File too large')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }
      
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
   * Get verification status (provider or seeker)
   * GET /api/verification/status
   */
  async getVerificationStatus(req, res) {
    try {
      const userId = req.user._id;
      const role = req.query.role || (req.user.roles.includes('provider') ? 'provider' : 'seeker');
      const status = await verificationService.getVerificationStatus(userId, role);
      res.status(200).json({ success: true, data: status, message: 'تم جلب حالة التحقق بنجاح', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { message: error.message }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Admin: Get all verifications (pending, approved, rejected)
   * GET /api/verification/all
   */
  async getAllVerifications(req, res) {
    try {
      const { page = 1, limit = 20, status = 'all' } = req.query;
      
      const result = await verificationService.getAllVerifications({ page, limit, status });
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'All verifications retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Get all verifications error: ${error.message}`);
      
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
   * Admin: Get all pending verifications
   * GET /api/verification/pending
   */
  async getPendingVerifications(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const result = await verificationService.getPendingVerifications({ page, limit });
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pending verifications retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Get pending verifications error: ${error.message}`);
      
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
   * Admin: Approve verification
   * POST /api/verification/:userId/approve
   */
  async approveVerification(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user._id;
      const { notes, role } = req.body;
      const result = await verificationService.approveVerification(userId, adminId, notes, role);
      res.status(200).json({ success: true, data: result, message: 'تمت الموافقة على التحقق', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { message: error.message }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Admin: Reject verification
   * POST /api/verification/:userId/reject
   */
  async rejectVerification(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user._id;
      const { reason, role } = req.body;
      const result = await verificationService.rejectVerification(userId, adminId, reason, role);
      res.status(200).json({ success: true, data: result, message: 'تم رفض التحقق', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { message: error.message }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Admin: Block user
   * POST /api/verification/:userId/block
   */
  async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;
      const result = await verificationService.blockUser(userId, adminId, reason);
      res.status(200).json({ success: true, data: result, message: 'تم حظر المستخدم', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { message: error.message }, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Admin: Unblock user
   * POST /api/verification/:userId/unblock
   */
  async unblockUser(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user._id;
      const result = await verificationService.unblockUser(userId, adminId);
      res.status(200).json({ success: true, data: result, message: 'تم رفع الحظر عن المستخدم', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { message: error.message }, timestamp: new Date().toISOString() });
    }
  }
}

export default new VerificationController(); 