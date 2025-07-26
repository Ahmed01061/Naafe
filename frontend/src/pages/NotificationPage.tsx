import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from '../components/ui/NotificationBell';
import Button from '../components/ui/Button';
import BaseCard from '../components/ui/BaseCard';
import Badge from '../components/ui/Badge';
import PageLayout from '../components/layout/PageLayout';
import { MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const PAGE_SIZE = 20;

const NotificationPage: React.FC = () => {
  const { accessToken, user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch(`/api/notifications?page=${page}&limit=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data.notifications)) {
          setNotifications(data.data.notifications);
          setTotalPages(data.data.pagination.totalPages || 1);
          setTotalItems(data.data.pagination.totalItems || 0);
        } else {
          setError('فشل تحميل الإشعارات');
        }
      })
      .catch(() => setError('فشل الاتصال بالخادم'))
      .finally(() => setLoading(false));
  }, [accessToken, page]);

  const handleMarkAsRead = async (id: string, relatedChatId?: string) => {
    if (!accessToken) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      
      if (relatedChatId) {
        // Check if this is a direct conversation (no jobRequestId)
        try {
          const conversationRes = await fetch(`/api/chat/conversations/${relatedChatId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const conversationData = await conversationRes.json();
          
          if (conversationData.success && conversationData.data.conversation) {
            const conversation = conversationData.data.conversation;
            
            // If this is a direct conversation (no jobRequestId), navigate to direct chat
            if (!conversation.jobRequestId) {
              // Determine the other user's ID
              const otherUserId = user?.id === conversation.participants.seeker._id 
                ? conversation.participants.provider._id 
                : conversation.participants.seeker._id;
              
              navigate(`/chat/new?userId=${otherUserId}`);
            } else {
              // This is a job request conversation, navigate normally
              navigate(`/chat/${relatedChatId}`);
            }
          } else {
            // Fallback to normal navigation if conversation fetch fails
            navigate(`/chat/${relatedChatId}`);
          }
        } catch (error) {
          console.error('Error fetching conversation details:', error);
          // Fallback to normal navigation
          navigate(`/chat/${relatedChatId}`);
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!accessToken) return;
    setMarkingAll(true);
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'offer_accepted':
        return CheckCircle;
      case 'offer_received':
        return MessageCircle;
      case 'new_message':
        return MessageCircle;
      default:
        return AlertCircle;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'offer_accepted':
        return 'bg-green-50 text-green-600';
      case 'offer_received':
        return 'bg-blue-50 text-blue-600';
      case 'new_message':
        return 'bg-blue-50 text-blue-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} يوم`;
    return date.toLocaleDateString('ar-EG');
  };

  const breadcrumbItems = [
    { label: 'الرئيسية', href: '/' },
    { label: 'الإشعارات', active: true }
  ];

  const renderNotificationCard = (notif: NotificationItem) => {
    const Icon = getNotificationIcon(notif.type);
    const iconColor = getNotificationColor(notif.type);
    
    return (
      <BaseCard
        key={notif._id}
        className={`transition-all duration-200 ${
          !notif.isRead 
            ? 'border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent' 
            : 'border border-gray-100 hover:border-gray-200'
        }`}
        onClick={() => handleMarkAsRead(notif._id, notif.relatedChatId)}
        hover={true}
        padding="md"
      >
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="flex-grow min-w-0">
            <p className={`text-sm leading-relaxed ${
              !notif.isRead ? 'font-semibold text-deep-teal' : 'text-text-primary'
            }`}>
              {notif.message}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(notif.createdAt)}
              </div>
              {!notif.isRead && (
                <Badge variant="status" size="sm">
                  جديد
                </Badge>
              )}
            </div>
          </div>
          
          {notif.relatedChatId && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkAsRead(notif._id, notif.relatedChatId);
              }}
              className="flex-shrink-0"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              دردشة
            </Button>
          )}
        </div>
      </BaseCard>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const startItem = (page - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(page * PAGE_SIZE, totalItems);
    
    return (
      <div className="flex items-center justify-between mt-8">
        <span className="text-sm text-text-secondary">
          عرض {startItem} إلى {endItem} من {totalItems} إشعار
        </span>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            السابق
          </Button>
          
          <span className="px-4 py-2 text-sm text-text-secondary bg-light-cream rounded-lg">
            صفحة {page} من {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            التالي
          </Button>
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      title="الإشعارات"
      subtitle="تابع آخر التحديثات والرسائل المهمة"
      breadcrumbItems={breadcrumbItems}
      user={user}
      onLogout={logout}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Badge variant="status" size="lg">
              {notifications.filter(n => !n.isRead).length} جديد
            </Badge>
            <span className="text-text-secondary">
              إجمالي {totalItems} إشعار
            </span>
          </div>
          
          {notifications.some(n => !n.isRead) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {markingAll ? 'جاري التحديث...' : 'تعليم الكل كمقروء'}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <BaseCard key={i} className="animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-grow space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </BaseCard>
            ))}
          </div>
        ) : error ? (
          <BaseCard className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">حدث خطأ</h3>
            <p className="text-text-secondary">{error}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              إعادة المحاولة
            </Button>
          </BaseCard>
        ) : notifications.length === 0 ? (
          <BaseCard className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">لا توجد إشعارات</h3>
            <p className="text-text-secondary">ستظهر هنا الإشعارات الجديدة عند وصولها</p>
          </BaseCard>
        ) : (
          <div className="space-y-4">
            {notifications.map(renderNotificationCard)}
          </div>
        )}

        {/* Pagination */}
        {renderPagination()}
      </div>
    </PageLayout>
  );
};

export default NotificationPage; 