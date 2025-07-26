import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Conversation from '../models/Conversation.js';
import JobRequest from '../models/JobRequest.js';
import User from '../models/User.js';
import Offer from '../models/Offer.js';
import offerService from './offerService.js';
import socketService from './socketService.js';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const getPaymentBySessionId = async (sessionId) => {
  try {
    const payment = await Payment.findBySessionId(sessionId)
      .populate('conversationId')
      .populate('jobRequestId')
      .populate('offerId')
      .populate('seekerId', 'name email')
      .populate('providerId', 'name email');
    
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error getting payment by session ID:', error);
    return { success: false, error: error.message };
  }
};

export const getPaymentsByConversation = async (conversationId, userId) => {
  try {
    // Verify user has access to this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return { success: false, error: 'المحادثة غير موجودة' };
    }

    const isSeeker = conversation.participants.seeker.toString() === userId;
    const isProvider = conversation.participants.provider.toString() === userId;

    if (!isSeeker && !isProvider) {
      return { success: false, error: 'غير مصرح لك بالوصول لهذه المحادثة' };
    }

    const payments = await Payment.findByConversation(conversationId)
      .populate('seekerId', 'name email')
      .populate('providerId', 'name email')
      .populate('offerId');

    return { success: true, data: payments };
  } catch (error) {
    console.error('Error getting payments by conversation:', error);
    return { success: false, error: error.message };
  }
};

export const getUserPayments = async (userId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find({
      $or: [
        { seekerId: userId },
        { providerId: userId }
      ]
    })
    .populate('conversationId')
    .populate('jobRequestId')
    .populate('offerId')
    .populate('seekerId', 'name email')
    .populate('providerId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Payment.countDocuments({
      $or: [
        { seekerId: userId },
        { providerId: userId }
      ]
    });

    return {
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error) {
    console.error('Error getting user payments:', error);
    return { success: false, error: error.message };
  }
};

