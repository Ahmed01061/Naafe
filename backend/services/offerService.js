import Offer from '../models/Offer.js';
import JobRequest from '../models/JobRequest.js';
import User from '../models/User.js';
import chatService from './chatService.js';
import Notification from '../models/Notification.js';
import socketService from './socketService.js';
import { logger } from '../middlewares/logging.middleware.js';

class OfferService {
  // Create a new offer
  async createOffer(jobRequestId, providerId, offerData) {
    try {
      // Validate job request exists and is open
      const jobRequest = await JobRequest.findById(jobRequestId);
      if (!jobRequest) {
        throw new Error('Job request not found');
      }
      
      if (jobRequest.status !== 'open') {
        throw new Error('Can only make offers on open job requests');
      }
      
      // Validate provider exists and is a provider
      const provider = await User.findById(providerId);
      if (!provider || !provider.roles.includes('provider')) {
        throw new Error('Invalid provider');
      }
      
      // Check if provider already made an offer
      const existingOffer = await Offer.findOne({
        jobRequest: jobRequestId,
        provider: providerId,
        status: { $in: ['pending', 'negotiating', 'agreement_reached', 'accepted', 'in_progress'] }
      });
      
      if (existingOffer) {
        throw new Error('Provider already made an offer on this job');
      }
      
      // Validate price is within budget
      if (offerData.budget.min < jobRequest.budget.min || 
          offerData.budget.max > jobRequest.budget.max) {
        throw new Error('Price must be within the job request budget range');
      }
      
      const offer = new Offer({
        jobRequest: jobRequestId,
        provider: providerId,
        budget: offerData.budget,
        message: offerData.message,
        estimatedTimeDays: offerData.estimatedTimeDays,
        availableDates: offerData.availableDates || [],
        timePreferences: offerData.timePreferences || [],
        status: 'pending'
      });
      
      // Create conversation for chat between seeker and provider
      // This will now create a unique conversation for each (jobRequest, seeker, provider) combination
      const conversation = await chatService.getOrCreateConversation(
        jobRequestId,
        jobRequest.seeker,
        providerId
      );
      
      logger.info(`Created/Retrieved conversation for offer: ${conversation._id}, jobRequest: ${jobRequestId}, provider: ${providerId}, seeker: ${jobRequest.seeker}`);
      
      // Link the conversation to the offer
      offer.conversation = conversation._id;
      
      await offer.save();
      
      // Populate provider and job request details
      await offer.populate([
        { path: 'provider', select: 'name email phone' },
        { path: 'jobRequest', select: 'title description budget deadline seeker' }
      ]);
      
      // --- Notification logic for new offer ---
      try {
        const provider = await User.findById(providerId).select('name.first name.last');
        const providerName = provider ? `${provider.name.first} ${provider.name.last}` : 'مقدم خدمة';
        
        const notification = new Notification({
          userId: offer.jobRequest.seeker,
          type: 'offer_received',
          message: `${providerName} أرسل لك عرض جديد على طلبك "${offer.jobRequest.title}"`,
          relatedChatId: conversation._id, // Link to the conversation
          isRead: false
        });
        await notification.save();

        // Emit Socket.IO event to seeker's room
        socketService.io.to(`user:${offer.jobRequest.seeker}`).emit('notify:offerReceived', {
          notification: {
            _id: notification._id,
            type: notification.type,
            message: notification.message,
            relatedChatId: notification.relatedChatId,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          }
        });

        logger.info(`Notification created for new offer: ${notification._id}`);
      } catch (error) {
        logger.error('Error creating notification for new offer:', error);
        // Don't throw error here as the offer was already created successfully
      }
      // --- End notification logic ---
      
      return offer;
    } catch (error) {
      throw error;
    }
  }
  
