import React, { useState } from 'react';
import {
  Check,
  X,
  Crown,
  Shield,
  Award,
  CreditCard
} from 'lucide-react';
import PageLayout from './layout/PageLayout';
import Button from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../admin/components/UI/Modal';
import { useToast } from '../contexts/ToastContext';
import BaseCard from './ui/BaseCard';

// New pricing data for Nafee' platform
const planFeatures = [
  {
    premiumText: 'مطابقة ذكية للفرص',
    freeText: 'مطابقة يدوية للفرص',
  },
  {
    premiumText: 'الظهور في قسم المميزين في الصفحة الرئيسية وصفحة الفئات',
    freeText: 'الظهور في نتائج البحث بعد المميزين',
  },
  {
    premiumText: 'خصم رسوم المنصة 5%',
    freeText: 'رسوم المنصة 15%',
  },
  {
    premiumText: 'بطاقة تقديم مميزة',
    freeText: 'ملف شخصي أساسي',
  },
  {
    premiumText: 'أسبوع مجاني من الإعلان في أعلى نتائج البحث عند الاشتراك',
    freeText: 'إعلانات مدفوعة فقط (لا يوجد أسبوع مجاني)',
  },
];

const pricingPlans = [
  {
    name: 'الخطة المجانية',
    price: '0',
    currency: 'جنيه',
    period: 'شهرياً',
    description: 'ابدأ مجاناً واستفد من الأساسيات للباحثين ومقدمي الخدمات الجدد',
    features: planFeatures.map(f => f.freeText),
    buttonText: 'ابدأ مجاناً',
    buttonVariant: 'outline' as const,
    popular: false,
    planId: null
  },
  {
    name: 'الخطة المميزة',
    price: '49',
    currency: '$',
    period: 'شهرياً',
    description: 'احصل على مزايا متقدمة لتعزيز نشاطك',
    features: planFeatures.map(f => f.premiumText),
    buttonText: 'اشترك الآن',
    buttonVariant: 'primary' as const,
    popular: true,
    planId: 'price_1RohKaCjj2jIemB8nRmN9CwQ'
  }
];

const trustFeatures = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'مدعوم بالذكاء الاصطناعي',
    description: 'مطابقة ذكية بين مقدمي الخدمات والعملاء'
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'مؤمن بـ Stripe',
    description: 'مدفوعات آمنة ومشفرة لحماية أموالك'
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: 'مصمم للسوق المصري',
    description: 'منصة محلية تلبي احتياجات المجتمع المصري'
  }
];

// Comparison data
const comparisonData = [
  {
    feature: 'نشر طلبات الخدمة',
    free: { value: '3 شهرياً', included: true },
    premium: { value: 'غير محدود', included: true }
  },
  {
    feature: 'عرض الخدمات',
    free: { value: 'الملف الأساسي', included: true },
    premium: { value: 'الملف المميز', included: true }
  },
  {
    feature: 'المطابقة بالذكاء الاصطناعي',
    free: { value: 'غير متاح', included: false },
    premium: { value: 'مطابقة ذكية', included: true }
  },
  {
    feature: 'رفع المستندات',
    free: { value: 'اختياري', included: true },
    premium: { value: 'مطلوب + شارة المراجعة', included: true }
  },
  {
    feature: 'دعم العملاء',
    free: { value: 'دعم المجتمع', included: true },
    premium: { value: 'دعم ذو أولوية', included: true }
  },
  {
    feature: 'شارة التحقق',
    free: { value: 'غير متاح', included: false },
    premium: { value: 'شارة البائع الموثوق', included: true }
  },
  {
    feature: 'رسوم المنصة',
    free: { value: '15%', included: true },
    premium: { value: '5% (خصم)', included: true }
  },
  {
    feature: 'الظهور في النتائج',
    free: { value: 'عادي', included: true },
    premium: { value: 'أولوية', included: true }
  }
];

