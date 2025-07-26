import Stripe from 'stripe';
import dotenv from 'dotenv';
import Payment from '../models/Payment.js';
import Conversation from '../models/Conversation.js';
import JobRequest from '../models/JobRequest.js';
import Offer from '../models/Offer.js';
import * as paymentService from '../services/paymentService.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Create a payment session for an escrow payment
export const createEscrowPayment = async (req, res) => {
  try {
    console.log('Creating escrow payment with data:', req.body);
    console.log('User making payment request:', req.user._id.toString());
    const { offerId, amount } = req.body;
    const userId = req.user._id;

    if (!offerId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    // Validate amount (should be positive)
    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ غير صحيح'
      });
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(paymentAmount * 100);

    // Validate payment request using the service
    console.log('Validating escrow payment request with userId:', userId.toString());
    const validationResult = await paymentService.validateEscrowPaymentRequest(offerId, userId, paymentAmount);
    
    if (!validationResult.success) {
      console.log('Escrow payment validation failed:', validationResult.error);
      return res.status(400).json({
        success: false,
        message: validationResult.error
      });
    }

    const { offer, conversation, jobRequest } = validationResult.data;
    if (!offer || !conversation || !jobRequest) {
      console.error('Escrow payment validation returned missing data:', { offer, conversation, jobRequest });
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء معالجة بيانات العرض أو المحادثة أو الطلب',
        error: 'Offer, conversation, or jobRequest is missing'
      });
    }
    console.log('Escrow payment validation successful for offer:', offerId);

    try {
      // Create Stripe checkout session
      console.log('Creating Stripe escrow session with amount:', amountInCents, 'cents');
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: jobRequest.title,
                description: `دفع الضمان للخدمة: ${jobRequest.title}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=escrow`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat/${conversation._id}`,
        metadata: {
          offerId: offerId.toString(),
          conversationId: conversation._id.toString(),
          jobRequestId: jobRequest._id.toString(),
          userId: userId.toString(),
          providerId: offer.provider.toString(),
          serviceTitle: jobRequest.title,
          amount: amountInCents.toString(),
          originalCurrency: offer.budget.currency || 'EGP',
          originalAmount: paymentAmount.toString(),
          paymentType: 'escrow'
        },
        customer_email: req.user.email,
      });
      
      console.log('Stripe escrow session created:', session.id);

      try {
        // Create payment record in database
        const payment = new Payment({
          conversationId: conversation._id,
          jobRequestId: jobRequest._id,
          offerId: offerId,
          seekerId: userId,
          providerId: offer.provider,
          stripeSessionId: session.id,
          amount: amountInCents,
          currency: 'usd',
          originalCurrency: offer.budget.currency || 'EGP',
          originalAmount: paymentAmount,
          serviceTitle: jobRequest.title,
          serviceDate: offer.negotiation.date,
          serviceTime: offer.negotiation.time,
          status: 'pending',
          escrow: {
            status: 'pending'
          }
        });

        await payment.save();
        console.log('Payment record created in database:', payment._id);

        return res.json({
          success: true,
          data: {
            sessionId: session.id,
            url: session.url
          }
        });
      } catch (dbError) {
        console.error('Error creating payment record in database:', dbError);
        return res.status(500).json({
          success: false,
          message: 'حدث خطأ أثناء حفظ بيانات الدفع'
        });
      }
    } catch (stripeError) {
      console.error('Error creating Stripe checkout session:', stripeError, stripeError?.raw || '');
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إنشاء جلسة الدفع مع بوابة الدفع',
        error: stripeError?.message || stripeError
      });
    }
  } catch (error) {
    console.error('Error creating escrow payment session:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء جلسة الدفع للضمان'
    });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      console.log('Payment completed for session:', session.id);
      
      // Determine payment type (regular or escrow)
      if (session.metadata && session.metadata.paymentType === 'escrow') {
        try {
          // Handle escrow payment
          await handleEscrowPaymentCompletion(session);
          console.log('Escrow payment completion processed successfully');
        } catch (error) {
          console.error('Error handling escrow payment completion:', error);
        }
      } else {
        // Handle regular payment
        try {
          await handlePaymentCompletion(session);
          console.log('Regular payment completion processed successfully');
        } catch (error) {
          console.error('Error handling payment completion:', error);
        }
      }
      break;
      
    case 'payment_intent.succeeded':
      console.log('Payment intent succeeded:', event.data.object.id);
      break;
      
    case 'payment_intent.payment_failed':
      console.log('Payment intent failed:', event.data.object.id);
      break;
      
    case 'payout.created':
      // Log payout creation
      console.log(`[FINANCIAL] Payout created: ${event.data.object.id} - Amount: ${event.data.object.amount} ${event.data.object.currency}`);
      break;
      
    case 'payout.paid':
      // Update payment record if metadata contains paymentId
      try {
        const payout = event.data.object;
        if (payout.metadata && payout.metadata.paymentId) {
          const payment = await Payment.findById(payout.metadata.paymentId);
          if (payment) {
            payment.payout.status = 'processed';
            payment.payout.processedAt = new Date();
            await payment.save();
            console.log(`[FINANCIAL] Payout completed for payment: ${payment._id}`);
          }
        }
      } catch (error) {
        console.error('Error handling payout.paid webhook:', error);
      }
      break;
      
    case 'payout.failed':
      // Update payment record with failure info
      try {
        const payout = event.data.object;
        if (payout.metadata && payout.metadata.paymentId) {
          const payment = await Payment.findById(payout.metadata.paymentId);
          if (payment) {
            payment.payout.status = 'failed';
            payment.payout.failedAt = new Date();
            payment.payout.failureReason = payout.failure_message || 'Unknown failure reason';
            await payment.save();
            console.log(`[FINANCIAL] Payout failed for payment: ${payment._id}: ${payment.payout.failureReason}`);
          }
        }
      } catch (error) {
        console.error('Error handling payout.failed webhook:', error);
      }
      break;
    
    case 'charge.refunded':
      // Update payment record if metadata contains paymentId
      try {
        const refund = event.data.object;
        if (refund.metadata && refund.metadata.paymentId) {
          const payment = await Payment.findById(refund.metadata.paymentId);
          if (payment) {
            // Payment record is already updated when we create the refund,
            // but we could add additional processing here if needed
            console.log(`[FINANCIAL] Refund confirmed for payment: ${payment._id}`);
          }
        }
      } catch (error) {
        console.error('Error handling charge.refunded webhook:', error);
      }
      break;
      
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }

  res.json({ received: true });
};

// Helper function to handle escrow payment completion
const handleEscrowPaymentCompletion = async (session) => {
  try {
    const result = await paymentService.handleEscrowPaymentCompletion(session);
    if (!result.success) {
      console.error('Error in handleEscrowPaymentCompletion service:', result.error);
    }
  } catch (error) {
    console.error('Error in handleEscrowPaymentCompletion controller:', error);
  }
};

// Helper function to handle regular payment completion
const handlePaymentCompletion = async (session) => {
  try {
    // Find the payment record
    const payment = await Payment.findOne({ stripeSessionId: session.id });
    if (!payment) {
      console.error('Payment record not found for session:', session.id);
      return;
    }

    // Mark payment as completed
    payment.status = 'completed';
    payment.stripePaymentIntentId = session.payment_intent;
    payment.completedAt = new Date();
    await payment.save();

    // Update job request status to completed
    await JobRequest.findByIdAndUpdate(payment.jobRequestId, {
      status: 'completed',
      completedAt: new Date()
    });

    // Update conversation status
    await Conversation.findByIdAndUpdate(payment.conversationId, {
      isActive: false
    });

    console.log('Payment completion processed successfully for session:', session.id);
  } catch (error) {
    console.error('Error processing payment completion:', error);
  }
};

// Release funds from escrow
export const releaseFundsFromEscrow = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;

    const result = await paymentService.releaseFundsFromEscrow(paymentId, userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'تم تحرير الأموال من الضمان بنجاح'
    });

  } catch (error) {
    console.error('Error releasing funds from escrow:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحرير الأموال من الضمان'
    });
  }
};

// Request cancellation of a service
export const requestCancellation = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const result = await paymentService.requestCancellation(offerId, userId, reason);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'تم طلب إلغاء الخدمة بنجاح'
    });

  } catch (error) {
    console.error('Error requesting cancellation:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء طلب إلغاء الخدمة'
    });
  }
};

// Check payment status by conversation ID
export const checkPaymentStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المحادثة مطلوب'
      });
    }

    // Find payment by conversation ID
    const payment = await Payment.findOne({ conversationId });

    if (!payment) {
      return res.json({
        success: true,
        data: {
          status: 'not_found',
          exists: false
        }
      });
    }

    // If payment is pending, try to sync with Stripe automatically
    if (payment.status === 'pending') {
      try {
        const stripeSession = await stripe.checkout.sessions.retrieve(payment.stripeSessionId);
        if (stripeSession.payment_status === 'paid' && payment.status === 'pending') {
          if (stripeSession.metadata && stripeSession.metadata.paymentType === 'escrow') {
            await handleEscrowPaymentCompletion({
              id: stripeSession.id,
              payment_intent: stripeSession.payment_intent,
              metadata: stripeSession.metadata
            });
          } else {
            payment.status = 'completed';
            payment.completedAt = new Date();
            await payment.save();
          }
          console.log(`Payment ${payment.stripeSessionId} auto-synced`);
        }
      } catch (syncError) {
        console.error('Error auto-syncing payment:', syncError);
        // Continue with original status if sync fails
      }
    }

    res.json({
      success: true,
      data: {
        status: payment.status,
        escrowStatus: payment.escrow ? payment.escrow.status : null,
        exists: true,
        sessionId: payment.stripeSessionId,
        offerId: payment.offerId,
        completedAt: payment.completedAt,
        escrowedAt: payment.escrow ? payment.escrow.heldAt : null
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من حالة الدفع'
    });
  }
};

// Get payment details by session ID
export const getPaymentDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الجلسة مطلوب'
      });
    }

    // Find payment by session ID
    const payment = await Payment.findOne({ stripeSessionId: sessionId })
      .populate('seekerId', 'name email')
      .populate('providerId', 'name email')
      .populate('offerId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على تفاصيل الدفع'
      });
    }

    // Check if user is authorized to view this payment
    if (req.user._id.toString() !== payment.seekerId._id.toString() && 
        req.user._id.toString() !== payment.providerId._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض تفاصيل هذا الدفع'
      });
    }

    const isEscrow = payment.escrow && payment.escrow.status;

    res.json({
      success: true,
      data: {
        sessionId: payment.stripeSessionId,
        amount: (payment.amount / 100).toFixed(2),
        originalAmount: payment.originalAmount.toFixed(2),
        originalCurrency: payment.originalCurrency,
        serviceTitle: payment.serviceTitle,
        serviceDate: payment.serviceDate,
        serviceTime: payment.serviceTime,
        providerName: payment.providerId.name.first + ' ' + payment.providerId.name.last,
        providerId: payment.providerId._id.toString(),
        seekerId: payment.seekerId._id.toString(),
        seekerName: payment.seekerId.name.first + ' ' + payment.seekerId.name.last,
        jobRequestId: payment.jobRequestId.toString(),
        conversationId: payment.conversationId.toString(),
        offerId: payment.offerId ? payment.offerId._id.toString() : null,
        completedAt: payment.completedAt || payment.createdAt,
        status: payment.status,
        isEscrow: !!isEscrow,
        escrowStatus: isEscrow ? payment.escrow.status : null,
        escrowHeldAt: payment.escrow ? payment.escrow.heldAt : null,
        escrowReleasedAt: payment.escrow ? payment.escrow.releasedAt : null,
        cancellation: payment.cancellation && payment.cancellation.status !== 'none' ? {
          status: payment.cancellation.status,
          refundPercentage: payment.cancellation.refundPercentage,
          requestedAt: payment.cancellation.requestedAt
        } : null
      }
    });

  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الدفع'
    });
  }
}; 

// Get all transactions for the current user
export const getMyTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await paymentService.getUserPayments(userId, page, limit);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error getting user transactions:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المعاملات' });
  }
}; 

// Unified transactions: service payments, subscriptions, refunds
export const getUnifiedTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const stripeCustomerId = user.subscription?.stripeCustomerId;

    // 1. Fetch service/job payments from Payment model
    const paymentsResult = await import('../services/paymentService.js').then(m => m.getUserPayments(userId, 1, 100));
    const servicePayments = paymentsResult.success ? paymentsResult.data.payments.map(p => ({
      id: p._id,
      type:
        p.status === 'refunded' || p.status === 'partial_refund' || p.status === 'cancelled'
          ? 'refund'
          : 'service',
      amount:
        p.status === 'refunded' || p.status === 'partial_refund' || p.status === 'cancelled'
          ? -Math.round((p.cancellation?.refundAmount || p.amount) / 100)
          : p.amount / 100,
      currency: p.originalCurrency || 'EGP',
      date: p.updatedAt || p.createdAt,
      status: p.status,
      description:
        p.status === 'refunded'
          ? 'استرداد كامل'
          : p.status === 'partial_refund'
            ? 'استرداد جزئي'
            : p.status === 'cancelled'
              ? 'إلغاء خدمة واسترداد'
              : p.serviceTitle || 'دفع خدمة',
      relatedId: p.jobRequestId || p.offerId || null
    })) : [];

    // 2. Fetch ad purchases
    const Ad = (await import('../models/Ad.js')).default;
    const adPayments = await Ad.find({ advertiserId: userId }).sort({ createdAt: -1 });
    const adTransactions = adPayments.map(ad => ({
      id: ad._id,
      type: 'ad',
      amount: ad.budget.total,
      currency: ad.budget.currency || 'EGP',
      date: ad.createdAt,
      status: ad.status,
      description: `إعلان: ${ad.title}`,
      relatedId: ad._id,
      adData: {
        title: ad.title,
        placement: ad.placement,
        duration: ad.duration
      }
    }));

    // 2. Fetch Stripe charges and refunds for subscriptions
    let stripeTransactions = [];
    const seenRefundIds = new Set();
    if (user.email) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
      // Fetch all Stripe customers for this email
      const customers = await stripe.customers.list({ email: user.email, limit: 100 });
      let allCharges = [];
      let allChargeIds = new Set();
      for (const customer of customers.data) {
        const charges = await stripe.charges.list({ customer: customer.id, limit: 100 });
        allCharges = allCharges.concat(charges.data);
        for (const c of charges.data) allChargeIds.add(c.id);
        for (const charge of charges.data) {
          // Subscription payment
          if (charge.invoice) {
            stripeTransactions.push({
              id: charge.id,
              type: 'subscription',
              amount: charge.amount / 100,
              currency: charge.currency.toUpperCase(),
              date: new Date(charge.created * 1000),
              status: charge.status,
              description: 'دفع اشتراك مميز',
              relatedId: charge.invoice
            });
          }
          // Refunds for this charge
          if (charge.refunds && charge.refunds.data.length > 0) {
            for (const refund of charge.refunds.data) {
              stripeTransactions.push({
                id: refund.id,
                type: 'refund',
                amount: -refund.amount / 100,
                currency: charge.currency.toUpperCase(),
                date: new Date(refund.created * 1000),
                status: refund.status,
                description: 'استرداد اشتراك',
                relatedId: charge.id
              });
              seenRefundIds.add(refund.id);
            }
          }
        }
      }
      // Fetch all refunds (limit 100), filter to those whose charge is in user's charges and not already included
      const allRefunds = await stripe.refunds.list({ limit: 100 });
      for (const refund of allRefunds.data) {
        if (!seenRefundIds.has(refund.id) && refund.charge && allChargeIds.has(refund.charge)) {
          // Try to get the charge currency, fallback to USD
          let currency = 'USD';
          let chargeCreated = refund.created;
          try {
            const charge = allCharges.find(c => c.id === refund.charge);
            if (charge) {
              currency = charge.currency ? charge.currency.toUpperCase() : 'USD';
              chargeCreated = charge.created;
            }
          } catch {}
          stripeTransactions.push({
            id: refund.id,
            type: 'refund',
            amount: -refund.amount / 100,
            currency,
            date: new Date(refund.created * 1000),
            status: refund.status,
            description: 'استرداد اشتراك',
            relatedId: refund.charge || null
          });
        }
      }
    } else if (stripeCustomerId) {
      // Fallback: use current customer ID if email is missing
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
      const charges = await stripe.charges.list({ customer: stripeCustomerId, limit: 100 });
      for (const charge of charges.data) {
        if (charge.invoice) {
          stripeTransactions.push({
            id: charge.id,
            type: 'subscription',
            amount: charge.amount / 100,
            currency: charge.currency.toUpperCase(),
            date: new Date(charge.created * 1000),
            status: charge.status,
            description: 'دفع اشتراك مميز',
            relatedId: charge.invoice
          });
        }
        if (charge.refunds && charge.refunds.data.length > 0) {
          for (const refund of charge.refunds.data) {
            stripeTransactions.push({
              id: refund.id,
              type: 'refund',
              amount: -refund.amount / 100,
              currency: charge.currency.toUpperCase(),
              date: new Date(refund.created * 1000),
              status: refund.status,
              description: 'استرداد اشتراك',
              relatedId: charge.id
            });
            seenRefundIds.add(refund.id);
          }
        }
      }
      const allRefunds = await stripe.refunds.list({ limit: 100 });
      const userChargeIds = new Set(charges.data.map(c => c.id));
      for (const refund of allRefunds.data) {
        if (!seenRefundIds.has(refund.id) && refund.charge && userChargeIds.has(refund.charge)) {
          let currency = 'USD';
          let chargeCreated = refund.created;
          try {
            const charge = charges.data.find(c => c.id === refund.charge);
            if (charge) {
              currency = charge.currency ? charge.currency.toUpperCase() : 'USD';
              chargeCreated = charge.created;
            }
          } catch {}
          stripeTransactions.push({
            id: refund.id,
            type: 'refund',
            amount: -refund.amount / 100,
            currency,
            date: new Date(refund.created * 1000),
            status: refund.status,
            description: 'استرداد اشتراك',
            relatedId: refund.charge || null
          });
        }
      }
    }

    // 3. Merge and sort all transactions by date (desc)
    const allTransactions = [...servicePayments, ...adTransactions, ...stripeTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const total = allTransactions.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const paginated = allTransactions.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: {
        transactions: paginated,
        pagination: {
          page,
          pages,
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Error getting unified transactions:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المعاملات المالية' });
  }
}; 