import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/ui/BackButton';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { 
  Clock, 
  MapPin, 
  DollarSign, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare
} from 'lucide-react';

interface HireRequest {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  location: {
    government: string;
    city: string;
    street?: string;
    apartmentNumber?: string;
    additionalInformation?: string;
  };
  preferredDateTime: string;
  deliveryTimeDays: number;
  tags: string[];
  images: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  seeker: {
    _id: string;
    name: { first: string; last: string } | string;
    email: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
}

const ProviderHireRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [hireRequests, setHireRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'completed'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchHireRequests();
  }, [user, navigate]);

  const fetchHireRequests = async () => {
    try {
      setLoading(true);
      const token = accessToken || localStorage.getItem('accessToken') || '';
      
      const res = await fetch('/api/requests/provider/hire-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.success) {
        setHireRequests(data.data.hireRequests || []);
      } else {
        setError(data.error?.message || 'فشل تحميل طلبات التوظيف');
      }
    } catch (err) {
      console.error('Error fetching hire requests:', err);
      setError('فشل تحميل طلبات التوظيف');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      const token = accessToken || localStorage.getItem('accessToken') || '';
      
      const res = await fetch(`/api/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await res.json();
      if (data.success) {
        showSuccess(`تم ${newStatus === 'accepted' ? 'قبول' : 'رفض'} الطلب بنجاح`);
        fetchHireRequests(); // Refresh the list
      } else {
        showError(data.error?.message || 'فشل تحديث حالة الطلب');
      }
    } catch (err) {
      console.error('Error updating request status:', err);
      showError('فشل تحديث حالة الطلب');
    }
  };

  const handleViewDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleContactSeeker = (seekerId: string) => {
    navigate(`/chat/new?userId=${seekerId}`);
  };

  const getSeekerName = (seeker: HireRequest['seeker']): string => {
    if (typeof seeker.name === 'string') return seeker.name;
    return `${seeker.name?.first || ''} ${seeker.name?.last || ''}`.trim() || 'مستخدم';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'في الانتظار', variant: 'warning' as const },
      accepted: { label: 'مقبول', variant: 'success' as const },
      rejected: { label: 'مرفوض', variant: 'error' as const },
      completed: { label: 'مكتمل', variant: 'success' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = hireRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

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

  return (
    <div className="min-h-screen bg-warm-cream">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <BackButton to="/profile" className="mb-6" />
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-deep-teal mb-2">طلبات التوظيف</h1>
            <p className="text-text-secondary">إدارة طلبات التوظيف المباشر التي تلقيتها</p>
          </div>

          {/* Filter Tabs */}
          <BaseCard className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'الكل', count: hireRequests.length },
                { key: 'pending', label: 'في الانتظار', count: hireRequests.filter(r => r.status === 'pending').length },
                { key: 'accepted', label: 'مقبول', count: hireRequests.filter(r => r.status === 'accepted').length },
                { key: 'rejected', label: 'مرفوض', count: hireRequests.filter(r => r.status === 'rejected').length },
                { key: 'completed', label: 'مكتمل', count: hireRequests.filter(r => r.status === 'completed').length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-deep-teal text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </BaseCard>

          {error && (
            <BaseCard className="mb-6">
              <div className="text-red-600 text-center">{error}</div>
            </BaseCard>
          )}

          {/* Hire Requests List */}
          {filteredRequests.length === 0 ? (
            <BaseCard className="text-center py-12">
              <div className="text-text-secondary">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">لا توجد طلبات توظيف</p>
                <p className="text-sm">
                  {filter === 'all' 
                    ? 'لم تتلق أي طلبات توظيف مباشر بعد'
                    : `لا توجد طلبات ${filter === 'pending' ? 'في الانتظار' : filter === 'accepted' ? 'مقبولة' : filter === 'rejected' ? 'مرفوضة' : 'مكتملة'}`
                  }
                </p>
              </div>
            </BaseCard>
          ) : (
            <div className="space-y-6">
              {filteredRequests.map((request) => (
                <BaseCard key={request._id} className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Seeker Info */}
                    <div className="flex items-center gap-4 lg:w-1/4">
                      <img
                        src={request.seeker.avatarUrl || '/default-avatar.png'}
                        alt={getSeekerName(request.seeker)}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                      <div>
                        <h3 className="font-semibold text-deep-teal">
                          {getSeekerName(request.seeker)}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          {request.seeker.isVerified && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          <span>{request.seeker.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Request Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-text-primary mb-2">
                            {request.title}
                          </h4>
                          <p className="text-text-secondary text-sm line-clamp-2">
                            {request.description}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span>
                            {request.budget.min.toLocaleString()} - {request.budget.max.toLocaleString()} جنيه
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-600" />
                          <span>{request.location.government}, {request.location.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span>{formatDateTime(request.preferredDateTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span>{request.deliveryTimeDays} أيام</span>
                        </div>
                      </div>

                      {/* Tags */}
                      {request.tags.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {request.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="bg-soft-teal/20 text-deep-teal px-2 py-1 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Images Preview */}
                      {request.images.length > 0 && (
                        <div className="mt-3">
                          <div className="flex gap-2 overflow-x-auto">
                            {request.images.slice(0, 3).map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`صورة ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              />
                            ))}
                            {request.images.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
                                +{request.images.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(request._id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        عرض التفاصيل
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContactSeeker(request.seeker._id)}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        التواصل
                      </Button>

                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleStatusUpdate(request._id, 'accepted')}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            قبول
                          </Button>
                          <Button
                            variant="error"
                            size="sm"
                            onClick={() => handleStatusUpdate(request._id, 'rejected')}
                            className="flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            رفض
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-text-secondary">
                    تم إرسال الطلب في {formatDate(request.createdAt)}
                  </div>
                </BaseCard>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderHireRequestsPage; 