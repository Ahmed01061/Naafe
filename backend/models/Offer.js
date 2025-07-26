import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  jobRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequest',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  budget: {
    min: {
      type: Number,
      required: true,
      min: [0, 'Minimum budget cannot be negative']
    },
    max: {
      type: Number,
      required: true,
      min: [0, 'Maximum budget cannot be negative']
    },
    currency: {
      type: String,
      enum: ['EGP', 'USD', 'EUR'],
      default: 'EGP',
      required: true
    }
  },
  message: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  estimatedTimeDays: {
    type: Number,
    default: 1,
    min: [1, 'Estimated time must be at least 1 day']
  },
  // Availability fields
  availableDates: [{
    type: Date,
    required: false
  }],
  timePreferences: [{
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'flexible'],
    required: false
  }],
  // Negotiation object for offer-based agreement
  negotiation: {
    price: { type: Number },
    date: { type: Date },
    time: { type: String },
    materials: { type: String },
    scope: { type: String },
    seekerConfirmed: { type: Boolean, default: false },
    providerConfirmed: { type: Boolean, default: false },
    negotiationHistory: [
      {
        field: { type: String },
        oldValue: { type: mongoose.Schema.Types.Mixed },
        newValue: { type: mongoose.Schema.Types.Mixed },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: { type: String }
      }
    ],
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: { type: Date }
  },
  // Chat integration
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  // Payment and escrow fields
  payment: {
    status: { 
      type: String, 
      enum: ['not_paid', 'escrowed', 'released', 'refunded', 'partial_refund'],
      default: 'not_paid' 
    },
    amount: { type: Number },
    currency: { 
      type: String,
      enum: ['EGP', 'USD', 'EUR'],
      default: 'EGP'
    },
    escrowedAt: { type: Date },
    releasedAt: { type: Date },
    scheduledDate: { type: Date }, // Date when service is scheduled to be performed
    scheduledTime: { type: String }, // Time of day for the service
    paymentId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    }
  },
  // Service cancellation
  cancellation: {
    status: { 
      type: String, 
      enum: ['none', 'requested', 'approved', 'denied'], 
      default: 'none' 
    },
    requestedBy: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: { type: Date },
    reason: { type: String },
    refundAmount: { type: Number },
    refundPercentage: { type: Number }
  },
  status: {
    type: String,
    enum: ['pending', 'negotiating', 'agreement_reached', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected', 'withdrawn'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
offerSchema.index({ jobRequest: 1, status: 1 });
offerSchema.index({ provider: 1, status: 1 });
offerSchema.index({ provider: 1, jobRequest: 1 }, { unique: true });
offerSchema.index({ 'payment.status': 1 });
offerSchema.index({ 'payment.scheduledDate': 1 });
offerSchema.index({ conversation: 1 });

// Helper methods for offer status management
offerSchema.methods.markAsNegotiating = function() {
  if (this.status === 'pending') {
    this.status = 'negotiating';
    return true;
  }
  return false;
};

offerSchema.methods.markAsAgreementReached = function() {
  if (this.status === 'negotiating' && 
      this.negotiation && 
      this.negotiation.seekerConfirmed && 
      this.negotiation.providerConfirmed) {
    this.status = 'agreement_reached';
    return true;
  }
  return false;
};

offerSchema.methods.markAsAccepted = function() {
  if (this.status === 'agreement_reached') {
    this.status = 'accepted';
    return true;
  }
  return false;
};

offerSchema.methods.markAsInProgress = function() {
  if (this.status === 'accepted' && this.payment && this.payment.status === 'escrowed') {
    this.status = 'in_progress';
    return true;
  }
  return false;
};

offerSchema.methods.markAsCompleted = function() {
  if (this.status === 'in_progress') {
    this.status = 'completed';
    if (this.payment) {
      this.payment.status = 'released';
      this.payment.releasedAt = new Date();
    }
    return true;
  }
  return false;
};

offerSchema.methods.markAsCancelled = function(userId, reason, refundPercentage) {
  if (['accepted', 'in_progress'].includes(this.status)) {
    this.status = 'cancelled';
    this.cancellation = {
      status: 'approved',
      requestedBy: userId,
      requestedAt: new Date(),
      reason: reason || 'No reason provided',
      refundPercentage: refundPercentage || 0
    };
    return true;
  }
  return false;
};

// Calculate refund percentage based on cancellation time
offerSchema.methods.calculateRefundPercentage = function() {
  if (!this.payment || !this.payment.scheduledDate) return 100; // Full refund if no schedule
  
  const now = new Date();
  const serviceDate = new Date(this.payment.scheduledDate);
  
  // Calculate hours difference
  const hoursDifference = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // If more than 12 hours before service, 100% refund
  if (hoursDifference >= 12) {
    return 100;
  }
  // Less than 12 hours, 60-70% refund (provider gets 30-40%)
  return 70;
};

// Validation middleware
offerSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Check if job request exists and is open
    const JobRequest = mongoose.model('JobRequest');
    const jobRequest = await JobRequest.findById(this.jobRequest);
    
    if (!jobRequest) {
      return next(new Error('Job request not found'));
    }
    
    if (jobRequest.status !== 'open') {
      return next(new Error('Can only make offers on open job requests'));
    }
    
    // Check if provider already made an offer
    const existingOffer = await mongoose.model('Offer').findOne({
      jobRequest: this.jobRequest,
      provider: this.provider,
      status: { $in: ['pending', 'negotiating', 'agreement_reached', 'accepted', 'in_progress'] }
    });
    
    if (existingOffer) {
      return next(new Error('Provider already made an offer on this job'));
    }
  }
  next();
});

const Offer = mongoose.model('Offer', offerSchema);

export default Offer; 