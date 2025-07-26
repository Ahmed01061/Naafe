import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { useOfferContext, Offer } from '../contexts/OfferContext';
import NegotiationSummary from '../components/ui/NegotiationSummary';
import NegotiationHistory from '../components/ui/NegotiationHistory';
import PageLayout from '../components/layout/PageLayout';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import FormTextarea from '../components/ui/FormTextarea';
import PaymentModal from '../components/ui/PaymentModal';
import ReportProblemModal from '../components/ui/ReportProblemModal';
import ReviewModal from '../components/ui/ReviewModal';
import Modal from '../admin/components/UI/Modal';
import { submitComplaint } from '../services/complaintService';
import { Send, ArrowLeft, MessageCircle, User, CreditCard, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
}

interface Conversation {
  _id: string;
  jobRequestId?: {
    _id: string;
    title: string;
    description: string;
    status: string;
    budget: {
      min: number;
      max: number;
    };
    location: {
      address: string;
      government: string;
      city: string;
      street: string;
      apartmentNumber: string;
      additionalInformation: string;
    };
    deadline: string;
    createdAt: string;
  };
  participants: {
    seeker: {
      _id: string;
      name: { first: string; last: string };
      email: string;
    };
    provider: {
      _id: string;
      name: { first: string; last: string };
      email: string;
    };
  };
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount: {
    seeker: number;
    provider: number;
  };
  isActive: boolean;
}

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const { accessToken, user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const navigate = useNavigate();
  const { connected, on, emit } = useSocket(accessToken || undefined);
  const { negotiationState, fetchNegotiation, confirmNegotiation, resetNegotiation, fetchNegotiationHistory, updateNegotiation, offers, addNewOffer } = useOfferContext();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [serviceInProgress, setServiceInProgress] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showNegotiationMobile, setShowNegotiationMobile] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [offerId, setOfferId] = useState<string | null>(null);

  // Fetch conversation details
  useEffect(() => {
    if (!chatId || !accessToken) return;
    
    fetch(`/api/chat/conversations/${chatId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConversation(data.data.conversation);
        } else {
          setError('فشل تحميل المحادثة');
        }
      })
      .catch(() => setError('فشل الاتصال بالخادم'))
      .finally(() => setLoading(false));
  }, [chatId, accessToken]);

  // Fetch negotiation offerId for this conversation
  useEffect(() => {
    const fetchOfferId = async () => {
      if (conversation && conversation.jobRequestId && conversation.participants && accessToken) {
        const jobRequestId = conversation.jobRequestId._id;
        const providerId = conversation.participants.provider._id;
        
        try {
          const res = await fetch(`/api/offers?jobRequest=${jobRequestId}&provider=${providerId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const data = await res.json();
          
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setOfferId(data.data[0]._id);
            fetchNegotiation(data.data[0]._id);
            fetchNegotiationHistory(data.data[0]._id);
          } else {
            setOfferId(null);
          }
        } catch (error) {
          console.error('Error fetching offer ID:', error);
        }
      }
    };
    fetchOfferId();
  }, [conversation, accessToken, fetchNegotiation, fetchNegotiationHistory]);

  // Fetch offer details if not present
  useEffect(() => {
    const fetchOfferIfMissing = async () => {
      if (offerId && !offers.find(o => o.id === offerId) && accessToken) {
        try {
          const res = await fetch(`/api/offers/${offerId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.success && data.data) {
            const backendOffer = data.data;
            const mappedOffer = {
              id: backendOffer._id,
              name: backendOffer.provider?.name
                ? typeof backendOffer.provider.name === 'object'
                  ? `${backendOffer.provider.name.first || ''} ${backendOffer.provider.name.last || ''}`.trim()
                  : backendOffer.provider.name
                : 'مستخدم غير معروف',
              avatar: backendOffer.provider?.avatarUrl || '',
              rating: backendOffer.provider?.providerProfile?.rating || 0,
              price: backendOffer.budget?.min || 0,
              specialties: backendOffer.provider?.providerProfile?.skills || [],
              verified: backendOffer.provider?.isVerified || false,
              message: backendOffer.message || '',
              estimatedTimeDays: backendOffer.estimatedTimeDays || 1,
              availableDates: backendOffer.availableDates || [],
              timePreferences: backendOffer.timePreferences || [],
              createdAt: backendOffer.createdAt,
            };
            addNewOffer(mappedOffer);
          }
        } catch (error) {
          console.error('Error fetching offer details:', error);
        }
      }
    };
    fetchOfferIfMissing();
  }, [offerId, offers, accessToken, addNewOffer]);

  // Check service status
  const checkServiceStatus = useCallback(async () => {
    if (!chatId || !accessToken || !user || !offerId || isCancelled) return;

    try {
      const offerResponse = await fetch(`/api/offers/${offerId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (offerResponse.ok) {
        const offerData = await offerResponse.json();
        if (offerData.success && offerData.data) {
          const offerStatus = offerData.data.status;
          setServiceInProgress(offerStatus === 'in_progress');
          setPaymentCompleted(offerStatus === 'in_progress' || offerStatus === 'completed');
          setIsCancelled(offerStatus === 'cancelled' || offerStatus === 'cancellation_requested');
          localStorage.setItem(`service_status_${offerId}`, offerStatus);
        }
      }
      
      const response = await fetch(`/api/payment/check-status/${chatId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const isCompleted = data.success && (data.data?.status === 'completed' || data.data?.status === 'escrowed');
        setPaymentCompleted(isCompleted);
        if (isCompleted) {
          localStorage.setItem(`payment_completed_${offerId}`, 'true');
        }
      }
    } catch (error) {
      console.error('Error checking service status:', error);
    }
  }, [chatId, accessToken, user, offerId, isCancelled]);

  // Check service status on mount
  useEffect(() => {
    if (offerId) {
      const cachedServiceStatus = localStorage.getItem(`service_status_${offerId}`);
      const cachedPaymentStatus = localStorage.getItem(`payment_completed_${offerId}`);
      
      if (cachedServiceStatus) {
        setServiceInProgress(cachedServiceStatus === 'in_progress');
        setPaymentCompleted(cachedServiceStatus === 'in_progress' || cachedServiceStatus === 'completed');
        setIsCancelled(cachedServiceStatus === 'cancelled' || cachedServiceStatus === 'cancellation_requested');
      }
      
      if (cachedPaymentStatus === 'true') {
        setPaymentCompleted(true);
      }
      
      checkServiceStatus();
    }
  }, [offerId, chatId, accessToken, user, checkServiceStatus]);

  // Disable focus and periodic checks after cancellation
  useEffect(() => {
    if (isCancelled) {
      const handleFocus = () => {};
      window.removeEventListener('focus', handleFocus);
      return () => {};
    }
  }, [isCancelled]);

  useEffect(() => {
    if (isCancelled) {
      const interval = setInterval(() => {}, 30000);
      return () => clearInterval(interval);
    }
  }, [isCancelled]);

  // Check payment success
  useEffect(() => {
    const fromPayment = searchParams.get('from_payment');
    if (fromPayment === 'success' && !isCancelled) {
      checkServiceStatus();
      showSuccess('تم الدفع بنجاح', 'تم إتمام عملية الدفع بنجاح');
      navigate(`/chat/${chatId}`, { replace: true });
    }
  }, [searchParams, chatId, navigate, checkServiceStatus, showSuccess, isCancelled]);

  // Fetch messages
  useEffect(() => {
    if (!chatId || !accessToken) return;
    
    fetch(`/api/chat/conversations/${chatId}/messages?page=${page}&limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const newMessages = data.data.messages;
          setMessages(prev => page === 1 ? newMessages : [...newMessages, ...prev]);
          setHasMore(data.data.pagination.page < data.data.pagination.pages);
        }
      })
      .catch(() => setError('فشل تحميل الرسائل'));
  }, [chatId, accessToken, page]);

  // Join conversation room
  useEffect(() => {
    if (connected && chatId) {
      emit('join-conversation', { conversationId: chatId });
      emit('mark-read', { conversationId: chatId });
    }
  }, [connected, chatId, emit]);

  // Listen for real-time messages
  useEffect(() => {
    if (!connected) return;

    const offReceiveMessage = on('receive-message', (...args: unknown[]) => {
      const message = args[0] as Message;
      if (message.conversationId === chatId) {
        setMessages(prev => [...prev, message]);
        emit('mark-read', { conversationId: chatId });
      }
    });

    const offMessageSent = on('message-sent', (...args: unknown[]) => {
      const message = args[0] as Message;
      if (message.conversationId === chatId) {
        setMessages(prev => [...prev, message]);
      }
    });

    const offPaymentCompleted = on('payment:completed', (...args: unknown[]) => {
      const data = args[0] as { offerId: string };
      if (data.offerId === offerId && !isCancelled) {
        setPaymentCompleted(true);
        setServiceInProgress(true);
        if (offerId) {
          localStorage.setItem(`payment_completed_${offerId}`, 'true');
          localStorage.setItem(`service_status_${offerId}`, 'in_progress');
        }
        showSuccess('تم إيداع الضمان', 'تم إيداع الضمان بنجاح والخدمة الآن قيد التنفيذ');
        checkServiceStatus();
      }
    });

    const offServiceCompleted = on('service:completed', (...args: unknown[]) => {
      const data = args[0] as { offerId: string };
      if (data.offerId === offerId) {
        setPaymentCompleted(true);
        setServiceInProgress(false);
        setIsCancelled(false);
        if (offerId) {
          localStorage.setItem(`payment_completed_${offerId}`, 'true');
          localStorage.setItem(`service_status_${offerId}`, 'completed');
        }
        showSuccess('تم اكتمال الخدمة', 'تم تحرير المبلغ لمقدم الخدمة بنجاح');
        checkServiceStatus();
      }
    });

    const offServiceCancelled = on('service:cancelled', (...args: unknown[]) => {
      const data = args[0] as { offerId: string };
      if (data.offerId === offerId) {
        setServiceInProgress(false);
        setPaymentCompleted(false);
        setIsCancelled(true);
        if (offerId) {
          localStorage.setItem(`service_status_${offerId}`, 'cancelled');
        }
        showSuccess('تم إلغاء الخدمة', 'تم إلغاء الخدمة بنجاح');
        checkServiceStatus();
      }
    });

    return () => {
      offReceiveMessage?.();
      offMessageSent?.();
      offPaymentCompleted?.();
      offServiceCompleted?.();
      offServiceCancelled?.();
    };
  }, [connected, on, emit, chatId, offerId, showSuccess, checkServiceStatus, isCancelled]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || !user || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const receiverId = user.id === conversation.participants.seeker._id 
        ? conversation.participants.provider._id 
        : conversation.participants.seeker._id;

      const messageData = {
        conversationId: chatId,
        receiverId,
        content: messageContent
      };

      emit('send-message', messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  const getOtherParticipant = () => {
    if (!conversation || !user) return null;
    
    return user.id === conversation.participants.seeker._id 
      ? conversation.participants.provider 
      : conversation.participants.seeker;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-EG');
    }
  };

  const handleAcceptOffer = async () => {
    if (!offerId || !accessToken || isCancelled) return;
    
    try {
      await fetchNegotiation(offerId);
      
      if (!negotiationState[offerId]?.confirmationStatus?.seeker || !negotiationState[offerId]?.confirmationStatus?.provider) {
        showError('تأكيد التفاوض مطلوب', 'يجب على كلا الطرفين تأكيد شروط التفاوض قبل قبول العرض');
        return;
      }

      const currentTerms = negotiationState[offerId]?.currentTerms;
      if (!currentTerms?.price || !currentTerms?.date || !currentTerms?.time || !currentTerms?.materials || !currentTerms?.scope) {
        showError('بيانات التفاوض غير مكتملة', 'يجب تحديد جميع شروط التفاوض: السعر، التاريخ، الوقت، المواد، ونطاق العمل');
        return;
      }
      
      const checkResponse = await fetch(`/api/offers/${offerId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.success && checkData.data && checkData.data.status === 'accepted') {
          setPaymentCompleted(true);
          showSuccess('العرض مقبول بالفعل', 'يمكنك الآن إكمال الدفع');
          setShowPaymentModal(true);
          return;
        }
      }
      
      const response = await fetch(`/api/offers/${offerId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setPaymentCompleted(true);
        showSuccess('تم قبول العرض', 'تم قبول العرض بنجاح، يمكنك الآن إكمال الدفع');
        await fetchNegotiation(offerId);
        await checkServiceStatus();
        setShowPaymentModal(true);
      } else {
        if (data.error?.code === 'AGREEMENT_INCOMPLETE') {
          showError('فشل في قبول العرض', 'يجب التأكد من اكتمال جميع شروط التفاوض وتأكيد الطرفين عليها');
          await fetchNegotiation(offerId);
          checkServiceStatus();
        } else if (data.error?.message?.includes('status')) {
          showError('فشل في قبول العرض', 'حالة العرض الحالية لا تسمح بالقبول');
          await checkServiceStatus();
          const offerResponse = await fetch(`/api/offers/${offerId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (offerResponse.ok) {
            const offerData = await offerResponse.json();
            if (offerData.success && offerData.data && offerData.data.status === 'accepted') {
              setPaymentCompleted(true);
              showSuccess('العرض مقبول بالفعل', 'يمكنك الآن إكمال الدفع');
              setShowPaymentModal(true);
            }
          }
        } else {
          showError('فشل في قبول العرض', data.error?.message || 'حدث خطأ أثناء محاولة قبول العرض');
        }
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      showError('فشل في قبول العرض', 'حدث خطأ أثناء محاولة قبول العرض');
      try {
        await fetchNegotiation(offerId);
        checkServiceStatus();
      } catch (refreshError) {
        console.error('Error refreshing state:', refreshError);
      }
    }
  };

  const handlePaymentConfirm = async (amount: number) => {
    if (!conversation || !user || !accessToken || !offerId || isCancelled) return;

    const seekerId = conversation.participants.seeker._id;
    const isSeeker = user.id === seekerId;
    if (!isSeeker) {
      showError('خطأ في عملية الدفع', 'فقط طالب الخدمة يمكنه إنشاء الدفع');
      setShowPaymentModal(false);
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await fetch('/api/payment/create-escrow-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          offerId,
          amount
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        showError('خطأ في عملية الدفع', data.message || 'حدث خطأ أثناء عملية الدفع');
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      showError('خطأ في عملية الدفع', 'حدث خطأ في اتصال الشبكة');
      setShowPaymentModal(false);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCompleteService = async () => {
    if (!offerId || !accessToken || isCancelled) return;

    setCompletionLoading(true);
    try {
      const response = await fetch(`/api/offers/${offerId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setServiceInProgress(false);
        setPaymentCompleted(true);
        setIsCancelled(false);
        showSuccess('تم تأكيد اكتمال الخدمة', 'تم تحرير المبلغ لمقدم الخدمة بنجاح');
        setShowCompletionModal(false);
        checkServiceStatus();
        setShowReviewModal(true);
      } else {
        showError('خطأ في تأكيد اكتمال الخدمة', data.message || 'حدث خطأ أثناء تأكيد اكتمال الخدمة');
      }
    } catch (error) {
      console.error('Service completion error:', error);
      showError('خطأ في تأكيد اكتمال الخدمة', 'حدث خطأ أثناء تأكيد اكتمال الخدمة');
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    setReviewLoading(true);
    try {
      const isSeeker = user?.id === conversation?.participants.seeker._id;
      const role = isSeeker ? "provider" : "seeker";
      const reviewedUser = isSeeker
        ? conversation?.participants.provider._id
        : conversation?.participants.seeker._id;

      const response = await fetch(`/api/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          comment,
          role,
          reviewedUser,
          jobRequest: conversation?.jobRequestId?._id
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showSuccess('تم إرسال التقييم بنجاح');
        setShowReviewModal(false);
      } else {
        showError('فشل إرسال التقييم', data.message || 'حدث خطأ أثناء إرسال التقييم');
      }
    } catch (error) {
      showError('فشل إرسال التقييم', 'حدث خطأ أثناء إرسال التقييم');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRequestCancellation = async () => {
    if (!offerId || !accessToken || isCancelled) return;

    setCancellationLoading(true);
    try {
      const response = await fetch(`/api/offers/${offerId}/cancel-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancellationReason || 'طلب إلغاء بدون سبب محدد'
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setServiceInProgress(false);
        setPaymentCompleted(false);
        setIsCancelled(true);
        showSuccess('تم طلب إلغاء الخدمة', `تم إرسال طلب الإلغاء بنجاح. نسبة الاسترداد المتوقعة: ${data.data.refundPercentage}%`);
        setShowCancellationModal(false);
        checkServiceStatus();
      } else {
        showError('خطأ في طلب إلغاء الخدمة', data.message || 'حدث خطأ أثناء طلب إلغاء الخدمة');
      }
    } catch (error) {
      console.error('Cancellation request error:', error);
      showError('خطأ في طلب إلغاء الخدمة', 'حدث خطأ أثناء طلب إلغاء الخدمة');
    } finally {
      setCancellationLoading(false);
    }
  };

  const handleReportIssue = () => {
    setShowReportModal(true);
  };

  const handleReportSubmit = async (problemType: string, description: string) => {
    if (!conversation || !user) return;
    
    setReportLoading(true);
    try {
      const isSeeker = user?.id === conversation?.participants.seeker._id;
      const reportedUserId = isSeeker 
        ? conversation.participants.provider._id 
        : conversation.participants.seeker._id;

      await submitComplaint({
        reportedUserId,
        jobRequestId: conversation.jobRequestId?._id || '',
        problemType,
        description
      }, accessToken);

      setShowReportModal(false);
      showSuccess('تم إرسال البلاغ بنجاح', 'سيتم مراجعة البلاغ من قبل الإدارة قريباً');
    } catch (err) {
      console.error('Error submitting report:', err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال البلاغ';
      if (errorMessage.includes('لديك بلاغ قيد المعالجة')) {
        showWarning('بلاغ موجود بالفعل', 'لديك بلاغ قيد المعالجة لهذا الطلب بالفعل');
      } else {
        showError('فشل إرسال البلاغ', errorMessage);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const isSeeker = user?.id === conversation?.participants.seeker._id;

  const breadcrumbItems = [
    { label: 'الرئيسية', href: '/' },
    { label: 'المحادثات', href: '/conversations' },
    { label: 'المحادثة', active: true }
  ];

  const currentOffer = offers.find(o => o.id === offerId);

  // Status Bar Component
  const StatusBar = () => {
    const negotiationOffer = currentOffer && negotiationState[currentOffer.id];
    return (
      <div className="flex flex-col gap-4 p-4">
        {currentOffer?.status === 'cancelled' && (
          <div className="flex items-center gap-2 text-red-600 text-sm px-3 py-2 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            تم إلغاء الخدمة
          </div>
        )}
        {currentOffer?.status === 'cancellation_requested' && (
          <div className="flex items-center gap-2 text-amber-600 text-sm px-3 py-2 bg-amber-50 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            تم طلب إلغاء الخدمة - بانتظار المعالجة
          </div>
        )}
        {isSeeker && offerId && negotiationOffer && 
         !negotiationOffer.canAcceptOffer && 
         !paymentCompleted &&
         currentOffer?.status !== 'cancelled' && currentOffer?.status !== 'cancellation_requested' && (
          <div className="text-amber-600 text-sm px-3 py-2 bg-amber-50 rounded-lg flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            {!negotiationOffer.confirmationStatus?.seeker ? 
              'يجب عليك تأكيد شروط التفاوض' : 
              'بانتظار تأكيد مقدم الخدمة للشروط'}
          </div>
        )}
        {paymentCompleted && currentOffer?.status === 'completed' && (
          <div className="flex items-center gap-2 text-green-600 text-sm px-3 py-2 bg-green-50 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            تم تحرير المبلغ وإكمال الخدمة
          </div>
        )}
      </div>
    );
  };

  // Action Buttons Component
  const ActionButtons = () => (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-wrap">
      {!(currentOffer?.status === 'cancelled' || currentOffer?.status === 'cancellation_requested' || currentOffer?.status === 'completed') && (
        <>
          {isSeeker && offerId && negotiationState[offerId]?.canAcceptOffer && !paymentCompleted && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptOffer}
              className="flex items-center gap-2 flex-1 md:flex-none"
            >
              <CreditCard className="w-4 h-4" />
              قبول وبدء الدفع
            </Button>
          )}
          {isSeeker && serviceInProgress && (
            <Button
              variant="success"
              size="sm"
              onClick={() => setShowCompletionModal(true)}
              className="flex items-center gap-2 flex-1 md:flex-none"
            >
              <CheckCircle className="w-4 h-4" />
              تأكيد اكتمال الخدمة
            </Button>
          )}
          {(serviceInProgress || paymentCompleted) && currentOffer?.status !== 'completed' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancellationModal(true)}
              className="flex items-center gap-2 flex-1 md:flex-none"
            >
              <AlertCircle className="w-4 h-4" />
              طلب إلغاء الخدمة
            </Button>
          )}
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleReportIssue}
        className="flex items-center gap-2 flex-1 md:flex-none"
      >
        <AlertTriangle className="w-4 h-4" />
        الإبلاغ عن مشكلة
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowNegotiationMobile(!showNegotiationMobile)}
        className="flex items-center gap-2 flex-1 md:hidden"
      >
        {showNegotiationMobile ? 'إخفاء التفاوض' : 'عرض التفاوض'}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <PageLayout
        title="جاري التحميل..."
        user={user}
        onLogout={() => {}}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 h-full min-h-[400px] p-4 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <BaseCard className="flex-1 flex flex-col h-full">
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full skeleton-pulse"></div>
                  <div className="w-12 h-12 bg-gray-200 rounded-full skeleton-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-6 bg-gray-200 rounded skeleton-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded skeleton-pulse w-1/2"></div>
                    <div className="flex gap-4">
                      <div className="h-3 bg-gray-200 rounded skeleton-pulse w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded skeleton-pulse w-1/4"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-4">
                <div className="flex justify-start">
                  <div className="w-64 h-16 bg-gray-200 rounded-2xl skeleton-pulse"></div>
                </div>
                <div className="flex justify-end">
                  <div className="w-48 h-12 bg-gray-200 rounded-2xl skeleton-pulse"></div>
                </div>
                <div className="flex justify-start">
                  <div className="w-56 h-20 bg-gray-200 rounded-2xl skeleton-pulse"></div>
                </div>
                <div className="flex justify-end">
                  <div className="w-52 h-14 bg-gray-200 rounded-2xl skeleton-pulse"></div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100">
                <div className="h-20 bg-gray-200 rounded-xl skeleton-pulse"></div>
              </div>
            </BaseCard>
          </div>
          <div className="hidden md:flex flex-col w-96 max-w-full h-full">
            <div className="h-full flex flex-col border-r border-gray-100 pl-6 space-y-4">
              <div className="h-64 bg-gray-200 rounded-lg skeleton-pulse"></div>
              <div className="h-48 bg-gray-200 rounded-lg skeleton-pulse"></div>
              <div className="h-32 bg-gray-200 rounded-lg skeleton-pulse"></div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !conversation) {
    return (
      <PageLayout
        title="خطأ"
        user={user}
        onLogout={() => {}}
      >
        <div className="max-w-4xl mx-auto">
          <BaseCard className="text-center py-16">
            <div className="bg-gradient-to-br from-red-50 to-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-3">حدث خطأ</h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto leading-relaxed">
              {error || 'المحادثة غير موجودة أو لا يمكن الوصول إليها'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate('/conversations')}
                className="px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                العودة للمحادثات
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl"
              >
                إعادة تحميل الصفحة
              </Button>
            </div>
          </BaseCard>
        </div>
      </PageLayout>
    );
  }

  const otherParticipant = getOtherParticipant();

  return (
    <PageLayout
      title={`محادثة مع ${otherParticipant?.name.first} ${otherParticipant?.name.last}`}
      subtitle={conversation.jobRequestId?.title || 'محادثة غير مرتبطة بطلب خدمة'}
      breadcrumbItems={breadcrumbItems}
      user={user}
      onLogout={() => {}}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 h-full min-h-[400px] p-4 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <BaseCard className="flex-1 flex flex-col h-full shadow-lg border-0">
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/conversations')}
                  className="p-2 flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary text-lg mb-1">
                    {otherParticipant?.name.first} {otherParticipant?.name.last}
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {conversation.jobRequestId?.title || 'محادثة غير مرتبطة بطلب خدمة'}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-text-secondary/80">
                      <span className="text-pink-500">📍</span>
                      <span>
                        {conversation.jobRequestId?.location?.address || 
                         `${conversation.jobRequestId?.location?.city || ''} ${conversation.jobRequestId?.location?.government || ''}`.trim() || 
                         'غير محدد'}
                      </span>
                    </div>
                    {connected ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-glow"></div>
                        <span className="font-medium">متصل</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>غير متصل</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <StatusBar />
              <ActionButtons />
            </div>
            <div className={showNegotiationMobile ? "fixed inset-0 bg-white z-50 overflow-y-auto p-4 transition-transform duration-300 transform translate-x-0 md:hidden" : "fixed inset-0 bg-white z-50 overflow-y-auto p-4 transition-transform duration-300 transform translate-x-full md:hidden"}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">تفاصيل التفاوض</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNegotiationMobile(false)}
                >
                  إغلاق
                </Button>
              </div>
              {offerId && currentOffer?.status === 'cancelled' && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                  <h3 className="font-bold text-red-800 mb-2">الخدمة تم إلغاؤها</h3>
                  <p className="text-red-700 text-sm">لا يمكن عرض تفاصيل التفاوض بعد الإلغاء.</p>
                </div>
              )}
              {offerId && !negotiationState[offerId] && currentOffer?.status !== 'cancelled' && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                  <h3 className="font-bold text-amber-800 mb-2">معلومات التصحيح</h3>
                  <p className="text-amber-700 text-sm">معرّف العرض: {offerId}</p>
                  <p className="text-amber-700 text-sm">لم يتم العثور على بيانات التفاوض</p>
                  <button 
                    onClick={() => {
                      if (offerId) {
                        fetchNegotiation(offerId);
                        fetchNegotiationHistory(offerId);
                      }
                    }}
                    className="mt-2 bg-deep-teal text-white px-3 py-1 rounded-md text-xs"
                  >
                    إعادة تحميل بيانات التفاوض
                  </button>
                </div>
              )}
              {offerId && negotiationState[offerId] && user && conversation && currentOffer?.status !== 'cancelled' && (
                <div className="flex flex-col gap-4 p-4">
                  <NegotiationSummary
                    negotiation={negotiationState[offerId]}
                    isProvider={user.id === conversation.participants.provider._id}
                    isSeeker={user.id === conversation.participants.seeker._id}
                    jobRequest={{
                      id: conversation.jobRequestId?._id || '',
                      title: conversation.jobRequestId?.title || '',
                      description: conversation.jobRequestId?.description || '',
                      budget: {
                        min: conversation.jobRequestId?.budget?.min || 0,
                        max: conversation.jobRequestId?.budget?.max || 0,
                        currency: 'EGP'
                      },
                      location: conversation.jobRequestId?.location?.address || '',
                      postedBy: {
                        id: conversation.participants.seeker._id,
                        name: `${conversation.participants.seeker.name.first} ${conversation.participants.seeker.name.last}`,
                        isPremium: false
                      },
                      createdAt: conversation.jobRequestId?.createdAt || '',
                      preferredDate: conversation.jobRequestId?.deadline || '',
                      status: conversation.jobRequestId?.status === 'open' ? 'open' : 
                        conversation.jobRequestId?.status === 'assigned' || conversation.jobRequestId?.status === 'in_progress' ? 'accepted' : 'closed',
                      category: '',
                      availability: { days: [], timeSlots: [] }
                    }}
                    offer={offers.find(o => o.id === offerId) as Offer}
                    paymentCompleted={paymentCompleted}
                    serviceCompleted={currentOffer?.status === 'completed'}
                    onEditSave={async (terms) => {
                      if (offerId) {
                        await updateNegotiation(offerId, terms);
                        await resetNegotiation(offerId);
                      }
                    }}
                    onConfirm={() => {
                      if (offerId) {
                        confirmNegotiation(offerId);
                        setTimeout(() => setShowNegotiationMobile(false), 1500);
                      }
                    }}
                    onReset={() => {
                      if (offerId) {
                        resetNegotiation(offerId);
                      }
                    }}
                  />
                  <NegotiationHistory
                    negotiationHistory={negotiationState[offerId]?.negotiationHistory}
                    userMap={{
                      [conversation.participants.seeker._id]: `${conversation.participants.seeker.name.first} ${conversation.participants.seeker.name.last}`,
                      [conversation.participants.provider._id]: `${conversation.participants.provider.name.first} ${conversation.participants.provider.name.last}`
                    }}
                    isMobile={true}
                  />
                </div>
              )}
            </div>
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-warm-cream/20 via-white to-warm-cream/10 chat-scrollbar"
              aria-label="رسائل المحادثة"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;
                if (target.scrollTop === 0 && hasMore) {
                  loadMoreMessages();
                }
              }}
            >
              {hasMore && (
                <div className="text-center py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreMessages}
                    disabled={loading}
                    className="bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white hover:border-deep-teal transition-all duration-200 shadow-sm"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-deep-teal"></div>
                        جاري التحميل...
                      </div>
                    ) : (
                      'تحميل المزيد'
                    )}
                  </Button>
                </div>
              )}
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md text-center">
                    <div className="bg-gradient-to-br from-primary/10 to-deep-teal/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-10 h-10 text-deep-teal" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-3">لم تبدأ المحادثة بعد</h3>
                    <p className="text-text-secondary mb-6 leading-relaxed">
                      ابدأ المحادثة مع <span className="font-semibold text-deep-teal">{otherParticipant?.name.first} {otherParticipant?.name.last}</span> للتفاوض على تفاصيل الخدمة.
                    </p>
                    <div className="bg-gradient-to-r from-deep-teal/5 to-primary/5 p-4 rounded-lg border border-deep-teal/20">
                      <p className="text-sm text-text-secondary">
                        💡 <strong>نصيحة:</strong> ابدأ بالترحيب واشرح متطلباتك بوضوح للحصول على أفضل النتائج
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {messages.map((message, index) => {
                const isOwnMessage = message.senderId === user?.id;
                const showDate = index === 0 ||
                  new Date(message.timestamp).toDateString() !==
                  new Date(messages[index - 1]?.timestamp).toDateString();
                const isLastMessage = index === messages.length - 1;
                
                return (
                  <div key={message._id} className={`transition-all duration-300 ${isLastMessage ? 'animate-fade-in' : ''}`}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="inline-block bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-text-secondary border border-gray-200 shadow-sm font-medium">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 group`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-5 py-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md message-bubble chat-message ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-deep-teal to-deep-teal/90 text-white rounded-br-lg'
                            : 'bg-white text-text-primary rounded-bl-lg border border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                        <div className={`flex items-center justify-end mt-3 ${
                          isOwnMessage ? 'text-white/80' : 'text-text-secondary/70'
                        }`}>
                          <span className="text-xs font-medium">
                            {formatTime(message.timestamp)}
                          </span>
                          {isOwnMessage && (
                            <div className="ml-2 flex items-center gap-1">
                              {message.read ? (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-white/80 rounded-full"></div>
                                  <div className="w-2 h-2 bg-white/80 rounded-full"></div>
                                </div>
                              ) : (
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="relative">
                  <FormTextarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="resize-none border-2 border-gray-200 focus:border-deep-teal rounded-xl pr-12 transition-all duration-200 hover:border-gray-300 focus:shadow-lg focus:shadow-deep-teal/10"
                    rows={2}
                    maxLength={2000}
                    disabled={sending}
                    size="lg"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {newMessage.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary/60">
                        <span>{newMessage.length}</span>
                        <span>/</span>
                        <span>2000</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span>متصل</span>
                    </div>
                    <span>•</span>
                    <span>اضغط Enter للإرسال</span>
                    <span>•</span>
                    <span>Shift + Enter للسطر الجديد</span>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
                  >
                    {sending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>جاري الإرسال...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        <span>إرسال</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </BaseCard>
        </div>
        <div className="hidden md:flex flex-col w-96 max-w-full h-full sticky top-8 bg-transparent">
          <div className="h-full flex flex-col border-r border-gray-100 pl-6 overflow-y-auto overflow-x-hidden" aria-label="ملخص التفاوض والتاريخ">
            <StatusBar />
            {!offerId && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                <h3 className="font-bold text-amber-800 mb-2">معلومات التصحيح</h3>
                <p className="text-amber-700 text-sm">لم يتم العثور على معرّف العرض</p>
              </div>
            )}
            {offerId && currentOffer?.status === 'cancelled' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                <h3 className="font-bold text-red-800 mb-2">الخدمة تم إلغاؤها</h3>
                <p className="text-red-700 text-sm">لا يمكن عرض تفاصيل التفاوض بعد الإلغاء.</p>
              </div>
            )}
            {offerId && !negotiationState[offerId] && currentOffer?.status !== 'cancelled' && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                <h3 className="font-bold text-amber-800 mb-2">معلومات التصحيح</h3>
                <p className="text-amber-700 text-sm">معرّف العرض: {offerId}</p>
                <p className="text-amber-700 text-sm">لم يتم العثور على بيانات التفاوض</p>
                <button 
                  onClick={() => {
                    if (offerId) {
                      fetchNegotiation(offerId);
                      fetchNegotiationHistory(offerId);
                    }
                  }}
                  className="mt-2 bg-deep-teal text-white px-3 py-1 rounded-md text-xs"
                >
                  إعادة تحميل بيانات التفاوض
                </button>
              </div>
            )}
            {offerId && negotiationState[offerId] && user && conversation && currentOffer?.status !== 'cancelled' && (
              <div className="flex flex-col gap-4 p-4">
                <NegotiationSummary
                  negotiation={negotiationState[offerId]}
                  isProvider={user.id === conversation.participants.provider._id}
                  isSeeker={user.id === conversation.participants.seeker._id}
                  jobRequest={{
                    id: conversation.jobRequestId?._id || '',
                    title: conversation.jobRequestId?.title || '',
                    description: conversation.jobRequestId?.description || '',
                    budget: {
                      min: conversation.jobRequestId?.budget?.min || 0,
                      max: conversation.jobRequestId?.budget?.max || 0,
                      currency: 'EGP'
                    },
                    location: conversation.jobRequestId?.location?.address || '',
                    postedBy: {
                      id: conversation.participants.seeker._id,
                      name: `${conversation.participants.seeker.name.first} ${conversation.participants.seeker.name.last}`,
                      isPremium: false
                    },
                    createdAt: conversation.jobRequestId?.createdAt || '',
                    preferredDate: conversation.jobRequestId?.deadline || '',
                    status: conversation.jobRequestId?.status === 'open' ? 'open' : 
                      conversation.jobRequestId?.status === 'assigned' || conversation.jobRequestId?.status === 'in_progress' ? 'accepted' : 'closed',
                    category: '',
                    availability: { days: [], timeSlots: [] }
                  }}
                  offer={offers.find(o => o.id === offerId) as Offer}
                  paymentCompleted={paymentCompleted}
                  serviceCompleted={currentOffer?.status === 'completed'}
                  onEditSave={async (terms) => {
                    if (offerId) {
                      await updateNegotiation(offerId, terms);
                      try {
                        await resetNegotiation(offerId);
                        showSuccess('تم تحديث شروط التفاوض', 'تم تحديث شروط التفاوض وإعادة تعيين التأكيدات بنجاح');
                      } catch (error) {
                        console.error('Error resetting confirmations:', error);
                        showSuccess('تم تحديث شروط التفاوض', 'تم تحديث شروط التفاوض بنجاح، لكن فشلت إعادة تعيين التأكيدات');
                      }
                    }
                  }}
                  onConfirm={() => {
                    if (offerId) {
                      confirmNegotiation(offerId);
                    }
                  }}
                  onReset={async () => {
                    if (offerId) {
                      try {
                        await resetNegotiation(offerId);
                        showSuccess('تم إعادة تعيين التأكيدات', 'تم إعادة تعيين تأكيدات التفاوض بنجاح');
                        await fetchNegotiation(offerId);
                        checkServiceStatus();
                      } catch (error) {
                        console.error('Error resetting confirmations:', error);
                        showError('فشل في إعادة تعيين التأكيدات', 'حدث خطأ أثناء محاولة إعادة تعيين تأكيدات التفاوض');
                        await fetchNegotiation(offerId);
                        checkServiceStatus();
                      }
                    }
                  }}
                />
                <NegotiationHistory
                  negotiationHistory={negotiationState[offerId]?.negotiationHistory}
                  userMap={{
                    [conversation.participants.seeker._id]: `${conversation.participants.seeker.name.first} ${conversation.participants.seeker.name.last}`,
                    [conversation.participants.provider._id]: `${conversation.participants.provider.name.first} ${conversation.participants.provider.name.last}`
                  }}
                  isMobile={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {conversation && offerId && negotiationState[offerId] && !isCancelled && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handlePaymentConfirm}
          serviceTitle={conversation.jobRequestId?.title || 'محادثة غير مرتبطة بطلب خدمة'}
          providerName={`${conversation.participants.provider.name.first} ${conversation.participants.provider.name.last}`}
          negotiatedPrice={negotiationState[offerId]?.currentTerms?.price}
          scheduledDate={negotiationState[offerId]?.currentTerms?.date}
          scheduledTime={negotiationState[offerId]?.currentTerms?.time}
          loading={paymentLoading}
        />
      )}
      
      <Modal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        title="تأكيد اكتمال الخدمة"
      >
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
            <div className="text-green-800">
              <h3 className="font-semibold mb-1">تأكيد اكتمال الخدمة</h3>
              <p className="text-sm">
                بالضغط على زر التأكيد، أنت تؤكد أن الخدمة قد تم إنجازها بنجاح وأنك موافق على تحرير المبلغ المحتجز لمقدم الخدمة.
              </p>
              <p className="text-sm mt-2 font-medium">
                ملاحظة: لا يمكن التراجع عن هذا الإجراء بعد التأكيد.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCompletionModal(false)}
              disabled={completionLoading}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="success"
              onClick={handleCompleteService}
              disabled={completionLoading}
              className="flex-1"
            >
              {completionLoading ? 'جاري التأكيد...' : 'تأكيد اكتمال الخدمة'}
            </Button>
          </div>
        </div>
      </Modal>
      
      <Modal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        title="طلب إلغاء الخدمة"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
            <div className="text-amber-800">
              <h3 className="font-semibold mb-1">سياسة الإلغاء</h3>
              <ul className="text-sm space-y-1">
                <li>• إلغاء قبل 12 ساعة من موعد الخدمة: استرداد 100% من المبلغ</li>
                <li>• إلغاء خلال أقل من 12 ساعة: استرداد 70% فقط من المبلغ</li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              سبب طلب الإلغاء
            </label>
            <FormTextarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="اذكر سبب طلب الإلغاء..."
              className="resize-none border-2 border-gray-200"
              rows={3}
              maxLength={500}
              disabled={cancellationLoading}
            />
            <p className="text-sm text-text-secondary mt-1">
              {cancellationReason.length}/500
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCancellationModal(false)}
              disabled={cancellationLoading}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={handleRequestCancellation}
              disabled={cancellationLoading}
              className="flex-1"
            >
              {cancellationLoading ? 'جاري الإرسال...' : 'تأكيد طلب الإلغاء'}
            </Button>
          </div>
        </div>
      </Modal>

      {conversation && (
        <ReportProblemModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
          providerName={`${conversation.participants.provider.name.first} ${conversation.participants.provider.name.last}`}
          serviceTitle={conversation.jobRequestId?.title || 'محادثة غير مرتبطة بطلب خدمة'}
          loading={reportLoading}
        />
      )}
      {conversation && offerId && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          providerName={`${conversation.participants.provider.name.first} ${conversation.participants.provider.name.last}`}
          serviceTitle={conversation.jobRequestId?.title || 'محادثة غير مرتبطة بطلب خدمة'}
          loading={reviewLoading}
        />
      )}
    </PageLayout>
  );
};

export default ChatPage;