  // Get offers for a specific job request
  async getOffersByJobRequest(jobRequestId, filters = {}) {
    try {
      const query = { jobRequest: jobRequestId };
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      const offers = await Offer.find(query)
        .populate('provider', 'name email phone avatarUrl isPremium isTopRated isVerified providerProfile')
        .sort({ createdAt: -1 });
      
      return offers;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all offers with role-based filtering
  async getAllOffers(userId, userRoles, filters = {}) {
    try {
      let query = {};
      
      // Role-based filtering
      if (userRoles.includes('provider')) {
        // Providers can see their own offers
        query.provider = userId;
      } else if (userRoles.includes('seeker')) {
        // Seekers can see offers on their job requests
        const userJobRequests = await JobRequest.find({ seeker: userId }).select('_id');
        const jobRequestIds = userJobRequests.map(jr => jr._id);
        query.jobRequest = { $in: jobRequestIds };
      } else if (!userRoles.includes('admin')) {
        // Non-admin users can only see their own offers
        query.provider = userId;
      }
      
      // Additional filters
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.jobRequest) {
        query.jobRequest = filters.jobRequest;
      }
      
      if (filters.provider) {
        query.provider = filters.provider;
      }
      
      const offers = await Offer.find(query)
        .populate('provider', 'name email phone avatarUrl isPremium isTopRated isVerified providerProfile')
        .populate('jobRequest', 'title description budget deadline status')
        .sort({ createdAt: -1 });
      
      return offers;
    } catch (error) {
      throw error;
    }
  }
  
  // Get a specific offer by ID
  async getOfferById(offerId, userId = null) {
    try {
      const offer = await Offer.findById(offerId)
        .populate('provider', '_id name email phone avatarUrl isPremium isTopRated isVerified providerProfile')
        .populate({ path: 'jobRequest', select: 'title description budget deadline status seeker', populate: { path: 'seeker', select: '_id name email' } });
      
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      // Check if user has permission to view this offer
      if (userId) {
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }
        
        // Only offer owner, job request owner, or admin can view
        const providerId = offer.provider?._id ? offer.provider._id.toString() : offer.provider?.toString();
        const seekerId = offer.jobRequest?.seeker?._id ? offer.jobRequest.seeker._id.toString() : offer.jobRequest?.seeker?.toString();
        if (!user.roles.includes('admin') && 
            providerId !== userId.toString() && 
            seekerId !== userId.toString()) {
          console.warn('[Offer Access Denied]', {
            userId,
            providerId,
            seekerId,
            userRoles: user.roles,
            offerId
          });
          throw new Error('Access denied');
        }
      }
      
      return offer;
    } catch (error) {
      throw error;
    }
  }
  
  // Update an offer
  async updateOffer(offerId, providerId, updateData) {
    try {
      const offer = await Offer.findById(offerId);
      
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      // Only offer owner can update
      if (offer.provider.toString() !== providerId) {
        throw new Error('Access denied');
      }
      
      // Can only update pending offers
      if (offer.status !== 'pending') {
        throw new Error('Can only update pending offers');
      }
      
      // Validate budget if being updated
      if (updateData.budget) {
        const jobRequest = await JobRequest.findById(offer.jobRequest);
        if (updateData.budget.min < jobRequest.budget.min || 
            updateData.budget.max > jobRequest.budget.max) {
          throw new Error('Price must be within the job request budget range');
        }
      }
      
      // Update allowed fields
      const allowedUpdates = ['budget', 'message', 'estimatedTimeDays', 'availableDates', 'timePreferences'];
      allowedUpdates.forEach(field => {
        if (updateData[field] !== undefined) {
          offer[field] = updateData[field];
        }
      });
      
      await offer.save();
      
      // Populate provider and job request details
      await offer.populate([
        { path: 'provider', select: 'name email phone' },
        { path: 'jobRequest', select: 'title description budget deadline' }
      ]);
      
      return offer;
    } catch (error) {
      throw error;
    }
  }
  
