import express from 'express';
const router = express.Router();
import offerController from '../controllers/offerController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { 
  updateOfferValidation, 
  offerIdValidation, 
  handleValidationErrors 
} from '../validation/offerValidation.js';

/**
 * @route   GET /api/offers
 * @desc    Retrieve all offers (with filtering)
 * @access  Private (Providers can see their own offers, Seekers can see offers on their jobs)
 * @query   {string} [status] - Filter by offer status (pending, accepted, rejected, withdrawn)
 * @query   {string} [jobRequest] - Filter by job request ID
 * @query   {string} [provider] - Filter by provider ID
 * @returns {object} Array of offers with populated details
 */
router.get('/', 
  authenticateToken, 
  offerController.getAllOffers
);

/**
 * @route   GET /api/offers/:offerId
 * @desc    Get a specific offer by ID
 * @access  Private (Offer owner, job request owner, or admin)
 * @param   {string} offerId - ID of the offer
 * @returns {object} Offer details with populated provider and job request information
 */
router.get('/:offerId', 
  authenticateToken, 
  offerIdValidation,
  handleValidationErrors,
  offerController.getOfferById
);

/**
 * @route   PATCH /api/offers/:offerId
 * @desc    Update an offer (only pending offers can be updated)
 * @access  Private (Offer owner only)
 * @param   {string} offerId - ID of the offer to update
 * @body    {object} [price] - Updated price object with amount and currency
 * @body    {string} [message] - Updated message from provider
 * @body    {number} [estimatedTimeDays] - Updated estimated completion time
 * @returns {object} Updated offer with populated details
 */
router.patch('/:offerId', 
  authenticateToken, 
  requireRole(['provider']), 
  offerIdValidation,
  updateOfferValidation,
  handleValidationErrors,
  offerController.updateOffer
);

/**
 * @route   POST /api/offers/:offerId/accept
 * @desc    Accept an offer (only job request owner can accept)
 * @access  Private (Job request owner only)
 * @param   {string} offerId - ID of the offer to accept
 * @returns {object} Accepted offer with updated status
 */
router.post('/:offerId/accept', 
  authenticateToken, 
  requireRole(['seeker']),
  offerIdValidation,
  handleValidationErrors,
  offerController.acceptOffer
);

/**
 * @route   POST /api/offers/:offerId/reject
 * @desc    Reject an offer (only job request owner can reject)
 * @access  Private (Job request owner only)
 * @param   {string} offerId - ID of the offer to reject
 * @returns {object} Rejected offer with updated status
 */
router.post('/:offerId/reject', 
  authenticateToken, 
  requireRole(['seeker']),
  offerIdValidation,
  handleValidationErrors,
  offerController.rejectOffer
);

/**
 * @route   DELETE /api/offers/:offerId
 * @desc    Delete/withdraw an offer (only pending offers can be deleted)
 * @access  Private (Offer owner only)
 * @param   {string} offerId - ID of the offer to delete
 * @returns {object} Success message confirming offer deletion
 */
router.delete('/:offerId', 
  authenticateToken, 
  requireRole(['provider']), 
  offerIdValidation,
  handleValidationErrors,
  offerController.deleteOffer
);

/**
 * @route   PATCH /api/offers/:offerId/negotiation
 * @desc    Update negotiation terms for an offer
 * @access  Private (Provider or Seeker)
 */
router.patch('/:offerId/negotiation',
  authenticateToken,
  requireRole(['provider', 'seeker']),
  offerIdValidation,
  handleValidationErrors,
  offerController.updateNegotiationTerms
);

/**
 * @route   POST /api/offers/:offerId/confirm-negotiation
 * @desc    Confirm negotiation terms for an offer (by either party)
 * @access  Private (Provider or Seeker)
 */
router.post('/:offerId/confirm-negotiation',
  authenticateToken,
  requireRole(['provider', 'seeker']),
  offerIdValidation,
  handleValidationErrors,
  offerController.confirmNegotiation
);

/**
 * @route   POST /api/offers/:offerId/reset-confirmation
 * @desc    Reset negotiation confirmations for an offer
 * @access  Private (Provider or Seeker)
 */
router.post('/:offerId/reset-confirmation',
  authenticateToken,
  requireRole(['provider', 'seeker']),
  offerIdValidation,
  handleValidationErrors,
  offerController.resetNegotiationConfirmation
);

/**
 * @route   GET /api/offers/:offerId/negotiation-history
 * @desc    Get negotiation history for an offer
 * @access  Private (Provider or Seeker)
 */
router.get('/:offerId/negotiation-history',
  authenticateToken,
  offerIdValidation,
  handleValidationErrors,
  offerController.getNegotiationHistory
);

/**
 * @route   POST /api/offers/:offerId/process-payment
 * @desc    Process escrow payment for an offer
 * @access  Private (Seeker only)
 */
router.post('/:offerId/process-payment',
  authenticateToken,
  requireRole(['seeker']),
  offerIdValidation,
  handleValidationErrors,
  offerController.processEscrowPayment
);

/**
 * @route   POST /api/offers/:offerId/complete
 * @desc    Mark service as completed and release funds
 * @access  Private (Seeker only)
 */
router.post('/:offerId/complete',
  authenticateToken,
  requireRole(['seeker']),
  offerIdValidation,
  handleValidationErrors,
  offerController.markServiceCompleted
);

/**
 * @route   POST /api/offers/:offerId/cancel-request
 * @desc    Request service cancellation
 * @access  Private (Seeker or Provider)
 */
router.post('/:offerId/cancel-request',
  authenticateToken,
  requireRole(['seeker', 'provider']),
  offerIdValidation,
  handleValidationErrors,
  offerController.requestCancellation
);

/**
 * @route   POST /api/offers/:offerId/process-cancellation
 * @desc    Process cancellation request
 * @access  Private (Admin only)
 */
router.post('/:offerId/process-cancellation',
  authenticateToken,
  requireRole(['admin']),
  offerIdValidation,
  handleValidationErrors,
  offerController.processCancellation
);

export default router; 