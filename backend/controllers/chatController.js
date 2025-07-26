import chatService from '../services/chatService.js';
import { logger } from '../middlewares/logging.middleware.js';
import socketService from '../services/socketService.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Get user's conversations
 */
export const getUserConversations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const result = await chatService.getUserConversations(userId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result,
      message: 'Conversations retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in getUserConversations controller:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve conversations'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Check if user can access this conversation
    const canAccess = await chatService.canAccessConversation(conversationId, userId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this conversation'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await chatService.getMessages(conversationId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result,
      message: 'Messages retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in getMessages controller:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve messages'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Check if user can access this conversation
    const canAccess = await chatService.canAccessConversation(conversationId, userId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this conversation'
        },
        timestamp: new Date().toISOString()
      });
    }

    const readCount = await chatService.markMessagesAsRead(conversationId, userId);

    res.status(200).json({
      success: true,
      data: { readCount },
      message: `${readCount} messages marked as read`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in markMessagesAsRead controller:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark messages as read'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get conversation by job request ID
 */
export const getConversationByJobRequest = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    const userId = req.user._id;

    const conversation = await chatService.getConversationByJobRequest(jobRequestId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found for this job request'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if user can access this conversation
    const canAccess = await chatService.canAccessConversation(conversation._id, userId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this conversation'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: conversation,
      message: 'Conversation retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in getConversationByJobRequest controller:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve conversation'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await chatService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount },
      message: 'Unread count retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in getUnreadCount controller:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve unread count'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get a single conversation by ID
 */
export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Check if user can access this conversation
    const canAccess = await chatService.canAccessConversation(conversationId, userId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this conversation'
        },
        timestamp: new Date().toISOString()
      });
    }

    const conversation = await chatService.getConversationById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: { conversation },
      message: 'Conversation retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in getConversationById controller:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve conversation'
      },
      timestamp: new Date().toISOString()
    });
  }
}; 

/**
 * Create or get conversation by job request ID (for chat-first negotiation)
 */
export const createOrGetConversationByJobRequest = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    const userId = req.user._id;
    const userRoles = req.user.roles || [];
    let { providerId } = req.body;

    // If providerId is not provided, try to get from query
    if (!providerId && req.query.providerId) {
      providerId = req.query.providerId;
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PROVIDER_ID_REQUIRED', message: 'providerId is required' }
      });
    }

    let seekerId, actualProviderId;
    if (userRoles.includes('seeker')) {
      seekerId = userId;
      actualProviderId = providerId;
    } else if (userRoles.includes('provider')) {
      seekerId = providerId;
      actualProviderId = userId;
    } else {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only seekers or providers can start a conversation' }
      });
    }

    const conversation = await chatService.getOrCreateConversation(jobRequestId, seekerId, actualProviderId);

    res.status(200).json({
      success: true,
      data: conversation,
      message: 'Conversation created or retrieved successfully'
    });
  } catch (error) {
    logger.error('Error in createOrGetConversationByJobRequest controller:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create or get conversation' }
    });
  }
}; 

/**
 * Send a message to a conversation
 */
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, receiverId } = req.body;
    const senderId = req.user._id;

    if (!content || !receiverId) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_REQUEST', 
          message: 'Content and receiverId are required' 
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if user can access this conversation
    const canAccess = await chatService.canAccessConversation(conversationId, senderId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this conversation'
        },
        timestamp: new Date().toISOString()
      });
    }

    const message = await chatService.sendMessage(conversationId, senderId, receiverId, content);

    // --- Real-time and notification logic ---
    try {
      // Create notification for receiver
      const sender = await User.findById(senderId).select('name.first name.last');
      const senderName = sender ? `${sender.name.first} ${sender.name.last}` : 'شخص ما';
      const notification = new Notification({
        userId: receiverId,
        type: 'new_message',
        message: `${senderName} أرسل لك رسالة جديدة`,
        relatedChatId: conversationId,
        isRead: false
      });
      await notification.save();
      // Emit notification to receiver if online
      socketService.emitToUser(receiverId, 'notify:newMessage', {
        notification: {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          relatedChatId: notification.relatedChatId,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      });
    } catch (err) {
      logger.error('Error creating notification for new message (HTTP):', err);
    }
    // Emit message to receiver if online
    socketService.emitToUser(receiverId, 'receive-message', {
      _id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      timestamp: message.timestamp,
      read: message.read,
      readAt: message.readAt
    });
    // --- End real-time and notification logic ---

    res.status(201).json({
      success: true,
      data: { message },
      message: 'Message sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in sendMessage controller:', error.stack || error);
    res.status(500).json({
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to send message' 
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get or create direct conversation between two users
 */
export const getDirectConversation = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    // Prevent self-chat
    if (targetUserId === userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Cannot start conversation with yourself'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await chatService.getOrCreateDirectConversation(userId, targetUserId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Direct conversation retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in getDirectConversation controller:', error.stack || error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve direct conversation'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Create direct conversation between two users
 */
export const createDirectConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user._id;

    // Prevent self-chat
    if (targetUserId === userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Cannot start conversation with yourself'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await chatService.createDirectConversation(userId, targetUserId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Direct conversation created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in createDirectConversation controller:', error.stack || error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create direct conversation'
      },
      timestamp: new Date().toISOString()
    });
  }
}; 