import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/layout/PageLayout';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import ReviewModal from '../components/ui/ReviewModal';
import { createReview } from '../services/reviewService';
import { CheckCircle, ArrowLeft, Home, Star } from 'lucide-react';

interface PaymentDetails {
  sessionId: string;
  amount: string;
  serviceTitle: string;
  providerName: string;
  providerId: string;
  jobRequestId: string;
  conversationId: string;
  completedAt: string;
  status: string; // Added status field
}

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('معرف الجلسة غير موجود');
      setLoading(false);
      return;
    }

    const fetchPaymentDetails = async () => {
      try {
        const response = await fetch(`/api/payment/details/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('فشل في جلب تفاصيل الدفع');
        }

        const data = await response.json();
        if (data.success) {
          setPaymentDetails(data.data);
        } else {
          setError(data.message || 'فشل في جلب تفاصيل الدفع');
        }
      } catch (error) {
        console.error('Error fetching payment details:', error);
        setError('حدث خطأ أثناء جلب تفاصيل الدفع');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchPaymentDetails();
    } else {
      setError('غير مصرح لك بعرض تفاصيل الدفع');
      setLoading(false);
    }
  }, [sessionId, accessToken]);

  const breadcrumbItems = [
    { label: 'الرئيسية', href: '/' },
    { label: 'نجح الدفع', active: true }
  ];

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!paymentDetails || !accessToken) return;

    setReviewLoading(true);
    try {
      const response = await createReview({
        reviewedUser: paymentDetails.providerId,
        role: 'provider',
        rating,
        comment,
        jobRequest: paymentDetails.jobRequestId
      }, accessToken);

      if (response.success) {
        alert('تم إرسال التقييم بنجاح!');
        setShowReviewModal(false);
      } else {
        alert(response.message || 'فشل في إرسال التقييم');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('حدث خطأ أثناء إرسال التقييم');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="جاري التحقق من الدفع..."
        user={user}
        onLogout={() => {}}
      >
        <div className="max-w-2xl mx-auto">
          <BaseCard className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">جاري التحقق من تفاصيل الدفع...</p>
          </BaseCard>
        </div>
      </PageLayout>
    );
  }

  if (error || !paymentDetails) {
    return (
      <PageLayout
        title="خطأ في الدفع"
        user={user}
        onLogout={() => {}}
      >
        <div className="max-w-2xl mx-auto">
          <BaseCard className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">حدث خطأ</h2>
            <p className="text-text-secondary mb-6">{error || 'فشل في تحميل تفاصيل الدفع'}</p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 ml-2" />
                العودة للرئيسية
              </Button>
            </div>
          </BaseCard>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="تم الدفع بنجاح"
      user={user}
      onLogout={() => {}}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-2xl mx-auto">
        <BaseCard className="text-center py-12">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            تم الدفع بنجاح!
          </h1>
          <p className="text-text-secondary mb-8">
            شكراً لك على استخدام منصة نافع. تم إتمام عملية الدفع بنجاح.
          </p>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-right">
            <h3 className="font-semibold text-text-primary mb-4">تفاصيل الدفع</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">معرف الجلسة:</span>
                <span className="font-mono text-text-primary">{paymentDetails.sessionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">المبلغ:</span>
                <span className="font-semibold text-text-primary">{paymentDetails.amount} جنيه مصري</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">الخدمة:</span>
                <span className="text-text-primary">{paymentDetails.serviceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">مقدم الخدمة:</span>
                <span className="text-text-primary">{paymentDetails.providerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">تاريخ الإتمام:</span>
                <span className="text-text-primary">
                  {new Date(paymentDetails.completedAt).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-right">
            <h4 className="font-semibold text-blue-800 mb-2">معلومات مهمة:</h4>
            <ul className="text-sm text-blue-700 space-y-1 text-right">
              <li>• تم إرسال إيصال الدفع إلى بريدك الإلكتروني</li>
              <li>• يمكنك تتبع حالة الخدمة من صفحة المحادثات</li>
              <li>• في حالة وجود أي مشكلة، يمكنك التواصل مع الدعم الفني</li>
            </ul>
          </div>

          {/* Review Section */}
          {paymentDetails.status === 'completed' ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Star className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">تقييم مقدم الخدمة</h4>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                ساعد مقدمي الخدمات الآخرين بكتابة تقييمك عن الخدمة المقدمة
              </p>
              <Button
                variant="outline"
                onClick={() => setShowReviewModal(true)}
                className="w-full"
              >
                <Star className="w-4 h-4 ml-2" />
                كتابة تقييم
              </Button>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-blue-800 text-sm text-center">
              يمكنك تقييم مقدم الخدمة بعد اكتمال الخدمة وتأكيدك لذلك.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(`/chat/${paymentDetails.conversationId}?from_payment=success`)}
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للمحادثة
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </div>
        </BaseCard>
      </div>

      {/* Review Modal */}
      {paymentDetails && paymentDetails.status === 'completed' && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          providerName={paymentDetails.providerName}
          serviceTitle={paymentDetails.serviceTitle}
          loading={reviewLoading}
        />
      )}
    </PageLayout>
  );
};

export default PaymentSuccessPage; 