import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/Ad.js';

dotenv.config();

const sampleAds = [
  {
    title: 'تصميم مواقع احترافية',
    description: 'تصميم مواقع احترافية بأحدث التقنيات وأفضل الأسعار',
               imageUrl: 'https://picsum.photos/728/90?random=1',
    targetUrl: 'https://example.com',
    type: 'banner',
    status: 'active',
    placement: {
      id: 'homepage-top',
      location: 'homepage',
      type: 'top'
    },
    budget: {
      total: 35,
      spent: 0,
      currency: 'EGP'
    },
    duration: 'daily',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    performance: {
      impressions: 150,
      clicks: 12,
      ctr: 8.0
    },
    advertiserId: '507f1f77bcf86cd799439011', // Sample user ID
    targeting: {
      locations: ['homepage'],
      categories: [],
      keywords: []
    }
  },
  {
    title: 'خدمات السباكة المميزة',
    description: 'خدمات سباكة احترافية مع ضمان الجودة وأسعار منافسة',
    imageUrl: 'https://picsum.photos/728/90?random=2',
    targetUrl: 'https://example.com',
    type: 'banner',
    status: 'active',
    placement: {
      id: 'homepage-bottom',
      location: 'homepage',
      type: 'bottom'
    },
    budget: {
      total: 15,
      spent: 0,
      currency: 'EGP'
    },
    duration: 'daily',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    performance: {
      impressions: 89,
      clicks: 7,
      ctr: 7.9
    },
    advertiserId: '507f1f77bcf86cd799439012', // Sample user ID
    targeting: {
      locations: ['homepage'],
      categories: [],
      keywords: []
    }
  },
  {
    title: 'تنظيف المنازل والمكاتب',
    description: 'خدمات تنظيف شاملة للمنازل والمكاتب بأحدث المعدات',
    imageUrl: 'https://picsum.photos/728/90?random=3',
    targetUrl: 'https://example.com',
    type: 'banner',
    status: 'active',
    placement: {
      id: 'categories-top',
      location: 'categories',
      type: 'top'
    },
    budget: {
      total: 35,
      spent: 0,
      currency: 'EGP'
    },
    duration: 'daily',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    performance: {
      impressions: 203,
      clicks: 18,
      ctr: 8.9
    },
    advertiserId: '507f1f77bcf86cd799439013', // Sample user ID
    targeting: {
      locations: ['categories'],
      categories: [],
      keywords: []
    }
  },
  {
    title: 'صيانة الأجهزة الإلكترونية',
    description: 'صيانة احترافية لجميع أنواع الأجهزة الإلكترونية',
    imageUrl: 'https://picsum.photos/728/90?random=4',
    targetUrl: 'https://example.com',
    type: 'banner',
    status: 'active',
    placement: {
      id: 'search-top',
      location: 'search',
      type: 'top'
    },
    budget: {
      total: 35,
      spent: 0,
      currency: 'EGP'
    },
    duration: 'daily',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    performance: {
      impressions: 167,
      clicks: 14,
      ctr: 8.4
    },
    advertiserId: '507f1f77bcf86cd799439014', // Sample user ID
    targeting: {
      locations: ['search'],
      categories: [],
      keywords: []
    }
  }
];

async function addSampleAds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing ads (optional)
    await Ad.deleteMany({});
    console.log('Cleared existing ads');

    // Insert sample ads
    const insertedAds = await Ad.insertMany(sampleAds);
    console.log(`Successfully added ${insertedAds.length} sample ads`);

    // Display the created ads
    console.log('\nCreated ads:');
    insertedAds.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.title} - ${ad.placement.location} ${ad.placement.type}`);
    });

    console.log('\nSample ads have been added successfully!');
    console.log('You can now test the ad system by visiting the homepage, categories, or search pages.');

  } catch (error) {
    console.error('Error adding sample ads:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addSampleAds(); 