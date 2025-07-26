import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/ui/BackButton';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import RatingDisplay from '../components/ui/RatingDisplay';
import PremiumBadge from '../components/ui/PremiumBadge';
import TopRatedBadge from '../components/ui/TopRatedBadge';
import {
  Star,
  MapPin,
  Calendar,
  CheckCircle,
  Briefcase,
  Clock,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { fetchWithAuth, translateCategory } from '../utils/helpers';

interface Provider {
  _id: string;
  name: { first: string; last: string } | string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  profile?: {
    bio?: string;
    location?: {
      address?: string;
      government?: string;
      city?: string;
    };
  };
  isVerified: boolean;
  isPremium: boolean;
  isTopRated?: boolean;
  skills?: string[];
  portfolio?: string[];
  createdAt: string;
  roles: string[];
  lastSeen?: string;
  workingDays?: string[];
  startTime?: string;
  endTime?: string;
  providerProfile?: {
    skills?: string[];
    workingDays?: string[];
    startTime?: string;
    endTime?: string;
  };
  lastLoginAt?: string;
}

interface Stats {
  totalJobsCompleted: number;
  averageRating: number;
  totalReviews: number;
  responseTime: string;
  completionRate: number;
}

interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: { amount: number; currency: string };
  location?: { address: string };
  rating?: number;
  isActive: boolean;
  budget?: { min: number; max: number; currency: string };
}

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  service?: { title: string };
  anonymous?: boolean;
}

const ProviderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'reviews' | 'portfolio' | 'about'>('services');

  useEffect(() => {
    const fetchProviderData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const token = accessToken || localStorage.getItem('accessToken') || '';
        
        // Fetch provider profile
        const providerRes = await fetchWithAuth(`/api/users/${id}`, token);
        setProvider(providerRes.data.user);
        
        // Fetch provider stats
        const statsRes = await fetchWithAuth(`/api/users/${id}/stats`, token);
        setStats(statsRes.data.stats);
        
        // Fetch provider services/listings
        const servicesRes = await fetchWithAuth(`/api/users/${id}/listings`, token);
        setServices(servicesRes.data.listings || []);
        
        // Fetch provider reviews
        const reviewsRes = await fetchWithAuth(`/api/users/${id}/reviews`, token);
        setReviews(reviewsRes.data.reviews || []);
        
      } catch (err) {
        console.error('Error fetching provider data:', err);
        if (err instanceof Error && err.message.includes('404')) {
          setError('مقدم الخدمة غير موجود أو تم حذف حسابه');
        } else {
          setError('فشل في تحميل بيانات مقدم الخدمة. يرجى المحاولة مرة أخرى.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [id, accessToken]);

  const getProviderName = (provider: Provider): string => {
    if (typeof provider.name === 'string') return provider.name;
    return `${provider.name?.first || ''} ${provider.name?.last || ''}`.trim() || 'مقدم خدمة';
  };

  const handleContactProvider = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Navigate to chat or contact form
    navigate(`/chat/new?userId=${id}`);
  };

  const handleHireProvider = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Navigate to hire provider form
    navigate(`/hire-provider/${id}`);
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

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-warm-cream">
        <Header />
        <div className="pt-20 container mx-auto px-4 py-8">
          <BackButton to="/search/providers" className="mb-4" />
          <BaseCard className="text-center p-8">
            <h2 className="text-xl font-bold text-red-600 mb-2">خطأ</h2>
            <p className="text-text-secondary mb-4">{error || 'لم يتم العثور على مقدم الخدمة'}</p>
            <Button onClick={() => navigate('/search/providers')}>العودة للبحث</Button>
          </BaseCard>
        </div>
        <Footer />
      </div>
    );
  }

  const tabsData = [
    { key: 'services', label: 'الخدمات', count: services.length },
    { key: 'reviews', label: 'التقييمات', count: reviews.length },
    { key: 'portfolio', label: 'المعرض', count: provider.portfolio?.length || 0 },
    { key: 'about', label: 'حول', count: null }
  ];

  return (
    <div className="min-h-screen bg-warm-cream">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <BackButton to="/search/providers" className="mb-6" />
          
          {/* Provider Header */}
          <BaseCard className="mb-8 relative overflow-hidden">
            {provider.isPremium && (
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-orange-400/5 pointer-events-none"></div>
            )}
            
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Avatar and Basic Info */}
                <div className="flex flex-col items-center lg:items-start">
                  <div className="relative mb-4">
                    <img
                      src={provider.avatarUrl || '/default-avatar.png'}
                      alt={getProviderName(provider)}
                      className={`w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover border-4 ${
                        provider.isPremium ? 'border-yellow-300' : 'border-gray-200'
                      }`}
                    />
                    {provider.isPremium && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <PremiumBadge size="md" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                    {provider.isTopRated && <TopRatedBadge size="md" />}
                    {provider.isVerified && (
                      <Badge variant="status" size="md" className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        موثق
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Provider Details */}
                <div className="flex-1">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-deep-teal mb-2">
                        {getProviderName(provider)}
                      </h1>
                      {provider.profile?.bio && (
                        <p className="text-text-secondary mb-3">{provider.profile.bio}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-4">
                        {/* Location (governorate, city) */}
                        {(provider.profile?.location?.government || provider.profile?.location?.city) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{[
                              provider.profile.location.government,
                              provider.profile.location.city
                            ].filter(Boolean).join('، ')}</span>
                          </div>
                        )}
                        {/* Member since */}
                        {provider.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>عضو منذ: {new Date(provider.createdAt).toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</span>
                          </div>
                        )}
                        {/* Last seen (if available) */}
                        {provider.lastLoginAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>آخر تواجد: {new Date(provider.lastLoginAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        )}
                        {/* Response time */}
                        {stats?.responseTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>يرد خلال {stats.responseTime}</span>
                          </div>
                        )}
                      </div>
                      {/* Skills */}
                      {provider.providerProfile?.skills && provider.providerProfile.skills.length > 0 && (
                        <div className="mb-2">
                          <h3 className="font-semibold text-text-primary mb-1">المهارات:</h3>
                          <div className="flex flex-wrap gap-2">
                            {provider.providerProfile.skills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-soft-teal/20 text-deep-teal px-3 py-1 rounded-full text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Availability */}
                      {provider.providerProfile?.workingDays && provider.providerProfile.workingDays.length > 0 && (
                        <div className="mb-2 text-base text-[#50958A] font-bold">
                          <span>مواعيد التوفر: </span>
                          {provider.providerProfile.workingDays.map((day: string, idx: number) => (
                            <span key={day}>{idx > 0 ? '، ' : ''}{
                              {
                                sunday: 'الأحد',
                                monday: 'الاثنين',
                                tuesday: 'الثلاثاء',
                                wednesday: 'الأربعاء',
                                thursday: 'الخميس',
                                friday: 'الجمعة',
                                saturday: 'السبت'
                              }[day] || day
                            }</span>
                          ))}
                          {provider.providerProfile.startTime && provider.providerProfile.endTime && (
                            <span> (
                              {(() => {
                                const formatTimeArabic12hr = (time: string) => {
                                  if (!time) return '';
                                  const [h, m] = time.split(':').map(Number);
                                  if (isNaN(h) || isNaN(m)) return time;
                                  const hour12 = ((h % 12) || 12);
                                  const ampm = h < 12 ? 'ص' : 'م';
                                  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
                                };
                                return `${formatTimeArabic12hr(provider.providerProfile.startTime)} - ${formatTimeArabic12hr(provider.providerProfile.endTime)}`;
                              })()}
                            )</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 lg:ml-6">
                      <Button
                        variant="primary"
                        onClick={handleHireProvider}
                        className="flex items-center gap-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        توظيف مباشر
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleContactProvider}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        تواصل معي
                      </Button>
                    </div>
                  </div>

                  {/* Skills */}
                  {provider.providerProfile?.skills && provider.providerProfile.skills.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-text-primary mb-2">المهارات:</h3>
                      <div className="flex flex-wrap gap-2">
                        {provider.providerProfile.skills.slice(0, 8).map((skill, index) => (
                          <span
                            key={index}
                            className="bg-soft-teal/20 text-deep-teal px-3 py-1 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                        {provider.providerProfile.skills.length > 8 && (
                          <span className="bg-gray-100 text-text-secondary px-3 py-1 rounded-full text-sm">
                            +{provider.providerProfile.skills.length - 8} أخرى
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </BaseCard>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-1 bg-white rounded-lg p-1 border border-gray-200">
              {tabsData.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'services' | 'reviews' | 'portfolio' | 'about')}
                  className={`px-4 py-2 rounded-md transition-all text-sm font-medium flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-deep-teal text-white shadow-sm'
                      : 'text-text-secondary hover:text-deep-teal hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-text-secondary'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'services' && (
            <div>
              <h2 className="text-xl font-bold text-deep-teal mb-6">الخدمات المقدمة ({services.length})</h2>
              {services.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {services.map((service) => (
                    <BaseCard key={service._id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-deep-teal flex-1">{service.title}</h3>
                        <span className="text-sm bg-soft-teal/20 text-deep-teal px-2 py-1 rounded-full whitespace-nowrap ml-2">
                          {translateCategory(service.category)}
                        </span>
                      </div>
                      <p className="text-text-secondary text-sm mb-3 line-clamp-2">{service.description}</p>
                      <div className="flex flex-wrap gap-2 text-sm text-[#50958A] mb-2">
                        {/* Budget */}
                        {service.budget && <span className="bg-gray-50 px-2 py-1 rounded">الميزانية: يبدأ من {service.budget.min} جنيه إلى {service.budget.max} جنيه</span>}
                        {/* Address */}
                        {provider.profile?.location && (provider.profile.location.government || provider.profile.location.city) && (
                          <span className="bg-gray-50 px-2 py-1 rounded">
                            العنوان: {[provider.profile.location.government, provider.profile.location.city].filter(Boolean).join('، ') || 'غير محدد'}
                          </span>
                        )}
                        {/* Member since */}
                        {provider.createdAt && (
                          <span className="bg-gray-50 px-2 py-1 rounded">
                            عضو منذ: {new Date(provider.createdAt).toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}
                          </span>
                        )}
                        {/* Skills */}
                        {provider.providerProfile?.skills && provider.providerProfile.skills.length > 0 && (
                          <span className="bg-gray-50 px-2 py-1 rounded">
                            المهارات: {provider.providerProfile.skills.slice(0, 3).join('، ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-bright-orange">
                          {service.budget ? `${service.budget.min} - ${service.budget.max}` : 'غير محدد'} {service.budget?.currency === 'EGP' ? 'جنيه' : service.budget?.currency || ''}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/service/${service._id}`)}>
                          عرض التفاصيل
                        </Button>
                      </div>
                    </BaseCard>
                  ))}
                </div>
              ) : (
                <BaseCard className="text-center p-8">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-text-secondary">لا توجد خدمات متاحة حالياً</p>
                </BaseCard>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-xl font-bold text-deep-teal mb-6">التقييمات والمراجعات ({reviews.length})</h2>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <BaseCard key={review._id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <RatingDisplay rating={review.rating} />
                        <span className="text-sm text-text-secondary">
                          {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      {review.service?.title && (
                        <p className="text-sm text-deep-teal mb-2">خدمة: {review.service.title}</p>
                      )}
                      <p className="text-text-primary">{review.comment}</p>
                    </BaseCard>
                  ))}
                </div>
              ) : (
                <BaseCard className="text-center p-8">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-text-secondary">لا توجد تقييمات بعد</p>
                </BaseCard>
              )}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <h2 className="text-xl font-bold text-deep-teal mb-6">معرض الأعمال ({provider.portfolio?.length || 0})</h2>
              {provider.portfolio && provider.portfolio.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {provider.portfolio.map((imageUrl, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden shadow-md">
                      <img
                        src={imageUrl}
                        alt={`عمل ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <BaseCard className="text-center p-8">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-text-secondary">لا توجد أعمال في المعرض</p>
                </BaseCard>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <BaseCard className="p-6">
                <h3 className="text-lg font-bold text-deep-teal mb-4">معلومات شخصية</h3>
                <div className="space-y-3 text-sm">
                  {provider.profile?.bio && (
                    <div>
                      <span className="font-semibold text-text-primary">النبذة الشخصية:</span>
                      <p className="text-text-secondary mt-1">{provider.profile.bio}</p>
                    </div>
                  )}
                  {provider.profile?.location && (
                    <div>
                      <span className="font-semibold text-text-primary">الموقع:</span>
                      <p className="text-text-secondary mt-1">
                        {[
                          provider.profile.location.city,
                          provider.profile.location.government
                        ].filter(Boolean).join('، ')}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-text-primary">تاريخ الانضمام:</span>
                    <p className="text-text-secondary mt-1">
                      {new Date(provider.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </BaseCard>

              {stats && (
                <BaseCard className="p-6">
                  <h3 className="text-lg font-bold text-deep-teal mb-4">إحصائيات الأداء</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-soft-teal/10 to-deep-teal/5 rounded-lg">
                      <div className="text-2xl font-bold text-deep-teal">{stats?.totalJobsCompleted || 0}</div>
                      <div className="text-sm text-text-secondary">مهمة مكتملة</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{(stats?.averageRating || 0).toFixed(1)}</div>
                      <div className="text-sm text-text-secondary">متوسط التقييم</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{(stats?.completionRate || 0).toFixed(0)}%</div>
                      <div className="text-sm text-text-secondary">معدل الإنجاز</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats?.totalReviews || 0}</div>
                      <div className="text-sm text-text-secondary">عدد التقييمات</div>
                    </div>
                  </div>
                </BaseCard>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderDetailsPage; 