import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOfferContext } from '../contexts/OfferContext';
import { X, Star, Shield, Calendar, Clock } from 'lucide-react';
import Button from './ui/Button';
import BaseCard from './ui/BaseCard';
import Badge from './ui/Badge';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FormInput, FormTextarea, BudgetIndicator, NegotiationToggle, BudgetExplanationTextarea, ScheduleModal } from "./ui";
import UnifiedSelect from "./ui/UnifiedSelect";
import Header from './Header';
import Footer from './Footer';

interface FormData {
  price: string;
  timeline: string;
  duration: string;
  message: string;
  availableDates: Date[];
  timePreferences: string[];
  agreedToTerms: boolean;
  negotiationAcknowledged: boolean;
  budgetExplanation: string;
}

interface ProviderData {
  name: { first: string; last: string };
  avatarUrl: string;
  providerProfile: {
    rating: number;
    reviewCount: number;
    verification: {
      status: string;
    };
  };
}

interface Offer {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  price: number;
  specialties: string[];
  verified?: boolean;
  message?: string;
  estimatedTimeDays?: number;
  availableDates?: string[];
  timePreferences?: string[];
  createdAt?: string;
}

const ServiceResponseForm: React.FC = () => {
  const { id: jobRequestId } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const { addNewOffer } = useOfferContext();
  
  const [formData, setFormData] = useState<FormData>({
    price: '',
    timeline: '',
    duration: '',
    message: '',
    availableDates: [],
    timePreferences: [],
    agreedToTerms: false,
    negotiationAcknowledged: false,
    budgetExplanation: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [jobRequest, setJobRequest] = useState<{ title?: string; description?: string; category?: string; budget?: { min: number; max: number }; deadline?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job request details
        const jobRes = await fetch(`/api/requests/${jobRequestId}`);
        const jobData = await jobRes.json();
        if (!jobData.success) throw new Error('Failed to fetch job request');
        setJobRequest(jobData.data.jobRequest as { title?: string; description?: string; category?: string; budget?: { min: number; max: number }; deadline?: string });

        // Fetch current user's provider data
        if (accessToken) {
          const userRes = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
                  const userData = await userRes.json();
        if (userData.success) {
          setProviderData(userData.data.user as ProviderData);
        }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (jobRequestId) fetchData();
  }, [jobRequestId, accessToken]);

  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    
    setFormData(prev => {
      const dateString = date.toDateString();
      const isAlreadySelected = prev.availableDates.some(
        selectedDate => selectedDate.toDateString() === dateString
      );
      
      if (isAlreadySelected) {
        // Remove the date if already selected
        return {
          ...prev,
          availableDates: prev.availableDates.filter(
            selectedDate => selectedDate.toDateString() !== dateString
          )
        };
      } else {
        // Add the new date
        return {
          ...prev,
          availableDates: [...prev.availableDates, date].sort((a, b) => a.getTime() - b.getTime())
        };
      }
    });
  };

  const handleTimePreferenceChange = (preference: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      timePreferences: checked
        ? [...prev.timePreferences, preference]
        : prev.timePreferences.filter(p => p !== preference)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Budget validation
    const priceValue = Number(formData.price);
    const minBudget = jobRequest?.budget?.min || 0;
    const maxBudget = jobRequest?.budget?.max || 0;
    
    // Calculate thresholds for edge cases
    const tooLowThreshold = minBudget * 0.5; // 50% of min budget
    const tooHighThreshold = maxBudget * 2; // 200% of max budget
    
    const isOverBudget = priceValue > maxBudget;
    const isTooLow = priceValue < tooLowThreshold;
    const isTooHigh = priceValue > tooHighThreshold;
    
    if ((isOverBudget || isTooLow || isTooHigh) && !formData.negotiationAcknowledged) {
      if (isTooLow) {
        setError('يجب عليك الموافقة على المتابعة بهذا السعر المنخفض جداً');
      } else if (isTooHigh) {
        setError('يجب عليك الموافقة على المتابعة بهذا السعر المرتفع جداً');
      } else {
        setError('يجب عليك الموافقة على أن سعرك يتطلب تفاوض للمتابعة');
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const offerData = {
        budget: {
          min: Number(formData.price),
          max: Number(formData.price),
          currency: 'EGP'
        },
        message: formData.message,
        estimatedTimeDays: Number(formData.duration) || 1,
        availableDates: formData.availableDates.map(date => date.toISOString()),
        timePreferences: formData.timePreferences,
        budgetExplanation: formData.budgetExplanation || undefined
      };

      const res = await fetch(`/api/requests/${jobRequestId}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(offerData)
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to submit offer');

      // Create new offer object for the details page
      const newOffer: Offer = {
        id: data.data._id || `temp-${Date.now()}`,
        name: providerData ? `${providerData.name.first} ${providerData.name.last}` : 'مستخدم',
        avatar: providerData?.avatarUrl || '',
        rating: providerData?.providerProfile?.rating || 0,
        price: parseFloat(formData.price),
        specialties: [], // TODO: Get from provider profile
        verified: providerData?.providerProfile?.verification?.status === 'verified',
        message: formData.message,
        estimatedTimeDays: parseInt(formData.duration) || 1,
        availableDates: formData.availableDates.map(date => date.toISOString()),
        timePreferences: formData.timePreferences,
        createdAt: new Date().toISOString(),
      };

      // Add the new offer to the context
      addNewOffer(newOffer);

      // Navigate back to job request details
      navigate(`/requests/${jobRequestId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: string) => {
    return price ? `${price} جنيه` : '0 جنيه';
  };

  const getTimelineDisplay = () => {
    switch (formData.timeline) {
      case 'today': return 'اليوم';
      case 'tomorrow': return 'غداً';
      case 'this-week': return 'هذا الأسبوع';
      case 'next-week': return 'الأسبوع القادم';
      case 'flexible': return 'مرن';
      default: return 'غير محدد';
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  if (!user || !user.roles.includes('provider')) {
    return (
      <div className="min-h-screen flex flex-col bg-warm-cream">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-deep-teal text-lg text-center">
            يجب أن تكون مقدم خدمات لتقديم عرض على هذا الطلب.<br />
            <Button variant="primary" className="mt-4" onClick={() => navigate('/upgrade')}>ترقية حسابك</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-warm-cream">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Service Request Details Card */}
          {jobRequest && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-deep-teal/10">
              <h2 className="text-xl font-bold text-deep-teal mb-4 pb-2 border-b border-gray-200">
                تفاصيل طلب الخدمة
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-deep-teal mb-2">{jobRequest.title}</h3>
                  <p className="text-text-secondary text-sm mb-4">{jobRequest.description}</p>
                  {jobRequest.category && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-deep-teal">الفئة: </span>
                      <span className="text-sm bg-soft-teal/20 text-deep-teal px-2 py-1 rounded-full">
                        {jobRequest.category}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    {jobRequest.budget && (
                      <div>
                        <div className="text-lg font-bold text-bright-orange">
                          {jobRequest.budget.min} - {jobRequest.budget.max} جنيه
                        </div>
                        <div className="text-xs text-text-secondary">الميزانية المتوقعة</div>
                      </div>
                    )}
                    {jobRequest.deadline && (
                      <div>
                        <div className="text-sm font-bold text-blue-600">
                          {new Date(jobRequest.deadline).toLocaleDateString('ar-EG')}
                        </div>
                        <div className="text-xs text-text-secondary">الموعد النهائي</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Response Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 border border-deep-teal/10">
            <header className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-deep-teal mb-1">
                  تقديم عرضك
                </h1>
                <p className="text-sm text-text-secondary">
                  قدم عرضك المناسب لهذا الطلب
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/requests/${jobRequestId}`)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Your Offer Section */}
              <div>
                <h2 className="text-lg font-semibold text-deep-teal mb-4 pb-2 border-b border-gray-200">
                  عرضك
                </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="price" className="text-sm font-medium text-text-primary mb-2 block">
                    سعرك
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                      جنيه
                    </span>
                    <FormInput
                      id="price"
                      type="number"
                      placeholder="أدخل سعرك"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pr-12 pl-3 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deep-teal focus:border-deep-teal bg-white text-text-primary placeholder-gray-500"
                      required
                    />
                  </div>
                  
                  {/* Budget Helper Components */}
                  {jobRequest?.budget && (
                    <>
                      <BudgetIndicator
                        price={formData.price}
                        minBudget={jobRequest.budget.min}
                        maxBudget={jobRequest.budget.max}
                      />
                      <NegotiationToggle
                        isChecked={formData.negotiationAcknowledged}
                        onChange={(checked) => setFormData(prev => ({ ...prev, negotiationAcknowledged: checked }))}
                        price={formData.price}
                        maxBudget={jobRequest.budget.max}
                        minBudget={jobRequest.budget.min}
                      />
                      <BudgetExplanationTextarea
                        value={formData.budgetExplanation}
                        onChange={(value) => setFormData(prev => ({ ...prev, budgetExplanation: value }))}
                        price={formData.price}
                        maxBudget={jobRequest.budget.max}
                        isNegotiationAcknowledged={formData.negotiationAcknowledged}
                      />
                    </>
                  )}
                </div>
                
                <div>
                  <label htmlFor="timeline" className="text-sm font-medium text-text-primary mb-2 block">
                    متى يمكنك البدء؟
                  </label>
                  <UnifiedSelect
                    value={formData.timeline} 
                    onChange={val => setFormData(prev => ({ ...prev, timeline: val }))}
                    options={[
                      { value: '', label: 'اختر التوقيت' },
                      { value: 'today', label: 'اليوم' },
                      { value: 'tomorrow', label: 'غداً' },
                      { value: 'this-week', label: 'هذا الأسبوع' },
                      { value: 'next-week', label: 'الأسبوع القادم' },
                      { value: 'flexible', label: 'مرن' },
                    ]}
                    required
                    className="w-full"
                    aria-label="اختر التوقيت"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label htmlFor="duration" className="text-sm font-medium text-text-primary mb-2 block">
                  المدة المتوقعة (أيام)
                </label>
                <FormInput
                  id="duration"
                  type="number"
                  placeholder="مثال: 2 يوم"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deep-teal focus:border-deep-teal bg-white text-text-primary placeholder-gray-500"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Availability Section */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-deep-teal flex items-center">
                  <Calendar className="h-5 w-5 ml-2" />
                  التواريخ المتاحة
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  فحص الجدول
                </Button>
              </div>
              
              <div className="mb-6">
                <label className="text-sm font-medium text-text-primary mb-3 block">
                  اختر التواريخ المتاحة لك
                </label>
                <p className="text-xs text-text-secondary mb-3">
                  انقر على التواريخ لتحديدها أو إلغاء تحديدها
                </p>
                <div className="relative">
                  <DatePicker
                    selected={null}
                    onChange={handleDateChange}
                    inline
                    minDate={new Date()}
                    maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
                    dateFormat="dd/MM/yyyy"
                    placeholderText="اختر التواريخ المتاحة"
                    className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-deep-teal focus:border-deep-teal"
                    dayClassName={(date) => {
                      const isSelected = formData.availableDates.some(
                        selectedDate => selectedDate.toDateString() === date.toDateString()
                      );
                      return isSelected ? '!bg-deep-teal !text-white !font-semibold rounded' : '';
                    }}
                  />
                </div>
                {formData.availableDates.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-text-secondary">التواريخ المختارة ({formData.availableDates.length} يوم):</p>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, availableDates: [] }))}
                        className="text-xs text-red-500 hover:text-red-700 underline"
                      >
                        مسح الكل
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.availableDates.slice(0, 8).map((date, index) => (
                        <Badge key={index} variant="category">
                          {date.toLocaleDateString('ar-EG', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Badge>
                      ))}
                      {formData.availableDates.length > 8 && (
                        <Badge variant="category">
                          +{formData.availableDates.length - 8} أكثر
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary mb-3 block flex items-center">
                  <Clock className="h-4 w-4 ml-2" />
                  تفضيلات الوقت
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'morning', label: 'صباحاً (8 ص - 12 م)' },
                    { value: 'afternoon', label: 'ظهراً (12 م - 4 م)' },
                    { value: 'evening', label: 'مساءً (4 م - 8 م)' },
                    { value: 'flexible', label: 'مرن (أي وقت)' }
                  ].map((timeSlot) => (
                    <label key={timeSlot.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.timePreferences.includes(timeSlot.value)}
                        onChange={(e) => handleTimePreferenceChange(timeSlot.value, e.target.checked)}
                        className="rounded border-gray-300 text-deep-teal focus:ring-deep-teal"
                      />
                      <span className="text-sm text-text-primary">{timeSlot.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Message Section */}
            <div>
              <h2 className="text-lg font-semibold text-deep-teal mb-4 pb-2 border-b border-gray-200">
                رسالتك
              </h2>
              <div>
                <label htmlFor="message" className="text-sm font-medium text-text-primary mb-2 block">
                  رسالة شخصية{' '}
                  <span className="text-text-secondary font-normal">(اختياري)</span>
                </label>
                <FormTextarea
                  id="message"
                  placeholder="أخبرهم لماذا أنت الشخص المناسب لهذا العمل..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  maxLength={300}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-deep-teal focus:border-deep-teal resize-none bg-white text-text-primary placeholder-gray-500"
                />
                <p className="mt-1 text-xs text-text-secondary text-left">
                  {formData.message.length} / 300 حرف
                </p>
              </div>
            </div>

            {/* Submit Section */}
            <div className="pt-6 border-t border-gray-200">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !formData.agreedToTerms}
                className="w-full h-14"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال ردك'}
              </Button>
              
              <div className="mt-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.agreedToTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
                    className="rounded border-gray-300 text-deep-teal focus:ring-deep-teal"
                  />
                  <label htmlFor="terms" className="text-sm text-text-primary">
                    يمكنني إكمال هذه الخدمة كما هو موضح
                  </label>
                </div>
              </div>
            </div>
          </form>
          </div>

          {/* Live Preview Section */}
          <BaseCard className="mt-8 bg-[#FDF8F0] p-8">
          <h2 className="text-lg font-semibold text-deep-teal mb-6">معاينة مباشرة</h2>
          
          <BaseCard className="bg-white shadow-lg">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <img
                  src={providerData?.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face&auto=format"}
                  alt="صورة المزود"
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div className="mr-4">
                  <h3 className="font-bold text-text-primary">
                    {providerData ? `${providerData.name.first} ${providerData.name.last}` : 'اسمك'}
                  </h3>
                  <div className="flex items-center mt-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-text-secondary mr-1">
                      {providerData?.providerProfile?.rating || 0} ({providerData?.providerProfile?.reviewCount || 0} تقييم)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-text-secondary">السعر</p>
                  <p className="text-2xl font-bold text-deep-teal">
                    {formatPrice(formData.price)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-text-secondary">تاريخ البدء</p>
                  <p className="text-text-primary">{getTimelineDisplay()}</p>
                </div>

                {formData.availableDates.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-text-secondary">التواريخ المتاحة ({formData.availableDates.length} يوم)</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.availableDates.slice(0, 5).map((date, index) => (
                        <Badge key={index} variant="category" className="text-xs">
                          {date.toLocaleDateString('ar-EG', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Badge>
                      ))}
                      {formData.availableDates.length > 5 && (
                        <Badge variant="category" className="text-xs">
                          +{formData.availableDates.length - 5} أكثر
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {formData.timePreferences.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-text-secondary">تفضيلات الوقت</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                                             {formData.timePreferences.map((pref, index) => (
                         <Badge key={index} variant="category" className="text-xs">
                           {pref === 'morning' ? 'صباحاً' : 
                            pref === 'afternoon' ? 'ظهراً' : 
                            pref === 'evening' ? 'مساءً' : 'مرن'}
                         </Badge>
                       ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-semibold text-text-secondary">مقتطف من الرسالة</p>
                  <p className="text-text-primary text-sm italic line-clamp-3">
                    {formData.message || "أخبرهم لماذا أنت الشخص المناسب لهذا العمل..."}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-text-secondary mb-2">
                    المهارات والتحقق
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {providerData?.providerProfile?.verification?.status === 'verified' && (
                      <Badge variant="top-rated">
                        <Shield className="h-3 w-3 ml-1" />
                        موثق
                      </Badge>
                    )}
                    <Badge variant="category">التصوير</Badge>
                    <Badge variant="category">التحرير</Badge>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>

          {/* Tips Section */}
          <BaseCard className="mt-6 bg-light-cream border-r-4 border-deep-teal">
            <div className="p-4">
              <p className="font-bold text-deep-teal mb-2">نصيحة لرد أفضل</p>
              <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                <li>أضف رسالة شخصية</li>
                <li>اذكر خبرتك في هذا المجال</li>
                <li>ارفع أمثلة من أعمالك</li>
                <li>حدد تواريخ متاحة واضحة</li>
              </ul>
            </div>
          </BaseCard>
          </BaseCard>
        </div>
      </main>
      
      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        providerId={user?.id}
      />
      
      <Footer />
    </div>
  );
};

export default ServiceResponseForm; 