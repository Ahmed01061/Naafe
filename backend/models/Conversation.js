import mongoose from 'mongoose';
const { Schema } = mongoose;

const conversationSchema = new Schema({
  jobRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'JobRequest',
    required: false // Make jobRequestId optional for direct chats
  },
  participants: {
    seeker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  lastMessage: {
    content: String,
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  unreadCount: {
    seeker: {
      type: Number,
      default: 0
    },
    provider: {
      type: Number,
      default: 0
    }
  },
  // Negotiation object for chat-based agreement
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
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: { type: Date }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
conversationSchema.index({ 'participants.seeker': 1 });
conversationSchema.index({ 'participants.provider': 1 });
conversationSchema.index({ 'participants.seeker': 1, 'participants.provider': 1 });

// Compound unique index for one-on-one per job request
conversationSchema.index(
  { jobRequestId: 1, 'participants.seeker': 1, 'participants.provider': 1 },
  { unique: true }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation; 