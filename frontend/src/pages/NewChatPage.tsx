import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../hooks/useSocket';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/ui/BackButton';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import FormTextarea from '../components/ui/FormTextarea';
import { Send, User, MessageCircle } from 'lucide-react';

interface User {
  _id: string;
  name: { first: string; last: string } | string;
  email: string;
  avatarUrl?: string;
  isVerified: boolean;
  isPremium: boolean;
  roles: string[];
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  _id: string;
  participants: {
    seeker: string;
    provider: string;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
  };
  isActive: boolean;
}

const NewChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const { connected, on, emit } = useSocket(accessToken || undefined);
  
  const targetUserId = searchParams.get('userId');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Add ref for messages container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Track new messages when user is scrolled up
  useEffect(() => {
    if (messages.length > lastMessageCount && userHasScrolled) {
      setNewMessagesCount(prev => prev + (messages.length - lastMessageCount));
    }
    setLastMessageCount(messages.length);
  }, [messages.length, lastMessageCount, userHasScrolled]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Only auto-scroll if user hasn't manually scrolled up
    if (messages.length > 0 && !userHasScrolled) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100); // Small delay to ensure DOM is updated
    }
  }, [messages, userHasScrolled]);

  // Auto-scroll to bottom when component mounts
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200); // Slightly longer delay for initial load
    }
  }, [loading, messages.length]);

  // Handle scroll events to show/hide scroll button and track user scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // Reduced threshold
      
      setShowScrollButton(!isNearBottom);
      
      // Track if user has scrolled up
      if (!isNearBottom) {
        setUserHasScrolled(true);
      } else {
        setUserHasScrolled(false);
      }
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserHasScrolled(false); // Reset user scroll state when they manually scroll to bottom
    setNewMessagesCount(0); // Reset new messages count
  };

  // Socket event listeners for real-time messaging
  useEffect(() => {
    if (!connected) {
      return;
    }

    const offReceiveMessage = on('receive-message', (...args: unknown[]) => {
      const message = args[0] as Message;
      
      // Only process messages if conversation is loaded and matches, or if no conversation is set yet
      if (!conversation) {
        // Store message temporarily until conversation is loaded
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      } else if (message.conversationId === conversation._id) {
        setMessages(prev => {
          // Check if message already exists to prevent duplication
          const messageExists = prev.some(m => m._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    // Remove message-sent listener to prevent duplication
    // The message-sent event is for confirmation only, not for adding to message list

    const offMessageSent = on('message-sent', (...args: unknown[]) => {
      const message = args[0] as Message;
      
      // Only process messages if conversation is loaded and matches, or if no conversation is set yet
      if (!conversation) {
        // Store message temporarily until conversation is loaded
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      } else if (message.conversationId === conversation._id) {
        setMessages(prev => {
          // Check if message already exists to prevent duplication
          const messageExists = prev.some(m => m._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    return () => {
      offReceiveMessage?.();
      offMessageSent?.();
    };
  }, [connected, on, conversation]);

  // Join conversation room when conversation is available
  useEffect(() => {
    if (connected && conversation?._id) {
      emit('join-conversation', { conversationId: conversation._id });
      emit('mark-read', { conversationId: conversation._id });
    }
  }, [connected, conversation, emit]);

  // Re-join conversation room when conversation changes (for newly created conversations)
  useEffect(() => {
    if (connected && conversation?._id) {
      emit('join-conversation', { conversationId: conversation._id });
      emit('mark-read', { conversationId: conversation._id });
    }
  }, [conversation?._id, connected, emit]);

  // Join conversation room immediately when conversation is created
  useEffect(() => {
    if (connected && conversation?._id) {
      emit('join-conversation', { conversationId: conversation._id });
      emit('mark-read', { conversationId: conversation._id });
    }
  }, [conversation, connected, emit]);

  useEffect(() => {
    if (!targetUserId) {
      setError('معرف المستخدم مطلوب');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const token = accessToken || localStorage.getItem('accessToken') || '';
        
        // Fetch target user
        const userRes = await fetch(`/api/users/${targetUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        if (userData.success) {
          setTargetUser(userData.data.user);
        } else {
          throw new Error(userData.error?.message || 'فشل تحميل بيانات المستخدم');
        }

        // Try to get existing conversation
        const convRes = await fetch(`/api/chat/direct/${targetUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const convData = await convRes.json();
        if (convData.success) {
          setConversation(convData.data.conversation);
          // Fetch messages for existing conversation
          const messagesRes = await fetch(`/api/chat/conversations/${convData.data.conversation._id}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const messagesData = await messagesRes.json();
          if (messagesData.success) {
            setMessages(messagesData.data.messages || []);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetUserId, accessToken]);

  const getUserName = (user: User): string => {
    if (typeof user.name === 'string') return user.name;
    return `${user.name?.first || ''} ${user.name?.last || ''}`.trim() || 'مستخدم';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !targetUser) return;

    setSending(true);
    try {
      const token = accessToken || localStorage.getItem('accessToken') || '';
      
      let conversationId = conversation?._id;
      
      // Create conversation if it doesn't exist
      if (!conversationId) {
        const convRes = await fetch('/api/chat/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUserId })
        });
        const convData = await convRes.json();
        if (convData.success) {
          conversationId = convData.data.conversation._id;
          setConversation(convData.data.conversation);
        } else {
          throw new Error(convData.error?.message || 'فشل إنشاء المحادثة');
        }
      }

      // Send message via socket for real-time delivery
      if (connected && conversationId) {
        emit('send-message', {
          conversationId,
          receiverId: targetUserId,
          content: newMessage.trim()
        });
        setNewMessage('');
        showSuccess('تم إرسال الرسالة بنجاح');
      } else {
        // Fallback to HTTP if socket is not connected
        const messageRes = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            receiverId: targetUserId,
            content: newMessage.trim()
          })
        });
        const messageData = await messageRes.json();
        if (messageData.success) {
          setMessages(prev => [...prev, messageData.data.message]);
          setNewMessage('');
          showSuccess('تم إرسال الرسالة بنجاح');
        } else {
          throw new Error(messageData.error?.message || 'فشل إرسال الرسالة');
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showError(err instanceof Error ? err.message : 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-cream">
        <Header />
        <div className="pt-20 flex justify-center items-center h-64">
          <div className="text-deep-teal">جاري التحميل...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !targetUser) {
    return (
      <div className="min-h-screen bg-warm-cream">
        <Header />
        <div className="pt-20 container mx-auto px-4 py-8">
          <BackButton to="/conversations" className="mb-4" />
          <BaseCard className="text-center p-8">
            <h2 className="text-xl font-bold text-red-600 mb-2">خطأ</h2>
            <p className="text-text-secondary mb-4">{error || 'لم يتم العثور على المستخدم'}</p>
            <Button onClick={() => navigate('/conversations')}>العودة للمحادثات</Button>
          </BaseCard>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <BackButton to="/conversations" className="mb-6" />
          
          {/* Chat Header */}
          <BaseCard className="mb-6 bg-gradient-to-r from-deep-teal/5 to-soft-teal/5">
            <div className="flex items-center gap-4">
              <img
                src={targetUser.avatarUrl || '/default-avatar.png'}
                alt={getUserName(targetUser)}
                className="w-12 h-12 rounded-full object-cover border-2 border-deep-teal"
              />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-deep-teal">
                  {getUserName(targetUser)}
                </h2>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  {targetUser.roles.includes('provider') && (
                    <span className="bg-soft-teal/20 text-deep-teal px-2 py-1 rounded-full text-xs">
                      مقدم خدمة
                    </span>
                  )}
                  {targetUser.roles.includes('seeker') && (
                    <span className="bg-bright-orange/20 text-bright-orange px-2 py-1 rounded-full text-xs">
                      طالب خدمة
                    </span>
                  )}
                  {targetUser.isVerified && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                      موثق
                    </span>
                  )}
                  {targetUser.isPremium && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
                      مميز
                    </span>
                  )}
                </div>
              </div>
            </div>
          </BaseCard>

          {/* Messages Container */}
          <BaseCard className="mb-6 h-96 overflow-y-auto relative">
            <div 
              className="flex flex-col h-full" 
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-text-secondary">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>لا توجد رسائل بعد</p>
                    <p className="text-sm">ابدأ المحادثة بإرسال رسالة</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-4 space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.senderId === user?.id;
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-deep-teal text-white'
                              : 'bg-gray-100 text-text-primary'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-white/70' : 'text-text-secondary'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Scroll to bottom button */}
            {showScrollButton && messages.length > 0 && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 bg-deep-teal text-white p-3 rounded-full shadow-lg hover:bg-teal-700 transition-colors z-10 flex items-center gap-2"
                title={newMessagesCount > 0 ? `${newMessagesCount} رسالة جديدة` : "الذهاب للرسائل الجديدة"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                {newMessagesCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] flex items-center justify-center">
                    {newMessagesCount}
                  </span>
                )}
              </button>
            )}
          </BaseCard>

          {/* Message Input */}
          <BaseCard>
            <form onSubmit={handleSendMessage} className="flex gap-4">
              <div className="flex-1">
                <FormTextarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!newMessage.trim() || sending}
                loading={sending}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </BaseCard>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NewChatPage; 