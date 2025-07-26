import mongoose from 'mongoose';

const adSchema = new mongoose.Schema({
  advertiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  imageUrl: {
    type: String,
    required: true
  },
  targetUrl: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  placement: {
    id: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true,
      enum: ['homepage', 'categories', 'search']
    },
    type: {
      type: String,
      required: true,
      enum: ['top', 'bottom', 'sidebar', 'interstitial']
    }
  },
  targeting: {
    locations: [{
      type: String,
      trim: true
    }],
    categories: [{
      type: String,
      trim: true
    }],
    keywords: [{
      type: String,
      trim: true
    }]
  },
  budget: {
    total: {
      type: Number,
      required: true,
      min: 0
    },
    spent: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'EGP'
    }
  },
  performance: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    ctr: {
      type: Number,
      default: 0
    }
  },
  stripeSessionId: {
    type: String,
    sparse: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  adminNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
adSchema.index({ status: 1, startDate: 1, endDate: 1 });
adSchema.index({ type: 1, status: 1 });
adSchema.index({ advertiserId: 1 });
adSchema.index({ 'targeting.locations': 1 });
adSchema.index({ 'targeting.categories': 1 });

// Virtual for calculating remaining budget
adSchema.virtual('remainingBudget').get(function() {
  return this.budget.total - this.budget.spent;
});

// Virtual for calculating CTR
adSchema.virtual('calculatedCtr').get(function() {
  if (this.performance.impressions === 0) return 0;
  return (this.performance.clicks / this.performance.impressions) * 100;
});

// Method to check if ad is currently active
adSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now &&
         this.budget.spent < this.budget.total;
};

// Method to increment impressions
adSchema.methods.incrementImpressions = function() {
  this.performance.impressions += 1;
  this.performance.ctr = this.calculatedCtr;
  return this.save();
};

// Method to increment clicks
adSchema.methods.incrementClicks = function() {
  this.performance.clicks += 1;
  this.performance.ctr = this.calculatedCtr;
  return this.save();
};

// Pre-save middleware to update CTR
adSchema.pre('save', function(next) {
  if (this.isModified('performance.clicks') || this.isModified('performance.impressions')) {
    this.performance.ctr = this.calculatedCtr;
  }
  next();
});

const Ad = mongoose.model('Ad', adSchema);
export default Ad; 