  // Delete/withdraw an offer
  async deleteOffer(offerId, providerId) {
    try {
      const offer = await Offer.findById(offerId);
      
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      // Only offer owner can delete
      if (offer.provider.toString() !== providerId) {
        throw new Error('Access denied');
      }
      
      // Can only delete pending offers
      if (offer.status !== 'pending') {
        throw new Error('Can only delete pending offers');
      }
      
      await Offer.findByIdAndDelete(offerId);
      
      return { success: true, message: 'Offer deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
  
  // Accept an offer (called by job request owner)
  async acceptOffer(offerId, seekerId) {
    try {
      const offer = await Offer.findById(offerId)
        .populate('jobRequest')
        .populate('conversation');
      
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      // Only job request owner can accept offers
      if (offer.jobRequest.seeker.toString() !== seekerId.toString()) {
        throw new Error('Access denied');
      }
      
      // Log current offer state for debugging
      logger.info(`Accepting offer ${offerId} - Current status: ${offer.status}`);
      logger.info(`Negotiation state: seekerConfirmed=${!!offer.negotiation?.seekerConfirmed}, providerConfirmed=${!!offer.negotiation?.providerConfirmed}`);
      
      // If offer is already accepted, just return it
      if (offer.status === 'accepted') {
        logger.info(`Offer ${offerId} is already accepted, returning as is`);
        return offer;
      }
      
      // If offer is not in agreement_reached status, try to update it if both parties have confirmed
      if (offer.status !== 'agreement_reached') {
        if (offer.negotiation?.seekerConfirmed && offer.negotiation?.providerConfirmed) {
          logger.info(`Offer ${offerId} has both confirmations but status is ${offer.status}. Updating to agreement_reached.`);
          offer.status = 'agreement_reached';
          await offer.save();
        } else {
          logger.warn(`Cannot accept offer ${offerId} - Status is ${offer.status}, not agreement_reached`);
          throw new Error('Can only accept offers with confirmed agreement. Please finalize the negotiation terms first.');
        }
      }
      
      // Double-check confirmations
      if (!offer.negotiation || !offer.negotiation.seekerConfirmed || !offer.negotiation.providerConfirmed) {
        logger.warn(`Cannot accept offer ${offerId} - Missing confirmation: seekerConfirmed=${!!offer.negotiation?.seekerConfirmed}, providerConfirmed=${!!offer.negotiation?.providerConfirmed}`);
        throw new Error('Both parties must confirm all negotiation terms before accepting');
      }
      
      // Ensure required negotiation fields are set
      const requiredFields = ['price', 'date', 'time', 'materials', 'scope'];
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!offer.negotiation[field]) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        logger.warn(`Cannot accept offer ${offerId} - Missing fields: ${missingFields.join(', ')}`);
        throw new Error(`Negotiation fields '${missingFields.join(', ')}' must be set before accepting`);
      }
      
      // Update offer status
      offer.status = 'accepted';
      await offer.save();
      
      // Update job request status and assign provider
      await JobRequest.findByIdAndUpdate(offer.jobRequest._id, {
        status: 'assigned',
        assignedTo: offer.provider
      });
      
      // Reject all other pending offers for this job
      await Offer.updateMany(
        { 
          jobRequest: offer.jobRequest._id, 
          status: { $in: ['pending', 'negotiating', 'agreement_reached'] },
          _id: { $ne: offerId }
        },
        { status: 'rejected' }
      );

      // --- Notification logic ---
      // Get seeker name for message
      const seeker = await User.findById(seekerId);
      const providerId = offer.provider;
      const message = seeker ? `${seeker.name.first} قبل عرضك وبانتظار الدفع للإسكرو` : 'تم قبول عرضك وبانتظار الدفع للإسكرو';
      
      // Create notification in DB
      const notification = new Notification({
        userId: providerId,
        type: 'offer_accepted',
        message,
        relatedChatId: offer.conversation._id,
        isRead: false
      });
      await notification.save();
      
      // Emit Socket.IO event to provider's room
      socketService.io.to(`user:${providerId}`).emit('notify:offerAccepted', {
        notification: {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          relatedChatId: notification.relatedChatId,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      });
      // --- End notification logic ---
      
      return offer;
    } catch (error) {
      logger.error(`Error in acceptOffer: ${error.message}`);
      throw error;
    }
  }
  
  // Reject an offer (called by job request owner)
  async rejectOffer(offerId, seekerId) {
    try {
      const offer = await Offer.findById(offerId)
        .populate('jobRequest');
      
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      // Only job request owner can reject offers
      if (offer.jobRequest.seeker.toString() !== seekerId.toString()) {
        throw new Error('Access denied');
      }
      
      // Can only reject pending offers
      if (offer.status !== 'pending') {
        throw new Error('Can only reject pending offers');
      }
      
      offer.status = 'rejected';
      await offer.save();

      // --- Notification logic for rejected offer ---
      try {
        const seeker = await User.findById(seekerId).select('name.first name.last');
        const seekerName = seeker ? `${seeker.name.first} ${seeker.name.last}` : 'مستخدم';
        const providerId = offer.provider;
        
        const notification = new Notification({
          userId: providerId,
          type: 'offer_rejected',
          message: `${seekerName} رفض عرضك على طلب "${offer.jobRequest.title}"`,
          relatedChatId: null,
          isRead: false
        });
        await notification.save();

        // Emit Socket.IO event to provider's room
        socketService.io.to(`user:${providerId}`).emit('notify:offerRejected', {
          notification: {
            _id: notification._id,
            type: notification.type,
            message: notification.message,
            relatedChatId: notification.relatedChatId,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          }
        });

        logger.info(`Notification created for rejected offer: ${notification._id}`);
      } catch (error) {
        logger.error('Error creating notification for rejected offer:', error);
        // Don't throw error here as the offer was already rejected successfully
      }
      // --- End notification logic ---
      
      return offer;
    } catch (error) {
      throw error;
    }
  }

  // Update negotiation terms for an offer
  async updateNegotiationTerms(offerId, userId, updateData) {
    const Offer = (await import('../models/Offer.js')).default;
    const offer = await Offer.findById(offerId).populate('jobRequest');
    if (!offer) throw new Error('Offer not found');
    // Only provider or job request seeker can update
    if (
      offer.provider.toString() !== userId.toString() &&
      offer.jobRequest.seeker.toString() !== userId.toString()
    ) {
      throw new Error('Access denied');
    }
    // Allow updates for multiple valid statuses
    if (!['pending', 'negotiating', 'agreement_reached'].includes(offer.status)) {
      throw new Error('Can only update negotiation for pending, negotiating, or agreement_reached offers');
    }
    const negotiation = offer.negotiation || {};
    const fields = ['price', 'date', 'time', 'materials', 'scope'];
    let changes = [];
    let confirmationsWereSet = negotiation.seekerConfirmed && negotiation.providerConfirmed;
    fields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== negotiation[field]) {
        changes.push({
          field,
          oldValue: negotiation[field],
          newValue: updateData[field],
          changedBy: userId,
          timestamp: new Date()
        });
        negotiation[field] = updateData[field];
      }
    });
    if (changes.length === 0) throw new Error('No changes to negotiation terms');
    // If both had confirmed, reset confirmations and push reset event
    if (confirmationsWereSet) {
      negotiation.seekerConfirmed = false;
      negotiation.providerConfirmed = false;
      changes.push({
        field: 'confirmation',
        oldValue: true,
        newValue: false,
        changedBy: userId,
        timestamp: new Date(),
        note: 'Confirmations reset due to negotiation change'
      });
    }
    negotiation.lastModifiedBy = userId;
    negotiation.lastModifiedAt = new Date();
    negotiation.negotiationHistory = negotiation.negotiationHistory || [];
    negotiation.negotiationHistory.push(...changes);
    offer.negotiation = negotiation;
    await offer.save();
    return offer.negotiation;
  }

  // Confirm negotiation for an offer
  async confirmNegotiation(offerId, userId) {
    try {
      const Offer = (await import('../models/Offer.js')).default;
      const offer = await Offer.findById(offerId).populate('jobRequest');
      if (!offer) throw new Error('Offer not found');
      
      // Only provider or job request seeker can confirm
      const isProvider = offer.provider.toString() === userId.toString();
      const isSeeker = offer.jobRequest.seeker.toString() === userId.toString();
      
      if (!isProvider && !isSeeker) {
        throw new Error('Access denied');
      }
      
      // Allow confirmation for multiple valid statuses
      if (!['pending', 'negotiating', 'agreement_reached'].includes(offer.status)) {
        throw new Error('Can only confirm negotiation for pending, negotiating, or agreement_reached offers');
      }
      
      // Initialize negotiation object if it doesn't exist
      if (!offer.negotiation) {
        offer.negotiation = {
          negotiationHistory: []
        };
      }
      
      const negotiation = offer.negotiation;
      const requiredFields = ['price', 'date', 'time', 'materials', 'scope'];
      
      // Check for required fields
      for (const field of requiredFields) {
        if (!negotiation[field]) throw new Error(`Negotiation field '${field}' must be set before confirmation`);
      }
      
      // Update confirmation status based on user role
      if (isProvider) {
        negotiation.providerConfirmed = true;
      } else {
        negotiation.seekerConfirmed = true;
      }
      
      // Update metadata
      negotiation.lastModifiedBy = userId;
      negotiation.lastModifiedAt = new Date();
      
      // Ensure negotiationHistory array is initialized
      if (!Array.isArray(negotiation.negotiationHistory)) {
        negotiation.negotiationHistory = [];
      }
      
      // Add confirmation entry to history
      negotiation.negotiationHistory.push({
        field: 'confirmation',
        oldValue: false,
        newValue: true,
        changedBy: userId,
        timestamp: new Date(),
        note: 'Party confirmed negotiation terms'
      });
      
      offer.negotiation = negotiation;
      
      // If both parties have confirmed, update status to agreement_reached
      if (negotiation.seekerConfirmed && negotiation.providerConfirmed) {
        logger.info(`Both parties confirmed for offer ${offerId}, setting status to agreement_reached`);
        offer.status = 'agreement_reached';
        
        // Add notification about agreement reached
        const seekerId = offer.jobRequest.seeker;
        
        // Notify seeker
        const seekerNotification = new Notification({
          userId: seekerId,
          type: 'agreement_reached',
          message: 'تم التوصل لاتفاق على جميع الشروط، يمكنك الآن قبول العرض والمتابعة للدفع',
          relatedChatId: offer.conversation,
          isRead: false
        });
        await seekerNotification.save();
        
        // Notify provider
        const providerId = offer.provider;
        const providerNotification = new Notification({
          userId: providerId,
          type: 'agreement_reached',
          message: 'تم التوصل لاتفاق على جميع الشروط، بانتظار قبول العرض والدفع من قبل طالب الخدمة',
          relatedChatId: offer.conversation,
          isRead: false
        });
        await providerNotification.save();
        
        // Emit Socket.IO events - using a safer approach to avoid circular imports
        try {
          // Try the global socketService first
          if (socketService && socketService.io) {
            socketService.io.to(`user:${seekerId}`).emit('notify:agreementReached', {
              notification: {
                _id: seekerNotification._id,
                type: seekerNotification.type,
                message: seekerNotification.message,
                relatedChatId: seekerNotification.relatedChatId,
                isRead: seekerNotification.isRead,
                createdAt: seekerNotification.createdAt
              }
            });
            
            socketService.io.to(`user:${providerId}`).emit('notify:agreementReached', {
              notification: {
                _id: providerNotification._id,
                type: providerNotification.type,
                message: providerNotification.message,
                relatedChatId: providerNotification.relatedChatId,
                isRead: providerNotification.isRead,
                createdAt: providerNotification.createdAt
              }
            });
          } else {
            logger.warn('Socket service not initialized for agreement notifications');
          }
        } catch (socketError) {
          logger.error('Error sending agreement notifications via socket: ' + socketError.message);
          // Don't fail the transaction if socket notifications fail
        }
      } else {
        // If not both confirmed, ensure status is negotiating
        if (offer.status === 'agreement_reached') {
          logger.info(`Only one party confirmed for offer ${offerId}, setting status back to negotiating`);
          offer.status = 'negotiating';
        }
      }
      
      await offer.save();
      
      // Emit real-time negotiation update to both provider and seeker safely
      try {
        // Try to use the global socketService first
        if (socketService && socketService.io) {
          socketService.io.to(`user:${offer.provider}`).emit('negotiation:update', { offerId });
          socketService.io.to(`user:${offer.jobRequest.seeker}`).emit('negotiation:update', { offerId });
        } else {
          logger.warn(`Socket service not available for negotiation:update on offer ${offerId}`);
        }
      } catch (socketError) {
        // Don't fail the transaction if socket notifications fail
        logger.error('Socket notification error: ' + socketError.message);
      }
      
      return offer.negotiation;
    } catch (error) {
      logger.error(`Error in confirmNegotiation: ${error.message}`);
      throw error;
    }
  }

  // Reset negotiation confirmations for an offer
  async resetNegotiationConfirmation(offerId, userId) {
    try {
      const Offer = (await import('../models/Offer.js')).default;
      const offer = await Offer.findById(offerId).populate('jobRequest');
      if (!offer) throw new Error('Offer not found');
      
      // Log the current state for debugging
      logger.info(`Resetting confirmation for offer ${offerId} - Current status: ${offer.status}`);
      logger.info(`Current negotiation state: seekerConfirmed=${!!offer.negotiation?.seekerConfirmed}, providerConfirmed=${!!offer.negotiation?.providerConfirmed}`);
      
      // Only provider or job request seeker can reset
      if (
        offer.provider.toString() !== userId.toString() &&
        offer.jobRequest.seeker.toString() !== userId.toString()
      ) {
        throw new Error('Access denied');
      }
      
      // Allow reset for any status except completed, cancelled, or rejected
      // This is more permissive than before to handle edge cases
      const nonResetableStatuses = ['completed', 'cancelled', 'rejected'];
      if (nonResetableStatuses.includes(offer.status)) {
        logger.warn(`Cannot reset negotiation for offer ${offerId} - Status is ${offer.status}, which cannot be reset`);
        throw new Error(`Cannot reset negotiation for ${offer.status} offers`);
      }
      
      const negotiation = offer.negotiation || {};
      
      // Save the current confirmation status for logging
      const previousSeekerConfirmed = negotiation.seekerConfirmed;
      const previousProviderConfirmed = negotiation.providerConfirmed;
      
      // Reset confirmations
      negotiation.seekerConfirmed = false;
      negotiation.providerConfirmed = false;
      negotiation.lastModifiedBy = userId;
      negotiation.lastModifiedAt = new Date();
      negotiation.negotiationHistory = negotiation.negotiationHistory || [];
      negotiation.negotiationHistory.push({
        field: 'confirmation',
        oldValue: { seekerConfirmed: previousSeekerConfirmed, providerConfirmed: previousProviderConfirmed },
        newValue: { seekerConfirmed: false, providerConfirmed: false },
        changedBy: userId,
        timestamp: new Date(),
        note: 'Confirmations reset by user request'
      });
      
      // If status was agreement_reached or accepted, set it back to negotiating
      if (['agreement_reached', 'accepted'].includes(offer.status)) {
        logger.info(`Resetting offer ${offerId} status from ${offer.status} to negotiating`);
        offer.status = 'negotiating';
      }
      
      offer.negotiation = negotiation;
      await offer.save();
      
      // Emit real-time negotiation update to both provider and seeker safely
      try {
        // Try to use the global socketService first
        if (socketService && socketService.io) {
          socketService.io.to(`user:${offer.provider}`).emit('negotiation:update', { offerId });
          socketService.io.to(`user:${offer.jobRequest.seeker}`).emit('negotiation:update', { offerId });
        } else {
          logger.warn(`Socket service not available for negotiation:update on offer ${offerId}`);
        }
      } catch (socketError) {
        // Don't fail the transaction if socket notifications fail
        logger.error('Socket notification error: ' + socketError.message);
      }
      
      return offer.negotiation;
    } catch (error) {
      logger.error(`Error in resetNegotiationConfirmation: ${error.message}`);
      throw error;
    }
  }

  // Get negotiation history for an offer
  async getNegotiationHistory(offerId, userId) {
    const Offer = (await import('../models/Offer.js')).default;
    const offer = await Offer.findById(offerId).populate('jobRequest');
    if (!offer) throw new Error('Offer not found');
    // Only provider or job request seeker can view
    if (
      offer.provider.toString() !== userId.toString() &&
      offer.jobRequest.seeker.toString() !== userId.toString()
    ) {
      throw new Error('Access denied');
    }
    const negotiation = offer.negotiation || {};
    return negotiation.negotiationHistory || [];
  }

  // Process escrow payment for an accepted offer
  async processEscrowPayment(offerId, paymentId) {
    try {
      const offer = await Offer.findById(offerId);
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Can only process escrow for accepted offers
      if (offer.status !== 'accepted') {
        throw new Error('Can only process escrow payments for accepted offers');
      }

      // Link payment to the offer and update status
      offer.payment = {
        status: 'escrowed',
        paymentId: paymentId,
        amount: offer.negotiation.price,
        currency: offer.budget.currency,
        escrowedAt: new Date(),
        scheduledDate: offer.negotiation.date,
        scheduledTime: offer.negotiation.time
      };

      // Update status to in_progress
      offer.status = 'in_progress';
      await offer.save();

      // Update job request status to in_progress
      await JobRequest.findByIdAndUpdate(offer.jobRequest, {
        status: 'in_progress'
      });

      // Notify provider that payment is in escrow
      const providerId = offer.provider;
      const notification = new Notification({
        userId: providerId,
        type: 'payment_escrowed',
        message: `تم إيداع المبلغ في الضمان وتم جدولة الخدمة`,
        relatedChatId: offer.conversation,
        isRead: false
      });
      await notification.save();

      // Emit Socket.IO event to provider's room
      socketService.io.to(`user:${providerId}`).emit('notify:paymentEscrowed', {
        notification: {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          relatedChatId: notification.relatedChatId,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      });

      return offer;
    } catch (error) {
      throw error;
    }
  }

  // Mark service as completed and release funds
  async markServiceCompleted(offerId, userId) {
    try {
      const offer = await Offer.findById(offerId)
        .populate('jobRequest')
        .populate('payment.paymentId');
      
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Check authorization: only the seeker can mark as completed
      if (offer.jobRequest.seeker.toString() !== userId.toString()) {
        throw new Error('Access denied: only the seeker can mark the service as completed');
      }

      // Check if offer is in progress
      if (offer.status !== 'in_progress') {
        throw new Error('Only in-progress services can be marked as completed');
      }

      // Check if payment is in escrow
      if (!offer.payment || offer.payment.status !== 'escrowed') {
        throw new Error('Payment must be in escrow to release funds');
      }

      // Mark offer as completed
      offer.status = 'completed';
      offer.payment.status = 'released';
      offer.payment.releasedAt = new Date();
      await offer.save();

      // Update job request status
      await JobRequest.findByIdAndUpdate(offer.jobRequest._id, {
        status: 'completed',
        completedAt: new Date()
      });

      // Release funds from escrow if payment exists
      if (offer.payment && offer.payment.paymentId) {
        const Payment = (await import('../models/Payment.js')).default;
        const payment = await Payment.findById(offer.payment.paymentId);
        if (payment) {
          await payment.releaseFromEscrow('service_completed');
        }
      }

      // Notify provider that payment is released
      const providerId = offer.provider;
      const notification = new Notification({
        userId: providerId,
        type: 'payment_released',
        message: `تم إكمال الخدمة وتم تحويل المبلغ إلى حسابك`,
        relatedChatId: offer.conversation,
        isRead: false
      });
      await notification.save();

      // Emit Socket.IO event to provider's room
      socketService.io.to(`user:${providerId}`).emit('notify:paymentReleased', {
        notification: {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          relatedChatId: notification.relatedChatId,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      });

      return offer;
    } catch (error) {
      throw error;
    }
  }

  // Request service cancellation
  async requestCancellation(offerId, userId, reason) {
    try {
      const offer = await Offer.findById(offerId)
        .populate('jobRequest');
      
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Check authorization: only seeker or provider can cancel
      const isSeeker = offer.jobRequest.seeker.toString() === userId.toString();
      const isProvider = offer.provider.toString() === userId.toString();
      
      if (!isSeeker && !isProvider) {
        throw new Error('Access denied: only seeker or provider can request cancellation');
      }

      // Check if offer can be cancelled
      if (!['accepted', 'in_progress'].includes(offer.status)) {
        throw new Error('Only accepted or in-progress services can be cancelled');
      }

      // Check if there's already a cancellation request
      if (offer.cancellation && offer.cancellation.status === 'requested') {
        throw new Error('A cancellation request is already pending');
      }

      // Calculate refund percentage based on time to service
      let refundPercentage = 100; // Default full refund
      
      if (offer.payment && offer.payment.scheduledDate) {
        refundPercentage = offer.calculateRefundPercentage();
      }

      // Update offer with cancellation request and immediately approve it
      offer.cancellation = {
        status: 'approved',
        requestedBy: userId,
        requestedAt: new Date(),
        reason: reason || 'No reason provided',
        refundPercentage
      };
      // Set offer status to 'cancelled' immediately
      if (['accepted', 'in_progress', 'cancellation_requested'].includes(offer.status)) {
        offer.status = 'cancelled';
      }
      await offer.save();

      // Update job request status
      await JobRequest.findByIdAndUpdate(offer.jobRequest._id, {
        status: 'cancelled'
      });

      // Process refund if payment exists
      if (offer.payment && offer.payment.paymentId) {
        const Payment = (await import('../models/Payment.js')).default;
        const payment = await Payment.findById(offer.payment.paymentId);
        if (payment && payment.status === 'escrowed') {
          await payment.processCancellation(
            offer.cancellation.requestedBy,
            offer.cancellation.reason,
            offer.cancellation.refundPercentage
          );
        }
      }

      // Notify both parties
      const seekerId = offer.jobRequest.seeker;
      const providerId = offer.provider;
      // Use the already defined refundPercentage

      // Notify seeker
      const seekerNotification = new Notification({
        userId: seekerId,
        type: 'service_cancelled',
        message: `تم إلغاء الخدمة. نسبة استرداد المبلغ: ${refundPercentage}%`,
        relatedChatId: offer.conversation,
        isRead: false
      });
      await seekerNotification.save();

      // Notify provider
      const providerNotification = new Notification({
        userId: providerId,
        type: 'service_cancelled',
        message: `تم إلغاء الخدمة. نسبة الاحتفاظ بالمبلغ: ${100 - refundPercentage}%`,
        relatedChatId: offer.conversation,
        isRead: false
      });
      await providerNotification.save();

      // Emit Socket.IO events
      socketService.io.to(`user:${seekerId}`).emit('notify:serviceCancelled', {
        notification: {
          _id: seekerNotification._id,
          type: seekerNotification.type,
          message: seekerNotification.message,
          relatedChatId: seekerNotification.relatedChatId,
          isRead: seekerNotification.isRead,
          createdAt: seekerNotification.createdAt
        }
      });
      socketService.io.to(`user:${providerId}`).emit('notify:serviceCancelled', {
        notification: {
          _id: providerNotification._id,
          type: providerNotification.type,
          message: providerNotification.message,
          relatedChatId: providerNotification.relatedChatId,
          isRead: providerNotification.isRead,
          createdAt: providerNotification.createdAt
        }
      });

      return {
        success: true,
        refundPercentage,
        cancellation: offer.cancellation,
        status: offer.status
      };
    } catch (error) {
      throw error;
    }
  }

  // Process service cancellation (applies refund if applicable)
  async processCancellation(offerId, adminId = null) {
    try {
      const offer = await Offer.findById(offerId)
        .populate('jobRequest')
        .populate('payment.paymentId');
      
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Check if cancellation was requested
      if (!offer.cancellation || offer.cancellation.status !== 'requested') {
        throw new Error('No pending cancellation request found');
      }

      // Mark offer as cancelled
      offer.status = 'cancelled';
      offer.cancellation.status = 'approved';
      await offer.save();

      // Update job request status
      await JobRequest.findByIdAndUpdate(offer.jobRequest._id, {
        status: 'cancelled'
      });

      // Process refund if payment exists
      if (offer.payment && offer.payment.paymentId) {
        const Payment = (await import('../models/Payment.js')).default;
        const payment = await Payment.findById(offer.payment.paymentId);
        
        if (payment && payment.status === 'escrowed') {
          // Process cancellation with appropriate refund percentage
          await payment.processCancellation(
            offer.cancellation.requestedBy,
            offer.cancellation.reason,
            offer.cancellation.refundPercentage
          );
        }
      }

      // Notify both parties
      const seekerId = offer.jobRequest.seeker;
      const providerId = offer.provider;
      const refundPercentage = offer.cancellation.refundPercentage;

      // Notify seeker
      const seekerNotification = new Notification({
        userId: seekerId,
        type: 'service_cancelled',
        message: `تم إلغاء الخدمة. نسبة استرداد المبلغ: ${refundPercentage}%`,
        relatedChatId: offer.conversation,
        isRead: false
      });
      await seekerNotification.save();

      // Notify provider
      const providerNotification = new Notification({
        userId: providerId,
        type: 'service_cancelled',
        message: `تم إلغاء الخدمة. نسبة الاحتفاظ بالمبلغ: ${100 - refundPercentage}%`,
        relatedChatId: offer.conversation,
        isRead: false
      });
      await providerNotification.save();

      // Emit Socket.IO events
      socketService.io.to(`user:${seekerId}`).emit('notify:serviceCancelled', {
        notification: {
          _id: seekerNotification._id,
          type: seekerNotification.type,
          message: seekerNotification.message,
          relatedChatId: seekerNotification.relatedChatId,
          isRead: seekerNotification.isRead,
          createdAt: seekerNotification.createdAt
        }
      });

      socketService.io.to(`user:${providerId}`).emit('notify:serviceCancelled', {
        notification: {
          _id: providerNotification._id,
          type: providerNotification.type,
          message: providerNotification.message,
          relatedChatId: providerNotification.relatedChatId,
          isRead: providerNotification.isRead,
          createdAt: providerNotification.createdAt
        }
      });

      return {
        success: true,
        refundPercentage,
        status: 'cancelled'
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new OfferService(); 