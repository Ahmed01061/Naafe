import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function setupStripeProducts() {
  try {
    console.log('Setting up Stripe products and prices...');

    // Create Premium Plan Product
    const premiumProduct = await stripe.products.create({
      name: 'Nafee Premium Plan',
      description: 'الخطة المميزة لمنصة نافع - اشتراك شهري',
      metadata: {
        planType: 'premium',
        features: 'unlimited_requests,ai_matching,priority_support,verified_badge,fee_discount'
      }
    });

    console.log('Premium product created:', premiumProduct.id);

    // Create Premium Plan Price (49 USD per month)
    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 4900, // 49 USD in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        planType: 'premium',
        planName: 'الخطة المميزة'
      }
    });

    console.log('Premium price created:', premiumPrice.id);

    // Create Free Plan Product (for reference)
    const freeProduct = await stripe.products.create({
      name: 'Nafee Free Plan',
      description: 'الخطة المجانية لمنصة نافع',
      metadata: {
        planType: 'free',
        features: 'limited_requests,basic_profile,community_support'
      }
    });

    console.log('Free product created:', freeProduct.id);

    console.log('\n=== STRIPE SETUP COMPLETE ===');
    console.log('Premium Product ID:', premiumProduct.id);
    console.log('Premium Price ID:', premiumPrice.id);
    console.log('Free Product ID:', freeProduct.id);
    console.log('\nAdd these to your environment variables:');
    console.log('STRIPE_PREMIUM_PRICE_ID=' + premiumPrice.id);
    console.log('STRIPE_PREMIUM_PRODUCT_ID=' + premiumProduct.id);
    console.log('STRIPE_FREE_PRODUCT_ID=' + freeProduct.id);
    console.log('\nAfter running this script, update STRIPE_PREMIUM_PRICE_ID in your .env with the new price ID.');

  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

setupStripeProducts(); 