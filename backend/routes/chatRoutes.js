import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  getUserConversations,
  getMessages,
  markMessagesAsRead,
  getConversationByJobRequest,
  createOrGetConversationByJobRequest,
  getUnreadCount,
  getConversationById,
  getDirectConversation,
  createDirectConversation,
  sendMessage
} from '../controllers/chatController.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticateToken); // <-- This applies to all routes below

// Get user's conversations
router.get('/conversations', getUserConversations);

// Get a single conversation by ID
router.get('/conversations/:conversationId', getConversationById);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', getMessages);

// Send a message to a conversation
router.post('/conversations/:conversationId/messages', sendMessage);

// Mark messages as read
router.patch('/conversations/:conversationId/read', markMessagesAsRead);

// Get conversation by job request ID
router.get('/job-requests/:jobRequestId/conversation', getConversationByJobRequest);
// Create or get conversation by job request ID (for chat-first negotiation)
router.post('/job-requests/:jobRequestId/conversation', createOrGetConversationByJobRequest);

// Get unread message count
router.get('/unread-count', getUnreadCount);

// Direct chat routes
router.get('/direct/:targetUserId', getDirectConversation);
router.post('/direct', createDirectConversation);

export default router; 