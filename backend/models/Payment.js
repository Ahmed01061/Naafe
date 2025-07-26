import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  jobRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequest',
    required: true
  },
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripeSessionId: {
    type: String,
    required: true,
    unique: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  stripePayoutId: {
    type: String,
    sparse: true
  },
  stripeRefundId: {
    type: String,
    sparse: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'usd',
    enum: ['usd', 'egp']
  },
  originalCurrency: {
    type: String,
    default: 'EGP'
  },
  originalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'escrowed', 'completed', 'failed', 'cancelled', 'refunded', 'partial_refund'],
    default: 'pending'
  },
  serviceTitle: {
    type: String,
    required: true
  },
  serviceDate: {
    type: Date
  },
  serviceTime: {
    type: String
  },
  paymentMethod: {
    type: String,
    default: 'card'
  },
  escrow: {
    status: {
      type: String,
      enum: ['pending', 'held', 'released', 'refunded', 'partial_refund'],
      default: 'pending'
    },
    heldAt: {
      type: Date
    },
    releasedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },
    releaseReason: {
      type: String,
      enum: ['service_completed', 'auto_release', 'admin_action', 'dispute_resolved'],
    }
  },
  payout: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed'],
      default: 'pending'
    },
    amount: {
      type: Number
    },
    processedAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    failureReason: {
      type: String
    }
  },
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
    requestedAt: {
      type: Date
    },
    reason: {
      type: String
    },
    refundAmount: {
      type: Number
    },
    refundPercentage: {
      type: Number
    },
    processedAt: {
      type: Date
    }
  },
  metadata: {
    type: Map,
    of: String
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  failureReason: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ conversationId: 1 });
paymentSchema.index({ seekerId: 1 });
paymentSchema.index({ providerId: 1 });
paymentSchema.index({ stripeSessionId: 1 }, { unique: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ offerId: 1 }, { unique: true });
paymentSchema.index({ 'escrow.status': 1 });
paymentSchema.index({ serviceDate: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return (this.amount / 100).toFixed(2);
});

// Method to mark payment as escrowed
paymentSchema.methods.markAsEscrowed = function(paymentIntentId) {
  this.status = 'escrowed';
  this.stripePaymentIntentId = paymentIntentId;
  this.escrow.status = 'held';
  this.escrow.heldAt = new Date();
  return this.save();
};

// Method to release funds from escrow
paymentSchema.methods.releaseFromEscrow = function(reason = 'service_completed') {
  if (this.status !== 'escrowed') {
    throw new Error('Payment must be in escrow to be released');
  }
  
  this.status = 'completed';
  this.escrow.status = 'released';
  this.escrow.releasedAt = new Date();
  this.escrow.releaseReason = reason;
  this.completedAt = new Date();
  
  // Mark payout as processing - actual payout will be handled by payment service
  this.payout = {
    status: 'processing',
    amount: this.amount
  };
  
  return this.save();
};

// Method to process cancellation
paymentSchema.methods.processCancellation = function(requestedBy, reason, refundPercentage) {
  // Calculate refund based on timing and policies
  const refundAmount = Math.round(this.amount * (refundPercentage / 100));
  
  this.cancellation = {
    status: 'approved',
    requestedBy,
    requestedAt: new Date(),
    reason,
    refundAmount,
    refundPercentage,
    processedAt: new Date()
  };
  
  if (refundPercentage === 100) {
    // Full refund
    this.status = 'refunded';
    this.escrow.status = 'refunded';
  } else {
    // Partial refund
    this.status = 'partial_refund';
    this.escrow.status = 'partial_refund';
    
    // If partial refund, provider gets remaining amount
    const providerAmount = this.amount - refundAmount;
    if (providerAmount > 0) {
      this.payout = {
        status: 'processing',
        amount: providerAmount
      };
    }
  }
  
  this.escrow.refundedAt = new Date();
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  return this.save();
};

// Method to calculate cancellation refund based on service date
paymentSchema.methods.calculateRefundPercentage = function() {
  if (!this.serviceDate) return 100; // Full refund if no service date
  
  const now = new Date();
  const serviceDate = new Date(this.serviceDate);
  
  // Calculate hours difference
  const hoursDifference = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // If more than 12 hours before service, 100% refund
  if (hoursDifference >= 12) {
    return 100;
  }
  // Less than 12 hours, 60-70% refund (provider gets 30-40%)
  return 70;
};

// Static method to find by session ID
paymentSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ stripeSessionId: sessionId });
};

// Static method to get payments by conversation
paymentSchema.statics.findByConversation = function(conversationId) {
  return this.find({ conversationId }).sort({ createdAt: -1 });
};

// Static method to get payment by offer
paymentSchema.statics.findByOffer = function(offerId) {
  return this.findOne({ offerId });
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment; 