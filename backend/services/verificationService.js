import User from '../models/User.js';
import { logger } from '../middlewares/logging.middleware.js';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

// Helper to get verification object (now always top-level)
function getVerification(user) {
  return user.verification;
}
function setVerification(user, verification) {
  user.verification = verification;
}

class VerificationService {
  /**
   * Request universal ID verification
   */
  async requestVerification(userId, verificationData) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    // Remove restriction: allow both providers and seekers
    if (user.verification && user.verification.status === 'pending') throw new Error('Already pending');
    if (user.verification && user.verification.status === 'approved') throw new Error('Already verified');
    if (user.verification && user.verification.attempts >= 3) throw new Error('Maximum attempts reached');
    user.verification = {
      status: 'pending',
      explanation: '',
      attempts: (user.verification?.attempts || 0) + 1,
      idFrontUrl: verificationData.idFrontUrl,
      idBackUrl: verificationData.idBackUrl,
      selfieUrl: verificationData.selfieUrl,
      criminalRecordUrl: verificationData.criminalRecordUrl,
      criminalRecordIssuedAt: verificationData.criminalRecordIssuedAt,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      auditTrail: [{ action: 'submitted', by: userId, at: new Date() }],
    };
    await user.save();
    return { verificationStatus: user.verification.status, message: 'Verification request submitted' };
  }

  /**
   * Upload verification documents
   * @param {string} userId - User ID
   * @param {Array} documents - Array of uploaded documents
   * @returns {Object} Updated documents list
   */
  async uploadDocuments(userId, documents) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate file types and sizes
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      for (const doc of documents) {
        if (!allowedTypes.includes(doc.mimetype)) {
          throw new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed');
        }

        if (doc.size > maxSize) {
          throw new Error('File too large. Maximum size is 5MB');
        }
      }

      // Add documents to user's verification documents
      const newDocuments = documents.map(doc => ({
        type: doc.fieldname || 'other',
        url: doc.path || doc.url,
        filename: doc.originalname,
        uploadedAt: new Date(),
        status: 'pending'
      }));

      if (user.verification) {
        user.verification.documents.push(...newDocuments);
      } else {
        user.verification = {
          documents: newDocuments
        };
      }
      await user.save();

      logger.info(`Documents uploaded for user ${userId}`);

      return {
        documents: user.verification.documents,
        message: 'Documents uploaded successfully'
      };
    } catch (error) {
      logger.error(`Upload documents error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.verification) throw new Error('No verification found');
    return user.verification;
  }

  /**
   * Get all verifications for admin dashboard
   */
  async getAllVerifications(options = {}) {
    try {
      const { page = 1, limit = 20, status = 'all' } = options;
      const skip = (page - 1) * limit;
      let query = {};
      if (status && status !== 'all') {
        query = { 'verification.status': status };
      } else {
        query = { 'verification': { $exists: true, $ne: null } };
      }
      const users = await User.find(query)
        .select('name email phone roles verification isVerified isBlocked createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      const transformedUsers = users.map(user => {
        const verification = user.verification;
        const fullName = user.name && typeof user.name === 'object' 
          ? `${user.name.first || ''} ${user.name.last || ''}`.trim()
          : user.name || 'Unknown User';
        return {
          _id: user._id,
          user: {
            _id: user._id,
            name: fullName,
            email: user.email || '',
            phone: user.phone || '',
            roles: user.roles || [],
            isBlocked: user.isBlocked || false
          },
          status: verification?.status || 'pending',
          explanation: verification?.explanation || '',
          idFrontUrl: verification?.idFrontUrl || '',
          idBackUrl: verification?.idBackUrl || '',
          selfieUrl: verification?.selfieUrl || '',
          criminalRecordUrl: verification?.criminalRecordUrl || '',
          criminalRecordIssuedAt: verification?.criminalRecordIssuedAt || '',
          submittedAt: verification?.submittedAt || user.createdAt,
          reviewedAt: verification?.reviewedAt || null,
          reviewedBy: verification?.reviewedBy || null,
          attempts: verification?.attempts || 1,
          auditTrail: verification?.auditTrail || [],
        };
      }).filter(Boolean);
      const total = await User.countDocuments(query);
      return {
        users: transformedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Get all verifications error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pending verifications (for backward compatibility)
   * @param {Object} options - Query options
   * @returns {Object} Pending verifications with pagination
   */
  async getPendingVerifications(options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      // Find users with pending verifications in either provider or seeker profiles
      const pendingUsers = await User.find({
        $or: [
          { 'verification.status': 'pending' }
        ]
      })
      .select('name email phone roles verification isVerified isBlocked createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      // Transform the data to include verification info and determine the role
      const transformedUsers = pendingUsers.map(user => {
        const verification = user.verification;
        const fullName = user.name && typeof user.name === 'object' 
          ? `${user.name.first || ''} ${user.name.last || ''}`.trim()
          : user.name || 'Unknown User';

        return {
          _id: user._id,
          user: {
            _id: user._id,
            name: fullName,
            email: user.email || '',
            phone: user.phone || '',
            roles: user.roles || [],
            isBlocked: user.isBlocked || false
          },
          status: verification?.status || 'pending',
          explanation: verification?.explanation || '',
          idFrontUrl: verification?.idFrontUrl || '',
          idBackUrl: verification?.idBackUrl || '',
          selfieUrl: verification?.selfieUrl || '',
          criminalRecordUrl: verification?.criminalRecordUrl || '',
          criminalRecordIssuedAt: verification?.criminalRecordIssuedAt || '',
          submittedAt: verification?.submittedAt || user.createdAt,
          attempts: verification?.attempts || 1,
          auditTrail: verification?.auditTrail || [],
        };
      });

      const total = await User.countDocuments({
        $or: [
          { 'verification.status': 'pending' }
        ]
      });

      return {
        users: transformedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Get pending verifications error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve verification (admin only)
   */
  async approveVerification(userId, adminId, notes = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.verification || user.verification.status !== 'pending') throw new Error('No pending verification');
    user.verification.status = 'approved';
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = adminId;
    user.verification.explanation = notes;
    user.verification.auditTrail.push({ action: 'approved', by: adminId, at: new Date(), explanation: notes });
    user.isVerified = true;
    await user.save();
    await Notification.create({ userId, type: 'system', message: 'تمت الموافقة على التحقق من الهوية.' });
    return { verificationStatus: user.verification.status, reviewedAt: user.verification.reviewedAt };
  }

  /**
   * Reject verification (admin only)
   */
  async rejectVerification(userId, adminId, reason) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.verification || user.verification.status !== 'pending') throw new Error('No pending verification');
    user.verification.status = 'rejected';
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = adminId;
    user.verification.explanation = reason;
    user.verification.auditTrail.push({ action: 'rejected', by: adminId, at: new Date(), explanation: reason });
    user.isVerified = false;
    await user.save();
    await Notification.create({ userId, type: 'system', message: 'تم رفض التحقق من الهوية. السبب: ' + reason });
    return { verificationStatus: user.verification.status, reviewedAt: user.verification.reviewedAt };
  }

  // Block user
  async blockUser(userId, adminId, reason) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    user.isBlocked = true;
    user.blockedReason = reason;
    // Add to audit trail for both profiles if exists
    if (user.verification) user.verification.auditTrail.push({ action: 'blocked', by: adminId, at: new Date(), explanation: reason });
    await user.save();
    await Notification.create({ userId, type: 'system', message: 'تم حظرك من المنصة. السبب: ' + reason });
    return { isBlocked: true };
  }

  // Unblock user
  async unblockUser(userId, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    user.isBlocked = false;
    user.blockedReason = '';
    if (user.verification) user.verification.auditTrail.push({ action: 'unblocked', by: adminId, at: new Date() });
    await user.save();
    await Notification.create({ userId, type: 'system', message: 'تم رفع الحظر عنك.' });
    return { isBlocked: false };
  }
}

export default new VerificationService(); 