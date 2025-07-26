import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import JobRequest from '../models/JobRequest.js';
import User from '../models/User.js';
import { logger } from '../middlewares/logging.middleware.js';

class ChatService {
  /**
   * Create or get conversation for a job request
   */
  async getOrCreateConversation(jobRequestId, seekerId, providerId) {
    try {
      // Check if conversation already exists for this job request and provider
      let conversation = await Conversation.findOne({
        jobRequestId,
        'participants.seeker': seekerId,
        'participants.provider': providerId
      });
      
      if (!conversation) {
        // Create new conversation
        conversation = new Conversation({
          jobRequestId,
          participants: {
            seeker: seekerId,
            provider: providerId
          }
        });
        await conversation.save();
        logger.info(`Created new conversation for job request: ${jobRequestId} and provider: ${providerId}`);
      }
      
      return conversation;
    } catch (error) {
      logger.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  }

  /**
   * Send a message and update conversation metadata
   */
  async sendMessage(conversationId, senderId, receiverId, content) {
    try {
      // Get conversation to determine user type
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create the message
      const message = new Message({
        conversationId,
        senderId,
        receiverId,
        content,
        timestamp: new Date()
      });
      await message.save();

      // Determine which user type to increment unread count for
      const receiverType = receiverId.toString() === conversation.participants.seeker.toString() ? 'seeker' : 'provider';

      // Update conversation metadata
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          content,
          senderId,
          timestamp: message.timestamp
        },
        $inc: {
          [`unreadCount.${receiverType}`]: 1
        }
      });

      // --- Offer status transition logic ---
      // If the sender is the seeker and this is the first message, update offer status to 'negotiating'
      const Offer = (await import('../models/Offer.js')).default;
      const offer = await Offer.findOne({
        conversation: conversation._id
      });
      if (offer && offer.status === 'pending' && senderId.toString() === conversation.participants.seeker.toString()) {
        offer.status = 'negotiating';
        await offer.save();
      }
      // --- End offer status transition logic ---

      logger.info(`Message sent: ${message._id} from ${senderId} to ${receiverId}`);
      return message;
    } catch (error) {
      logger.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(conversationId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      
      const messages = await Message.find({ conversationId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
        // Removed population of senderId and receiverId to keep them as ObjectId strings

      const total = await Message.countDocuments({ conversationId });
      
      return {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getMessages:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId, userId) {
    try {
      const result = await Message.updateMany(
        { 
          conversationId, 
          receiverId: userId, 
          read: false 
        },
        { 
          read: true, 
          readAt: new Date() 
        }
      );

      // Reset unread count for the user
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        const userType = userId.toString() === conversation.participants.seeker.toString() ? 'seeker' : 'provider';
        await Conversation.findByIdAndUpdate(conversationId, {
          [`unreadCount.${userType}`]: 0
        });
      }

      logger.info(`Marked ${result.modifiedCount} messages as read for user: ${userId}`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error in markMessagesAsRead:', error);
      throw error;
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const conversations = await Conversation.find({
        $or: [
          { 'participants.seeker': userId },
          { 'participants.provider': userId }
        ],
        isActive: true
      })
      .populate('participants.seeker', 'name email')
      .populate('participants.provider', 'name email')
      .populate('lastMessage.senderId', 'name')
      .populate('jobRequestId', 'title status location')
      .sort({ 'lastMessage.timestamp': -1 })
      .skip(skip)
      .limit(limit);

      const total = await Conversation.countDocuments({
        $or: [
          { 'participants.seeker': userId },
          { 'participants.provider': userId }
        ],
        isActive: true
      });

      return {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getUserConversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation by job request ID
   */
  async getConversationByJobRequest(jobRequestId) {
    try {
      const conversation = await Conversation.findOne({ jobRequestId })
        .populate('participants.seeker', 'name email')
        .populate('participants.provider', 'name email')
        .populate('lastMessage.senderId', 'name')
        .populate('jobRequestId', 'title status location');

      return conversation;
    } catch (error) {
      logger.error('Error in getConversationByJobRequest:', error);
      throw error;
    }
  }

  /**
   * Get a single conversation by ID
   */
  async getConversationById(conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate('participants.seeker', 'name email')
        .populate('participants.provider', 'name email')
        .populate('lastMessage.senderId', 'name')
        .populate('jobRequestId', 'title description status budget location deadline createdAt');

      return conversation;
    } catch (error) {
      logger.error('Error in getConversationById:', error);
      throw error;
    }
  }

  /**
   * Check if user can access conversation
   */
  async canAccessConversation(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return false;

      return conversation.participants.seeker.toString() === userId.toString() || 
             conversation.participants.provider.toString() === userId.toString();
    } catch (error) {
      logger.error('Error in canAccessConversation:', error);
      return false;
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId) {
    try {
      const conversations = await Conversation.find({
        $or: [
          { 'participants.seeker': userId },
          { 'participants.provider': userId }
        ],
        isActive: true
      });

      let totalUnread = 0;
      conversations.forEach(conv => {
        if (conv.participants.seeker.toString() === userId.toString()) {
          totalUnread += conv.unreadCount.seeker;
        } else {
          totalUnread += conv.unreadCount.provider;
        }
      });

      return totalUnread;
    } catch (error) {
      logger.error('Error in getUnreadCount:', error);
      throw error;
    }
  }

  /**
   * Get or create direct conversation between two users
   */
  async getOrCreateDirectConversation(userId, targetUserId) {
    try {
      // Check if direct conversation already exists
      let conversation = await Conversation.findOne({
        $or: [
          {
            'participants.seeker': userId,
            'participants.provider': targetUserId,
            jobRequestId: { $exists: false }
          },
          {
            'participants.seeker': targetUserId,
            'participants.provider': userId,
            jobRequestId: { $exists: false }
          }
        ]
      });

      if (!conversation) {
        // Create new direct conversation
        conversation = new Conversation({
          participants: {
            seeker: userId,
            provider: targetUserId
          },
          isActive: true
        });
        await conversation.save();
        logger.info(`Created new direct conversation between ${userId} and ${targetUserId}`);
      }

      // Populate user details
      await conversation.populate('participants.seeker', 'name email avatarUrl');
      await conversation.populate('participants.provider', 'name email avatarUrl');
      await conversation.populate('lastMessage.senderId', 'name');

      return { conversation };
    } catch (error) {
      logger.error('Error in getOrCreateDirectConversation:', error);
      throw error;
    }
  }

  /**
   * Create direct conversation between two users
   */
  async createDirectConversation(userId, targetUserId) {
    try {
      // Check if direct conversation already exists
      const existingConversation = await Conversation.findOne({
        $or: [
          {
            'participants.seeker': userId,
            'participants.provider': targetUserId,
            jobRequestId: { $exists: false }
          },
          {
            'participants.seeker': targetUserId,
            'participants.provider': userId,
            jobRequestId: { $exists: false }
          }
        ]
      });

      if (existingConversation) {
        return { conversation: existingConversation };
      }

      // Create new direct conversation
      const conversation = new Conversation({
        participants: {
          seeker: userId,
          provider: targetUserId
        },
        isActive: true
      });
      await conversation.save();

      // Populate user details
      await conversation.populate('participants.seeker', 'name email avatarUrl');
      await conversation.populate('participants.provider', 'name email avatarUrl');

      logger.info(`Created new direct conversation between ${userId} and ${targetUserId}`);
      return { conversation };
    } catch (error) {
      logger.error('Error in createDirectConversation:', error);
      throw error;
    }
  }
}

export default new ChatService(); 