export const getPaymentStats = async (userId) => {
  try {
    const stats = await Payment.aggregate([
      {
        $match: {
          $or: [
            { seekerId: new mongoose.Types.ObjectId(userId) },
            { providerId: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalPayments = stats.reduce((acc, stat) => acc + stat.count, 0);
    const totalAmount = stats.reduce((acc, stat) => acc + stat.totalAmount, 0);

    return {
      success: true,
      data: {
        stats,
        totalPayments,
        totalAmount: totalAmount / 100 // Convert from cents
      }
    };
  } catch (error) {
    console.error('Error getting payment stats:', error);
    return { success: false, error: error.message };
  }
};

export const validateEscrowPaymentRequest = async (offerId, userId, amount) => {
  try {
    // Convert userId to string if it's an ObjectId
    const userIdStr = typeof userId === 'object' ? userId.toString() : userId;
    
    // Find the offer and check all validation rules
    const offer = await Offer.findById(offerId)
      .populate('jobRequest')
      .populate('conversation');

    if (!offer) {
      return { success: false, error: 'العرض غير موجود' };
    }

    // Convert seeker ID to string for comparison
    const seekerIdStr = offer.jobRequest.seeker.toString();

    // Log for debugging
    console.log('Validating escrow payment request:', {
      offerId,
      userId: userIdStr,
      seekerIdStr,
      'userId === seekerId': userIdStr === seekerIdStr,
      amount,
      'offer.status': offer.status,
      'offer.negotiation.price': offer.negotiation?.price
    });

    // Check if user is the seeker (compare as strings to ensure proper comparison)
    if (seekerIdStr !== userIdStr) {
      console.log('Authorization failure: User is not the seeker', { 
        userIdStr, 
        seekerIdStr,
        userIdType: typeof userIdStr,
        seekerIdType: typeof seekerIdStr
      });
      return { success: false, error: 'فقط طالب الخدمة يمكنه إنشاء الدفع' };
    }

    // Check if offer is accepted (proper status for escrow)
    if (offer.status !== 'accepted') {
      console.log('Offer status check failed:', offer.status);
      return { success: false, error: 'يمكن إجراء الدفع فقط للعروض المقبولة' };
    }

    // Check if offer already has a payment
    if (offer.payment && offer.payment.paymentId) {
      const existingPayment = await Payment.findById(offer.payment.paymentId);
      if (existingPayment && ['pending', 'escrowed'].includes(existingPayment.status)) {
        return { success: false, error: 'يوجد دفع بالفعل لهذا العرض' };
      }
    }

    // Check if negotiation is complete with agreed price
    if (!offer.negotiation || !offer.negotiation.price) {
      return { success: false, error: 'يجب الاتفاق على السعر قبل الدفع' };
    }

    // Validate amount matches negotiated price
    if (!amount || amount <= 0) {
      return { success: false, error: 'المبلغ غير صحيح' };
    }

    // Make sure the payment amount matches the negotiated price
    if (Math.abs(amount - offer.negotiation.price) > 1) { // Allow small rounding differences
      return { success: false, error: 'المبلغ لا يتطابق مع السعر المتفق عليه' };
    }

    return { 
      success: true, 
      data: { 
        offer,
        conversation: offer.conversation,
        jobRequest: offer.jobRequest
      }
    };
  } catch (error) {
    console.error('Error validating escrow payment request:', error);
    return { success: false, error: error.message };
  }
};

export const handleEscrowPaymentCompletion = async (session) => {
  try {
    const payment = await Payment.findOne({ stripeSessionId: session.id });
    if (!payment) {
      console.error('Payment record not found for session:', session.id);
      return { success: false, error: 'Payment record not found' };
    }

    // Mark payment as escrowed
    payment.status = 'escrowed';
    payment.stripePaymentIntentId = session.payment_intent;
    payment.escrow.status = 'held';
    payment.escrow.heldAt = new Date();
    await payment.save();

    // Update offer payment status and move to in_progress
    const result = await offerService.processEscrowPayment(payment.offerId, payment._id);
    
    // Send real-time notification to both users
    await socketService.sendPaymentNotification(
      payment.offerId.toString(),
      payment._id.toString(),
      payment.seekerId.toString(),
      payment.providerId.toString()
    );

    return { success: true, payment, offer: result };
  } catch (error) {
    console.error('Error handling escrow payment completion:', error);
    return { success: false, error: error.message };
  }
};

export const releaseFundsFromEscrow = async (paymentId, userId) => {
  try {
    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'offerId',
        populate: {
          path: 'jobRequest'
        }
      });

    if (!payment) {
      return { success: false, error: 'الدفع غير موجود' };
    }

    // Check if payment is in escrow
    if (payment.status !== 'escrowed' || payment.escrow.status !== 'held') {
      return { success: false, error: 'المبلغ غير موجود في الضمان' };
    }

    // Check authorization - only the seeker who made the payment can release funds
    if (payment.seekerId.toString() !== userId) {
      return { success: false, error: 'غير مصرح لك بتحرير الأموال من الضمان' };
    }

    // Update offer and release funds
    await offerService.markServiceCompleted(payment.offerId._id, userId);
    
    // Process payout to provider
    console.log(`Processing payout for completed service, payment ID: ${payment._id}`);
    const payoutResult = await createProviderPayout(payment._id);
    
    // Send real-time notification to both users
    await socketService.sendServiceCompletionNotification(
      payment.offerId._id.toString(),
      payment._id.toString(),
      payment.seekerId.toString(),
      payment.providerId.toString()
    );
    
    if (!payoutResult.success) {
      console.error(`Payout failed for payment ${payment._id}: ${payoutResult.error}`);
      // Note: We don't fail the entire operation if payout fails - 
      // admin can manually process it later, but we log the error
    }

    return { 
      success: true, 
      message: 'تم تحرير الأموال من الضمان بنجاح',
      payout: payoutResult.success ? payoutResult.data : null 
    };
  } catch (error) {
    console.error('Error releasing funds from escrow:', error);
    return { success: false, error: error.message };
  }
};

export const requestCancellation = async (offerId, userId, reason) => {
  try {
    const result = await offerService.requestCancellation(offerId, userId, reason);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error requesting cancellation:', error);
    return { success: false, error: error.message };
  }
};

export const processCancellation = async (offerId, adminId = null) => {
  try {
    const result = await offerService.processCancellation(offerId, adminId);
    
    // Process refund if payment exists and was escrowed
    if (result.success && result.data) {
      const offer = result.data;
      
      // Check if there's a payment associated with this offer
      const payment = await Payment.findOne({ offerId });
      
      if (payment && payment.status === 'escrowed' && !payment.stripeRefundId) {
        console.log(`Processing refund for cancelled offer ${offerId}, payment ID: ${payment._id}`);
        
        // Get refund percentage from cancellation data
        const refundPercentage = offer.cancellation?.refundPercentage || 100;
        
        // Process the refund
        const refundResult = await processRefund(payment._id, refundPercentage);
        
        if (!refundResult.success) {
          console.error(`Refund failed for payment ${payment._id}: ${refundResult.error}`);
          // Note: We still return success for the overall operation, 
          // but include the refund failure in the response
          return {
            success: true,
            data: result.data,
            refund: { success: false, error: refundResult.error }
          };
        }
        
        return {
          success: true,
          data: result.data,
          refund: refundResult.data
        };
      }
    }
    
    return { success: result.success, data: result.data };
  } catch (error) {
    console.error('Error processing cancellation:', error);
    return { success: false, error: error.message };
  }
}; 

/**
 * Create a payout to a provider after service completion
 * @param {string} paymentId - The payment ID to process payout for
 * @returns {Object} Success status and payout details
 */
export const createProviderPayout = async (paymentId) => {
  try {
    console.log(`[FINANCIAL] Creating provider payout for payment: ${paymentId}`);
    
    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.error(`Payment not found: ${paymentId}`);
      return { success: false, error: 'Payment not found' };
    }
    
    // Check if payment is already paid out or not in a state for payout
    if (payment.stripePayoutId) {
      console.warn(`Payout already processed for payment: ${paymentId}, ID: ${payment.stripePayoutId}`);
      return { success: true, data: { alreadyProcessed: true, payoutId: payment.stripePayoutId } };
    }
    
    // Get payout amount (either from payout object or full amount)
    const payoutAmount = payment.payout?.amount || payment.amount;
    
    // Create a payout in Stripe (in test mode, this simulates a bank transfer)
    console.log(`Creating payout for ${payoutAmount} ${payment.currency}`);
    const payout = await stripe.payouts.create({
      amount: payoutAmount,
      currency: payment.currency,
      statement_descriptor: `Service: ${payment.serviceTitle.substring(0, 15)}`,
      metadata: {
        paymentId: payment._id.toString(),
        offerId: payment.offerId.toString(),
        providerId: payment.providerId.toString(),
        serviceTitle: payment.serviceTitle
      }
    });
    
    console.log(`[FINANCIAL] ${new Date().toISOString()} - PAYOUT - ID: ${payout.id} - Amount: ${payoutAmount} - Status: ${payout.status}`);
    
    // Update payment with payout info
    payment.stripePayoutId = payout.id;
    payment.payout = {
      ...payment.payout,
      status: 'processed',
      processedAt: new Date()
    };
    await payment.save();
    
    return { success: true, data: { payout } };
  } catch (error) {
    console.error('Error creating provider payout:', error);
    
    // Update payment with failure info if possible
    try {
      if (paymentId) {
        const payment = await Payment.findById(paymentId);
        if (payment) {
          payment.payout = {
            ...payment.payout,
            status: 'failed',
            failedAt: new Date(),
            failureReason: error.message
          };
          await payment.save();
        }
      }
    } catch (updateError) {
      console.error('Error updating payment after payout failure:', updateError);
    }
    
    return { success: false, error: error.message };
  }
}; 

/**
 * Process a refund for a cancelled payment
 * @param {string} paymentId - The payment ID to refund
 * @param {number} refundPercentage - Percentage of original payment to refund (0-100)
 * @returns {Object} Success status and refund details
 */
export const processRefund = async (paymentId, refundPercentage) => {
  try {
    console.log(`[FINANCIAL] Processing refund for payment: ${paymentId}, ${refundPercentage}%`);
    
    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.error(`Payment not found: ${paymentId}`);
      return { success: false, error: 'Payment not found' };
    }
    
    // Check if payment is already refunded
    if (payment.stripeRefundId) {
      console.warn(`Refund already processed for payment: ${paymentId}, ID: ${payment.stripeRefundId}`);
      return { success: true, data: { alreadyProcessed: true, refundId: payment.stripeRefundId } };
    }
    
    // Check if payment has a payment intent
    if (!payment.stripePaymentIntentId) {
      console.error(`Payment ${paymentId} has no payment intent ID`);
      return { success: false, error: 'Payment has no payment intent ID' };
    }
    
    // Calculate refund amount
    const refundAmount = Math.round(payment.amount * (refundPercentage / 100));
    console.log(`Calculated refund amount: ${refundAmount} of ${payment.amount} (${refundPercentage}%)`);
    
    // Process the refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: refundAmount,
      metadata: {
        paymentId: payment._id.toString(),
        offerId: payment.offerId.toString(),
        refundPercentage: refundPercentage.toString(),
        reason: payment.cancellation?.reason || 'Service cancelled'
      }
    });
    
    console.log(`[FINANCIAL] ${new Date().toISOString()} - REFUND - ID: ${refund.id} - Amount: ${refundAmount} - Status: ${refund.status}`);
    
    // Update payment with refund info
    payment.stripeRefundId = refund.id;
    await payment.save();
    
    // If partial refund, create payout for provider's compensation
    if (refundPercentage < 100) {
      const providerAmount = payment.amount - refundAmount;
      if (providerAmount > 0) {
        await createProviderPayout(paymentId);
      }
    }
    
    return { success: true, data: { refund } };
  } catch (error) {
    console.error('Error processing refund:', error);
    return { success: false, error: error.message };
  }
}; 