import offerService from '../services/offerService.js';
import { logger } from '../middlewares/logging.middleware.js';

class OfferController {
  // Create an offer for a job request
  async createOffer(req, res) {
    try {
      const { id: jobRequestId } = req.params;
      const providerId = req.user._id;
      const offerData = req.body;
      
      logger.info(`Creating offer for job request ${jobRequestId} by provider ${providerId}`);
      
      const offer = await offerService.createOffer(jobRequestId, providerId, offerData);
      
      logger.info(`Offer created successfully: ${offer._id}`);
      
      res.status(201).json({
        success: true,
        data: offer,
        message: 'Offer created successfully'
      });
    } catch (error) {
      logger.error(`Error creating offer: ${error.message}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'OFFER_CREATION_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Get all offers with filtering
  async getAllOffers(req, res) {
    try {
      const userId = req.user._id;
      const userRoles = req.user.roles;
      const filters = req.query;
      
      logger.info(`Getting offers for user ${userId} with roles ${userRoles}`);
      
      const offers = await offerService.getAllOffers(userId, userRoles, filters);
      const mappedOffers = offers.map(offer => ({
        ...offer.toObject(),
        jobRequest: offer.jobRequest && offer.jobRequest._id ? offer.jobRequest._id.toString() : offer.jobRequest,
        providerId: offer.provider && offer.provider._id ? offer.provider._id.toString() : undefined,
        jobRequestId: offer.jobRequest && offer.jobRequest._id ? offer.jobRequest._id.toString() : undefined
      }));
      
      logger.info(`Found ${offers.length} offers for user ${userId}`);
      
      res.status(200).json({
        success: true,
        data: mappedOffers,
        message: 'Offers retrieved successfully'
      });
    } catch (error) {
      logger.error(`Error getting offers: ${error.message}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'OFFER_RETRIEVAL_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Get a specific offer by ID
  async getOfferById(req, res) {
    try {
      const { offerId } = req.params;
      const userId = req.user._id;
      
      logger.info(`Getting offer ${offerId} for user ${userId}`);
      
      const offer = await offerService.getOfferById(offerId, userId);
      
      logger.info(`Offer ${offerId} retrieved successfully`);
      
      res.status(200).json({
        success: true,
        data: offer,
        message: 'Offer retrieved successfully'
      });
    } catch (error) {
      logger.error(`Error getting offer by ID: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'Offer not found'
          }
        });
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'OFFER_RETRIEVAL_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Update an offer
  async updateOffer(req, res) {
    try {
      const { offerId } = req.params;
      const providerId = req.user._id;
      const updateData = req.body;
      
      logger.info(`Updating offer ${offerId} by provider ${providerId}`);
      
      const offer = await offerService.updateOffer(offerId, providerId, updateData);
      
      logger.info(`Offer ${offerId} updated successfully`);
      
      res.status(200).json({
        success: true,
        data: offer,
        message: 'Offer updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating offer: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'Offer not found'
          }
        });
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'OFFER_UPDATE_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Delete/withdraw an offer
  async deleteOffer(req, res) {
    try {
      const { offerId } = req.params;
      const providerId = req.user._id;
      
      logger.info(`Deleting offer ${offerId} by provider ${providerId}`);
      
      const result = await offerService.deleteOffer(offerId, providerId);
      
      logger.info(`Offer ${offerId} deleted successfully`);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Offer deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting offer: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'Offer not found'
          }
        });
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'OFFER_DELETION_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Accept an offer (called by job request owner/seeker)
  async acceptOffer(req, res) {
    try {
      const { offerId } = req.params;
      const seekerId = req.user._id;
      
      logger.info(`Accepting offer ${offerId} by seeker ${seekerId}`);
      
      const offer = await offerService.acceptOffer(offerId, seekerId);
      
      logger.info(`Offer ${offerId} accepted successfully`);
      
      res.status(200).json({
        success: true,
        data: offer,
        message: 'تم قبول العرض بنجاح. يرجى إكمال عملية الدفع للإسكرو لتأكيد الخدمة'
      });
    } catch (error) {
      logger.error(`Error accepting offer: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'العرض غير موجود'
          }
        });
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'غير مسموح لك بالوصول'
          }
        });
      }

      if (error.message.includes('confirmed') || error.message.includes('agreement')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AGREEMENT_INCOMPLETE',
            message: error.message
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'OFFER_ACCEPTANCE_ERROR',
          message: error.message
        }
      });
    }
  }

  // Process escrow payment completion
  async processEscrowPayment(req, res) {
    try {
      const { offerId } = req.params;
      const { paymentId } = req.body;
      const seekerId = req.user._id;
      
      logger.info(`Processing escrow payment for offer ${offerId}, payment ${paymentId} by seeker ${seekerId}`);
      
      const offer = await offerService.processEscrowPayment(offerId, paymentId);
      
      logger.info(`Escrow payment processed successfully for offer ${offerId}`);
      
      res.status(200).json({
        success: true,
        data: offer,
        message: 'تم معالجة الدفع وتحويله إلى حساب الضمان بنجاح'
      });
    } catch (error) {
      logger.error(`Error processing escrow payment: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'العرض غير موجود'
          }
        });
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'غير مسموح لك بالوصول'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'ESCROW_PAYMENT_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Mark service as completed
  async markServiceCompleted(req, res) {
    try {
      const { offerId } = req.params;
      const userId = req.user._id;
      
      logger.info(`Marking service completed for offer ${offerId} by user ${userId}`);
      
      const offer = await offerService.markServiceCompleted(offerId, userId);
      
      logger.info(`Service marked as completed successfully for offer ${offerId}`);
      
      res.status(200).json({
        success: true,
        data: offer,
        message: 'تم إكمال الخدمة وتحرير الدفع بنجاح'
      });
    } catch (error) {
      logger.error(`Error marking service as completed: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'العرض غير موجود'
          }
        });
      }
      
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'غير مسموح لك بالوصول'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'SERVICE_COMPLETION_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Request cancellation
  async requestCancellation(req, res) {
    try {
      const { offerId } = req.params;
      const userId = req.user._id;
      const { reason } = req.body;
      
      logger.info(`Requesting cancellation for offer ${offerId} by user ${userId}`);
      
      const result = await offerService.requestCancellation(offerId, userId, reason);
      
      logger.info(`Cancellation requested successfully for offer ${offerId}`);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'تم طلب إلغاء الخدمة بنجاح'
      });
    } catch (error) {
      logger.error(`Error requesting cancellation: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'العرض غير موجود'
          }
        });
      }
      
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'غير مسموح لك بالوصول'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'CANCELLATION_REQUEST_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Process cancellation
  async processCancellation(req, res) {
    try {
      const { offerId } = req.params;
      
      logger.info(`Processing cancellation for offer ${offerId}`);
      
      const result = await offerService.processCancellation(offerId);
      
      logger.info(`Cancellation processed successfully for offer ${offerId}`);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'تم معالجة طلب إلغاء الخدمة بنجاح'
      });
    } catch (error) {
      logger.error(`Error processing cancellation: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'العرض غير موجود'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'CANCELLATION_PROCESSING_ERROR',
          message: error.message
        }
      });
    }
  }
  
  // Reject an offer (called by job request owner/seeker)
  async rejectOffer(req, res) {
    try {
      const { offerId } = req.params;
      const seekerId = req.user._id;
      
      logger.info(`Rejecting offer ${offerId} by seeker ${seekerId}`);
      
      const offer = await offerService.rejectOffer(offerId, seekerId);
      
      logger.info(`Offer ${offerId} rejected successfully`);
      
      res.status(200).json({
        success: true,
        data: offer,
        message: 'Offer rejected successfully'
      });
    } catch (error) {
      logger.error(`Error rejecting offer: ${error.message}`);
      
      if (error.message === 'Offer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'Offer not found'
          }
        });
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
      
      res.status(400).json({
        success: false,
        error: {
          code: 'OFFER_REJECTION_ERROR',
          message: error.message
        }
      });
    }
  }

  // Update negotiation terms for an offer
  async updateNegotiationTerms(req, res) {
    try {
      const { offerId } = req.params;
      const userId = req.user._id;
      const updateData = req.body;
      const result = await offerService.updateNegotiationTerms(offerId, userId, updateData);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Negotiation terms updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating negotiation terms: ${error.message}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'NEGOTIATION_UPDATE_ERROR',
          message: error.message
        }
      });
    }
  }

  // Confirm negotiation for an offer
  async confirmNegotiation(req, res) {
    try {
      const { offerId } = req.params;
      const userId = req.user._id;
      const result = await offerService.confirmNegotiation(offerId, userId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Negotiation confirmed successfully'
      });
    } catch (error) {
      logger.error(`Error confirming negotiation: ${error.message}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'NEGOTIATION_CONFIRM_ERROR',
          message: error.message
        }
      });
    }
  }

  // Reset negotiation confirmations for an offer
  async resetNegotiationConfirmation(req, res) {
    try {
      const { offerId } = req.params;
      const userId = req.user._id;
      const result = await offerService.resetNegotiationConfirmation(offerId, userId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Negotiation confirmations reset successfully'
      });
    } catch (error) {
      logger.error(`Error resetting negotiation confirmations: ${error.message}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'NEGOTIATION_RESET_ERROR',
          message: error.message
        }
      });
    }
  }

  // Get negotiation history for an offer
  async getNegotiationHistory(req, res) {
    try {
      const { offerId } = req.params;
      const userId = req.user._id;
      const result = await offerService.getNegotiationHistory(offerId, userId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Negotiation history retrieved successfully'
      });
    } catch (error) {
      logger.error(`Error getting negotiation history: ${error.message}`);
      res.status(400).json({
        success: false,
        error: {
          code: 'NEGOTIATION_HISTORY_ERROR',
          message: error.message
        }
      });
    }
  }

}

export default new OfferController(); 