const Pricing: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<'summary' | 'result'>('summary');
  const [refundEstimate, setRefundEstimate] = useState<{ amount: number; type: string } | null>(null);
  const [cancelResult, setCancelResult] = useState<{ success: boolean; message: string; refund?: { amount: number; type: string } | null } | null>(null);
  const { showSuccess, showError } = useToast();

  const isPremium = !!user?.isPremium;
  const isProvider = user?.roles?.includes('provider');

  // Only show premium plan for providers
  const visiblePlans = pricingPlans.filter(plan => {
    if (plan.name === 'الخطة المميزة') {
      return isProvider;
    }
    return true;
  });

  const handleSubscribe = async (planName: string, planId: string | null) => {
    if (!planId) {
      showSuccess('تم تفعيل الخطة المجانية بنجاح!');
      return;
    }
    if (!accessToken) {
      showError('يرجى تسجيل الدخول أولاً');
      return;
    }
    setLoading(planId);
    try {
      const response = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planId: 'price_1RohKaCjj2jIemB8nRmN9CwQ',
          planName,
          successUrl: `${window.location.origin}/pricing?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });
      const data = await response.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error(data.error?.message || 'فشل في إنشاء جلسة الدفع');
      }
    } catch {
      showError('حدث خطأ أثناء إنشاء الاشتراك. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(null);
    }
  };

  // Fetch refund estimate when opening the modal
  const fetchRefundEstimate = async () => {
    setRefundEstimate(null);
    setCancelResult(null);
    setCancelStep('summary');
    setIsCancelModalOpen(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ estimate: true }),
      });
      const data = await response.json();
      if (data.success && data.refund) {
        setRefundEstimate({ amount: data.refund.amount, type: data.refund.type });
      } else {
        setRefundEstimate(null);
      }
    } catch {
      setRefundEstimate(null);
    }
  };

  // Confirm cancelation
  const handleCancelSubscription = async () => {
    setLoading('cancel');
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      setCancelResult({
        success: !!data.success,
        message: data.message || (data.error?.message || 'فشل إلغاء الاشتراك.'),
        refund: data.refund || null,
      });
      setCancelStep('result');
      if (data.success) {
        showSuccess(data.message);
        // Do not auto-reload; wait for user to close modal
      } else {
        showError(data.error?.message || 'فشل إلغاء الاشتراك.');
      }
    } catch {
      setCancelResult({ success: false, message: 'حدث خطأ أثناء محاولة إلغاء الاشتراك. يرجى المحاولة لاحقاً.' });
      setCancelStep('result');
      showError('حدث خطأ أثناء محاولة إلغاء الاشتراك. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(null);
    }
  };

  const handleCloseCompareModal = () => {
    setIsCompareModalOpen(false);
  };

  return (
    <PageLayout
      title="أسعار عادلة وشفافة - للجميع"
      subtitle="سواء كنت هنا للربح أو للحصول على المساعدة، خططنا مصممة لدعمك"
      breadcrumbItems={[
        { label: 'الرئيسية', href: '/' },
        { label: 'الأسعار', active: true }
      ]}
      showHeader
      showFooter
      showBreadcrumb
      className="font-cairo"
    >
      <div dir="rtl" className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-deep-teal/10 px-4 py-2 rounded-full mb-6">
            <Crown className="w-5 h-5 text-deep-teal" />
            <span className="text-sm font-semibold text-deep-teal">
              خطط الاشتراك
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-deep-teal mb-6">
            أسعار عادلة وشفافة
            <span className="block text-accent">للجميع</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
            سواء كنت هنا للربح أو للحصول على المساعدة، خططنا مصممة لدعمك
          </p>
          {!isProvider && (
            <div className="mt-6 text-lg text-red-600 font-semibold">
              الاشتراك المميز متاح فقط لمقدمي الخدمات (البائعين). إذا كنت ترغب في الاستفادة من المزايا المتقدمة، يرجى ترقية حسابك إلى مقدم خدمة.
            </div>
          )}
        </section>

        {/* Pricing Plans */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {visiblePlans.map((plan, index) => {
              // Button logic
              let buttonText = plan.buttonText;
              let buttonDisabled = false;
              let buttonVariant = plan.buttonVariant;
              if (plan.name === 'الخطة المجانية') {
                if (!isPremium) {
                  buttonText = 'أنت على الخطة المجانية';
                  buttonDisabled = true;
                  buttonVariant = 'outline';
                } else {
                  buttonText = 'أنت مشترك في الخطة المميزة';
                  buttonDisabled = true;
                  buttonVariant = 'outline';
                }
              } else if (plan.name === 'الخطة المميزة') {
                if (!isProvider) {
                  buttonText = 'متاح فقط لمقدمي الخدمات';
                  buttonDisabled = true;
                  buttonVariant = 'outline';
                } else if (isPremium) {
                  buttonText = 'أنت مشترك بالفعل';
                  buttonDisabled = true;
                  buttonVariant = 'primary';
                } else {
                  buttonText = plan.buttonText;
                  buttonDisabled = false;
                  buttonVariant = plan.buttonVariant;
                }
              }
              // Never show loading for free plan
              const showLoading = plan.name === 'الخطة المميزة' && loading === plan.planId;
              return (
                <div
                  key={index}
                  className={`relative bg-white rounded-2xl border-2 p-8 transition-all duration-200 shadow-lg hover:shadow-2xl focus-within:shadow-2xl ${
                    plan.popular 
                      ? 'border-accent' 
                      : 'border-deep-teal/40'
                  } min-h-[540px] flex flex-col justify-between`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="bg-accent text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md">
                        الأكثر شعبية
                      </div>
                    </div>
                  )}
                  <div className="flex-grow flex flex-col">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-deep-teal mb-2">
                        {plan.name}
                      </h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-deep-teal">
                          {plan.price}
                        </span>
                        <span className="text-lg text-text-secondary">
                          {plan.currency}/{plan.period}
                        </span>
                      </div>
                      <p className="text-text-primary font-medium">{plan.description}</p>
                    </div>
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => {
                        if (!feature) return null;
                        return (
                          <li key={featureIndex} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <span className="text-sm text-text-primary">{feature}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <Button
                      variant={buttonVariant}
                      size="lg"
                      className="w-full focus:ring-2 focus:ring-accent focus:ring-offset-2"
                      onClick={() => handleSubscribe(plan.name, plan.planId)}
                      disabled={buttonDisabled || showLoading}
                    >
                      {showLoading ? 'جاري التوجيه...' : buttonText}
                    </Button>
                    {/* Cancel subscription for premium users */}
                    {plan.name === 'الخطة المميزة' && isPremium && isProvider && (
                      <Button
                        variant="danger"
                        size="sm"
                        className="w-full mt-3 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        onClick={fetchRefundEstimate}
                        disabled={loading === 'cancel'}
                      >
                        إلغاء الاشتراك
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trust Section - Match AdvertisePage Steps Style */}
        <section className="bg-light-cream rounded-2xl p-8 mb-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-deep-teal mb-4">
              لماذا تثق بنا؟
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mt-12">
            {trustFeatures.map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">{idx + 1}</span>
                </div>
                <h3 className="text-xl font-semibold text-deep-teal mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Advertising Section - Match AdvertisePage Highlight Style */}
        <section className="bg-gradient-to-r from-deep-teal to-accent rounded-2xl p-12 text-white shadow-xl mb-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">
              هل تريد الترويج لخدماتك؟
            </h2>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              احصل على ظهور أفضل في نتائج البحث مع الإعلانات المميزة. 
              إعلاناتك ستظهر في أعلى الصفحات مع استهداف ذكي بالذكاء الاصطناعي.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="primary" 
                size="lg" 
                className="focus:ring-2 focus:ring-accent focus:ring-offset-2"
                onClick={() => window.location.href = '/advertise'}
              >
                اعرف المزيد عن الإعلانات
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="focus:ring-2 focus:ring-accent focus:ring-offset-2"
                onClick={() => window.location.href = '/advertise'}
              >
                ابدأ الإعلان الآن
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section - Unified with AdvertisePage Style */}
        <section className="bg-light-cream rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-deep-teal text-center mb-8">
            الأسئلة الشائعة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                question: 'هل يمكنني إلغاء الاشتراك في أي وقت؟',
                answer: 'نعم، يمكنك إلغاء اشتراكك في أي وقت من إعدادات الحساب أو عبر Stripe Customer Portal.'
              },
              {
                question: 'هل هناك فترة تجريبية مجانية؟',
                answer: 'نعم، يمكنك تجربة الخطة المميزة مجاناً لمدة 7 أيام.'
              },
              {
                question: 'كيف يتم الدفع؟',
                answer: 'نقبل جميع البطاقات الائتمانية والمدفوعات الإلكترونية عبر Stripe.'
              },
              {
                question: 'هل يمكنني الترقية أو التخفيض؟',
                answer: 'نعم، يمكنك تغيير خطتك في أي وقت من إعدادات الحساب أو عبر Stripe Customer Portal.'
              }
            ].map((faq, idx) => (
              <BaseCard key={idx} className="p-6">
                <h3 className="font-bold text-deep-teal mb-2 text-lg">{faq.question}</h3>
                <p className="text-text-primary text-sm">{faq.answer}</p>
              </BaseCard>
            ))}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isCompareModalOpen}
        onClose={handleCloseCompareModal}
        title="مقارنة بين الخطط"
        size="xl"
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-bold text-deep-teal mb-2">الميزة</h3>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-bold text-deep-teal mb-2">الخطة المجانية</h3>
              <p className="text-sm text-text-secondary">0 جنيه/شهر</p>
            </div>
            <div className="p-4 bg-accent/20 rounded-lg border-2 border-accent">
              <h3 className="text-lg font-bold text-deep-teal mb-2">الخطة المميزة</h3>
              <p className="text-sm text-accent font-semibold">49 جنيه/شهر</p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="space-y-4">
            {comparisonData.map((item, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 items-center p-4 border-b border-gray-200">
                <div className="font-semibold text-deep-teal text-right">
                  {item.feature}
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {item.free.included ? (
                      <Check className="w-5 h-5 text-green-600" aria-hidden="true" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    )}
                    <span className={`text-sm ${item.free.included ? 'text-text-primary' : 'text-gray-400'}`}>
                      {item.free.value}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {item.premium.included ? (
                      <Check className="w-5 h-5 text-green-600" aria-hidden="true" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    )}
                    <span className={`text-sm ${item.premium.included ? 'text-text-primary' : 'text-gray-400'}`}>
                      {item.premium.value}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-8 p-6 bg-gradient-to-r from-deep-teal/10 to-accent/10 rounded-lg text-center">
            <h4 className="text-lg font-bold text-deep-teal mb-3">
              جاهز للترقية؟
            </h4>
            <p className="text-text-primary mb-4">
              احصل على جميع المزايا المتقدمة وابدأ في تحقيق المزيد من النجاح
            </p>
            <Button
              variant="primary"
              size="lg"
              className="focus:ring-2 focus:ring-accent focus:ring-offset-2"
              onClick={() => {
                handleCloseCompareModal();
                handleSubscribe('الخطة المميزة', 'price_1RohKaCjj2jIemB8nRmN9CwQ');
              }}
            >
              اشترك الآن
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal isOpen={isCancelModalOpen} onClose={() => { setIsCancelModalOpen(false); setCancelStep('summary'); }} title="إلغاء الاشتراك">
        <div className="p-6 text-center">
          {cancelStep === 'summary' && (
            <>
              <h2 className="text-xl font-bold text-deep-teal mb-4">تأكيد إلغاء الاشتراك</h2>
              <div className="mb-4 text-text-primary">
                <p className="mb-2">عند إلغاء الاشتراك، ستفقد جميع مزايا الخطة المميزة فوراً.</p>
                <p className="mb-2">سيتم تطبيق سياسة الاسترداد التالية:</p>
                <ul className="mb-2 text-right mx-auto max-w-md text-sm list-disc pr-6">
                  <li>استرداد كامل خلال أول 3 أيام من الاشتراك ({refundEstimate?.amount === 49 ? '49 جنيه' : '49 جنيه'}).</li>
                  <li>استرداد جزئي حتى 7 أيام (يتم حسابه حسب الأيام المتبقية).</li>
                  <li>لا يوجد استرداد بعد 7 أيام من الاشتراك.</li>
                </ul>
                {refundEstimate && (
                  <div className="mt-2 text-green-700 font-semibold">
                    {refundEstimate.type === 'full' && `ستحصل على استرداد كامل (${refundEstimate.amount} جنيه).`}
                    {refundEstimate.type === 'partial' && `ستحصل على استرداد جزئي (${refundEstimate.amount} جنيه).`}
                    {refundEstimate.type === 'none' && 'لن تحصل على استرداد لأن فترة السماح انتهت.'}
                  </div>
                )}
                {!refundEstimate && <div className="mt-2 text-gray-500 text-sm">سيتم حساب مبلغ الاسترداد عند التأكيد.</div>}
              </div>
              <Button
                variant="danger"
                size="lg"
                className="w-full focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                onClick={handleCancelSubscription}
                disabled={loading === 'cancel'}
              >
                تأكيد إلغاء الاشتراك
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full mt-2 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancelStep('summary');
                  if (cancelResult?.success) {
                    window.location.reload();
                  }
                }}
              >
                إغلاق
              </Button>
            </>
          )}
          {cancelStep === 'result' && (
            <>
              <h2 className="text-xl font-bold text-deep-teal mb-4">نتيجة الإلغاء</h2>
              <div className="mb-4 text-text-primary">
                <p className="mb-2">{cancelResult?.message}</p>
                {cancelResult?.refund && (
                  <div className="mt-2 text-green-700 font-semibold">
                    {cancelResult.refund.type === 'full' && `تم استرداد كامل (${cancelResult.refund.amount} جنيه).`}
                    {cancelResult.refund.type === 'partial' && `تم استرداد جزئي (${cancelResult.refund.amount} جنيه).`}
                  </div>
                )}
                {cancelResult?.success && <div className="mt-2 text-green-600">تم تعطيل مزايا الخطة المميزة فوراً.</div>}
                {!cancelResult?.success && <div className="mt-2 text-red-600">فشل إلغاء الاشتراك. يرجى المحاولة لاحقاً.</div>}
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full mt-2 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancelStep('summary');
                  if (cancelResult?.success) {
                    window.location.reload();
                  }
                }}
              >
                إغلاق
              </Button>
            </>
          )}
        </div>
      </Modal>
    </PageLayout>
  );
};

export default Pricing; 