import express from 'express';
import { 
  handleWebhook, 
  getPaymentDetails, 
  checkPaymentStatus, 
  createEscrowPayment,
  releaseFundsFromEscrow,
  requestCancellation,
  getMyTransactions,
  getUnifiedTransactions
} from '../controllers/paymentController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import adService from '../services/adService.js';

const router = express.Router();

// Create escrow payment session
router.post('/create-escrow-payment', authenticateToken, requireRole(['seeker']), createEscrowPayment);

// Create checkout session for promotions (ads) - won't trigger ad blockers
router.post('/promotion-checkout/:adId', authenticateToken, async (req, res) => {
  try {
    const { adId } = req.params;
    const userId = req.user._id;

    const session = await adService.createCheckoutSession(adId, userId);

    res.status(200).json({
      success: true,
      data: session,
      message: 'تم إنشاء جلسة الدفع بنجاح'
    });
  } catch (error) {
    console.error('Error creating promotion checkout session:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECKOUT_ERROR',
        message: error.message || 'حدث خطأ أثناء إنشاء جلسة الدفع'
      }
    });
  }
});

// Webhook endpoint (no auth required, Stripe handles verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Get payment details by session ID (protected route)
router.get('/details/:sessionId', authenticateToken, getPaymentDetails);

// Check payment status by conversation ID (protected route)
router.get('/check-status/:conversationId', authenticateToken, checkPaymentStatus);

// Release funds from escrow
router.post('/release-funds/:paymentId', authenticateToken, requireRole(['seeker']), releaseFundsFromEscrow);

// Request service cancellation
router.post('/cancel-service/:offerId', authenticateToken, requireRole(['seeker', 'provider']), requestCancellation);

// Get all transactions for the current user
router.get('/my-transactions', authenticateToken, getMyTransactions);

// Unified transactions: service, subscription, refund
router.get('/transactions', authenticateToken, getUnifiedTransactions);

export default router; 