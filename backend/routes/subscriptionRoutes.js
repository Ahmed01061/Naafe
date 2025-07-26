import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import Stripe from 'stripe';
import fs from 'fs';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * @route   POST /api/subscriptions/create-checkout-session
 * @desc    Create Stripe checkout session for subscription
 * @access  Private
 * @body    {string} planId - Stripe price ID
 * @body    {string} planName - Plan name for display
 * @body    {string} successUrl - URL to redirect on success
 * @body    {string} cancelUrl - URL to redirect on cancel
 * @returns {object} Checkout session URL
 */
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { planId, planName, successUrl, cancelUrl } = req.body;
    const userId = req.user._id;

    // Restrict premium subscription to providers only
    if (!req.user.roles.includes('provider')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_PROVIDER',
          message: 'Only providers can subscribe to premium.'
        }
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PLAN_ID',
          message: 'Plan ID is required'
        }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: planId, // Stripe Price ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/pricing?success=true`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata: {
        userId: userId.toString(),
        planName,
      },
      customer_email: req.user.email,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Remove locale: 'ar' as Stripe doesn't support Arabic
    });

    res.status(200).json({
      success: true,
      data: {
        url: session.url,
        sessionId: session.id
      },
      message: 'Checkout session created successfully'
    });

  } catch (error) {
    console.error('Subscription checkout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECKOUT_ERROR',
        message: error.message || 'Failed to create checkout session'
      }
    });
  }
});

/**
 * @route   POST /api/subscriptions/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public (Stripe webhook)
 * @returns {object} Success response
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Received Stripe event:', event.type);
    console.log('Event data:', JSON.stringify(event.data.object, null, 2));
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // Check if this is a subscription or ad payment
        if (session.metadata?.adId) {
          // Handle ad payment completion
          const adService = (await import('../services/adService.js')).default;
          await adService.handlePaymentCompletion(session);
        } else {
          // Handle subscription completion
          await handleSubscriptionCreated(session);
        }
        break;
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    if (error.stack) {
      console.error(error.stack);
    }
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Cancel Stripe subscription and issue refund if eligible
 * @access  Private
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.subscription || !user.subscription.stripeSubscriptionId) {
      return res.status(400).json({ success: false, error: { message: 'No active subscription found.' } });
    }
    const subscriptionId = user.subscription.stripeSubscriptionId;
    const customerId = user.subscription.stripeCustomerId;
    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription) {
      return res.status(400).json({ success: false, error: { message: 'Subscription not found in Stripe.' } });
    }
    // Calculate days since subscription started
    const startTimestamp = subscription.current_period_start;
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const daysSinceStart = Math.floor((nowTimestamp - startTimestamp) / (60 * 60 * 24)) + 1;
    // Refund logic
    const fullPrice = 49; // EGP
    const daysInMonth = 30;
    const dailyRate = fullPrice / daysInMonth;
    let refundAmount = 0;
    let refundType = 'none';
    if (daysSinceStart <= 3) {
      refundAmount = fullPrice;
      refundType = 'full';
    } else if (daysSinceStart <= 7) {
      // Refund for unused days (rounded up)
      const used = daysSinceStart;
      const unused = daysInMonth - used;
      refundAmount = Math.round(unused * dailyRate);
      // For day 7, this is about 37 EGP
      refundType = 'partial';
    }
    // If estimate mode, just return the refund info
    if (req.body && req.body.estimate) {
      return res.json({
        success: true,
        refund: { amount: refundAmount, type: refundType },
        daysSinceStart,
      });
    }
    // Cancel the subscription immediately
    await stripe.subscriptions.cancel(subscriptionId);
    // Issue refund if eligible
    let refundId = null;
    let refundStatus = null;
    let chargeId = null;
    if (refundAmount > 0) {
      // Find the latest invoice and charge
      const invoices = await stripe.invoices.list({ customer: customerId, limit: 1 });
      const invoice = invoices.data[0];
      if (invoice && invoice.charge) {
        chargeId = invoice.charge;
        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: Math.round(refundAmount * 100), // Stripe expects amount in cents/piasters
          reason: 'requested_by_customer',
        });
        refundId = refund.id;
        refundStatus = refund.status;
      }
    }
    // Update user in DB
    user.isPremium = false;
    user.subscription.status = 'inactive';
    await user.save();
    // Respond
    return res.json({
      success: true,
      message: refundType === 'none'
        ? 'تم إلغاء الاشتراك بنجاح. لا يوجد استرداد لأن فترة السماح انتهت.'
        : refundType === 'full'
          ? `تم إلغاء الاشتراك واسترداد كامل (${fullPrice} جنيه).`
          : `تم إلغاء الاشتراك واسترداد جزئي (${refundAmount} جنيه).`,
      refund: refundType !== 'none' ? { amount: refundAmount, type: refundType, refundId, refundStatus } : null,
      daysSinceStart,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'حدث خطأ أثناء إلغاء الاشتراك.' } });
  }
});

// Helper functions for webhook handlers
async function handleSubscriptionCreated(session) {
  try {
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    // Fetch subscription from Stripe to get current_period_end
    let currentPeriodEnd = null;
    if (session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        if (subscription && subscription.current_period_end) {
          currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        }
      } catch (stripeErr) {
        console.error('Error fetching subscription from Stripe:', stripeErr);
      }
    }

    if (userId) {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(userId);
      if (user && user.roles.includes('provider')) {
        const updateFields = {
          'subscription.status': 'active',
          'subscription.planName': planName,
          'subscription.stripeCustomerId': session.customer,
          'subscription.stripeSubscriptionId': session.subscription,
          'isPremium': true
        };
        if (currentPeriodEnd) {
          updateFields['subscription.currentPeriodEnd'] = currentPeriodEnd;
        }
        const updateResult = await User.findByIdAndUpdate(userId, updateFields);
        console.log(`Subscription created for provider ${userId}: ${planName}`);
      } else {
        console.log(`Subscription attempted for non-provider user ${userId}, ignored.`);
      }
    } else {
      console.log('handleSubscriptionCreated: No userId in session metadata');
    }
  } catch (err) {
    console.error('Error in handleSubscriptionCreated:', err);
    if (err.stack) {
      console.error(err.stack);
    }
    throw err;
  }
}

async function handleSubscriptionUpdated(subscription) {
  const User = (await import('../models/User.js')).default;
  // Find user by Stripe customer ID
  const user = await User.findOne({ 'subscription.stripeCustomerId': subscription.customer });
  if (user && user.roles.includes('provider')) {
    await User.findByIdAndUpdate(user._id, {
      'subscription.status': subscription.status,
      'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
      'isPremium': subscription.status === 'active'
    });
    console.log(`Subscription updated for provider ${user._id}: ${subscription.status}`);
  } else if (user) {
    // If not a provider, ensure isPremium is false
    await User.findByIdAndUpdate(user._id, {
      'subscription.status': subscription.status,
      'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
      'isPremium': false
    });
    console.log(`Subscription update for non-provider user ${user._id}, isPremium set to false.`);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const User = (await import('../models/User.js')).default;
  // Find user by Stripe customer ID
  const user = await User.findOne({ 'subscription.stripeCustomerId': subscription.customer });
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      'subscription.status': 'canceled',
      'isPremium': false
    });
    console.log(`Subscription canceled for user ${user._id}`);
  }
}

export default router; 