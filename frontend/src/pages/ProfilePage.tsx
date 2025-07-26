import React, { useEffect, useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Badge from '../components/ui/Badge';
import { CheckCircle, CreditCard, FileText, Camera, Upload, Trash2 } from 'lucide-react';
import UnifiedSelect from '../components/ui/UnifiedSelect';
import { TimePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import arEG from 'antd/locale/ar_EG';
import { Pencil } from 'lucide-react';

const fetchWithAuth = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error?.message || 'فشل تحميل البيانات');
  return res.json();
};

const TABS = [
  { key: 'offered', label: 'الخدمات' },
  { key: 'requested', label: 'الخدمات المطلوبة' },
  { key: 'reviews', label: 'التقييمات والمراجعات' },
  { key: 'portfolio', label: 'الأعمال/المعرض' },
];

const PROVIDER_TABS = [
  { key: 'offered', label: 'الخدمات' },
  { key: 'hire-requests', label: 'طلبات التوظيف' },
  { key: 'reviews', label: 'التقييمات والمراجعات' },
  { key: 'portfolio', label: 'الأعمال/المعرض' },
];

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
];

// Minimal types for strict linter compliance
interface Service {
  id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  price?: number;
  category?: string;
  budget?: { min: number; max: number }; // Added budget to Service interface
  workingDays?: string[]; // Added workingDays to Service interface
  startTime?: string; // Added startTime to Service interface
  endTime?: string; // Added endTime to Service interface
}
interface Review {
  id: string;
  reviewerName?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
  role?: string; // Added role to Review interface
  serviceTitle?: string; // Added serviceTitle to Review interface
}
// Update Profile type to match DB schema
interface Profile {
  _id: string;
  email: string;
  name: { first: string; last: string };
  phone?: string;
  avatarUrl?: string | null;
  roles: string[];
  seekerProfile?: {
    totalJobsPosted: number;
    rating: number;
    reviewCount: number;
    totalSpent: number;
  };
  providerProfile?: {
    rating: number;
    reviewCount: number;
    totalJobsCompleted: number;
    totalEarnings: number;
    verification: { status: string; method: string | null; documents: string[] };
    skills?: string[]; // Added skills to the interface
    location?: { city: string; government: string }; // Added location to the interface
    workingDays?: string[]; // Added workingDays to the interface
    startTime?: string; // Added startTime to the interface
    endTime?: string; // Added endTime to the interface
  };
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  bio?: string; // Added bio to the interface
  profile?: { // Added profile to the interface
    bio?: string;
    location?: {
      city?: string;
      government?: string;
      street?: string;
      apartmentNumber?: string;
      additionalInformation?: string;
    };
  };
  isVerified: boolean;
  providerUpgradeStatus?: 'pending' | 'rejected' | 'accepted' | 'none';
  verification?: {
    status?: string;
    explanation?: string;
    attempts?: number;
    idFrontUrl?: string;
    idBackUrl?: string;
    selfieUrl?: string;
    criminalRecordUrl?: string;
    criminalRecordIssuedAt?: string;
    submittedAt?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    auditTrail?: Array<{
      action: string;
      by?: string;
      at?: string;
      explanation?: string;
    }>;
  };
}
interface Stats {
  rating?: number;
  reviewCount?: number;
  jobsCount?: number;
  averageRating?: number;
  totalReviews?: number;
  totalJobsCompleted?: number;
  completionRate?: number;
  responseTime?: string;
  // Add more fields as needed
}

const ProfilePage: React.FC = () => {
  const { user: authUser, accessToken } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isSelf = !id || (authUser && (id === authUser?.id));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [requestedServices, setRequestedServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('offered');
  const [offeredStatus, setOfferedStatus] = useState('');
  const [requestedStatus, setRequestedStatus] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [skillsSuccess, setSkillsSuccess] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [portfolioSuccess, setPortfolioSuccess] = useState<string | null>(null);
  // Add state for toggling skills edit modal/section
  const [editingSkills, setEditingSkills] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [availabilityDays, setAvailabilityDays] = useState<string[]>(profile?.providerProfile?.workingDays || []);
  const [availabilityTime, setAvailabilityTime] = useState<[string, string] | null>(
    profile?.providerProfile?.startTime && profile?.providerProfile?.endTime
      ? [profile.providerProfile.startTime, profile.providerProfile.endTime]
      : null
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySuccess, setAvailabilitySuccess] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');

  // Store fetchAll in a ref to avoid using 'any' on window
  const fetchAllRef = React.useRef<() => void>();
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = accessToken || localStorage.getItem('accessToken') || '';
        // Determine userId to use
        const userId = id || authUser?.id;
        if (!userId) {
          setError('تعذر تحديد المستخدم');
          setLoading(false);
          return;
        }
        const profileUrl = isSelf ? '/api/users/me' : `/api/users/${userId}`;
        const profileRes = await fetchWithAuth(profileUrl, token);
        setProfile(profileRes.data.user);
        const statsRes = await fetchWithAuth(`/api/users/${userId}/stats`, token);
        setStats(statsRes.data.stats);
        const realProfileId = profileRes.data.user._id;
        if (profileRes.data.user.roles?.includes('provider')) {
          try {
            const listingsUrl = isSelf ? '/api/listings/users/me/listings' : `/api/users/${realProfileId}/listings`;
            const servicesRes = await fetchWithAuth(listingsUrl, token);
            // Map _id to id for each listing
            setServices((servicesRes.data.listings || []).map((s: Service) => ({ ...s, id: (s as unknown as { _id: string })._id })));
          } catch (error) {
            console.warn('Could not fetch provider listings:', error);
            setServices([]);
          }
        } else {
          setServices([]);
        }
        if (profileRes.data.user.roles?.includes('seeker')) {
          try {
            // Use the correct endpoint for fetching user's own requests
            const requestsUrl = isSelf ? '/api/users/me/requests' : `/api/requests?seeker=${realProfileId}`;
            const reqRes = await fetchWithAuth(requestsUrl, token);
            // Map _id to id for each jobRequest
            setRequestedServices((reqRes.data.jobRequests || []).map((r: Service) => ({ ...r, id: (r as unknown as { _id: string })._id })));
          } catch (error) {
            console.warn('Could not fetch seeker requests:', error);
            setRequestedServices([]);
          }
        } else {
          setRequestedServices([]);
        }
        const reviewsRes = await fetchWithAuth(`/api/reviews/user/${userId}`, token);
        setReviews(reviewsRes.data.reviews || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
        } else {
          setError('حدث خطأ أثناء تحميل البيانات');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAllRef.current = fetchAll;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken, authUser]);

  // Fetch provider skills if provider
  useEffect(() => {
    if (profile && profile.roles.includes('provider') && isSelf && accessToken) {
      setSkillsLoading(true);
      fetch('/api/users/me/skills', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) setSkills(data.data.skills || []);
          else setSkillsError('فشل تحميل المهارات');
        })
        .catch(() => setSkillsError('فشل تحميل المهارات'))
        .finally(() => setSkillsLoading(false));
    }
  }, [profile, isSelf, accessToken]);

  // Fetch portfolio images (simulate API for now)
  useEffect(() => {
    if (!profile) return;
    setPortfolioLoading(true);
    setPortfolioError(null);
    // TODO: Replace with real API call
    fetch(`/api/users/${profile._id}/portfolio`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setPortfolioImages(data.data.images || []);
        else setPortfolioError('فشل تحميل الأعمال');
      })
      .catch(() => setPortfolioError('فشل تحميل الأعمال'))
      .finally(() => setPortfolioLoading(false));
  }, [profile]);

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };
  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };
  const handleSaveSkills = async () => {
    setSkillsLoading(true);
    setSkillsError(null);
    setSkillsSuccess(null);
    try {
      const res = await fetch('/api/users/me/skills', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ skills })
      });
      const data = await res.json();
      if (data.success) {
        setSkillsSuccess('تم حفظ المهارات بنجاح');
      } else {
        setSkillsError(data.error?.message || 'فشل حفظ المهارات');
      }
    } catch {
      setSkillsError('فشل حفظ المهارات');
    } finally {
      setSkillsLoading(false);
      setTimeout(() => setSkillsSuccess(null), 2000);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      // Validate file size/type
      if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      if (!file.type.startsWith('image/')) throw new Error('يرجى اختيار ملف صورة صحيح');
      const formData = new FormData();
      formData.append('image', file);
      const imgbbApiKey = import.meta.env.VITE_IMGBB_API_KEY;
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        // Save to backend (always use /me/portfolio for current user)
        const saveRes = await fetch(`/api/users/me/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ imageUrl: data.data.url })
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          setPortfolioImages(prev => [data.data.url, ...prev]);
          setPortfolioSuccess('تم رفع الصورة بنجاح');
        } else {
          setPortfolioError('فشل حفظ الصورة');
        }
      } else {
        setPortfolioError('فشل رفع الصورة');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPortfolioError(err.message || 'حدث خطأ أثناء رفع الصورة');
      } else {
        setPortfolioError('حدث خطأ أثناء رفع الصورة');
      }
    } finally {
      setPortfolioLoading(false);
      setTimeout(() => setPortfolioSuccess(null), 2000);
    }
  };

  const handleRemovePortfolioImage = async (url: string) => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      // Always use /me/portfolio for current user
      const res = await fetch(`/api/users/me/portfolio`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ imageUrl: url })
      });
      const data = await res.json();
      if (data.success) {
        setPortfolioImages(prev => prev.filter(img => img !== url));
      } else {
        setPortfolioError('فشل حذف الصورة');
      }
    } catch {
      setPortfolioError('فشل حذف الصورة');
    } finally {
      setPortfolioLoading(false);
    }
  };

  // Helper: get full name
  const getFullName = (user: Profile | null) => {
    if (!user) return '';
    return `${user.name?.first || ''} ${user.name?.last || ''}`.trim();
  };

  // Helper: get roles
  const getRoles = (user: Profile | null) => {
    if (!user?.roles) return [];
    return user.roles;
  };

  // Helper: check if user is verified
  const isVerified = (user: Profile | null) => {
    if (!user) return false;
    return !!user.isVerified;
  };

  // Helper: get provider upgrade status
  const getProviderUpgradeStatus = (user: Profile | null) => {
    if (!user) return 'none';
    return user.providerUpgradeStatus || 'none';
  };

  // Helper for 12-hour Arabic time format
  function formatTimeArabic12hr(time: string) {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time;
    const hour12 = ((h % 12) || 12);
    const ampm = h < 12 ? 'ص' : 'م';
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  return (
    <PageLayout
      title="الملف الشخصي"
      subtitle="عرض معلومات المستخدم"
      breadcrumbItems={[
        { label: 'الرئيسية', href: '/' },
        { label: 'الملف الشخصي', active: true }
      ]}
      showHeader
      showFooter
      showBreadcrumb
      className="font-cairo"
    >
      <div dir="rtl" className="max-w-4xl mx-auto py-8">
        {loading ? (
          <div className="text-center text-deep-teal text-lg" aria-live="polite">جاري تحميل البيانات...</div>
        ) : error ? (
          <BaseCard className="max-w-md mx-auto text-center text-red-600 text-lg" aria-live="assertive">
            {error}
          </BaseCard>
        ) : profile && stats ? (
          <BaseCard className="mb-8 p-6 flex flex-col lg:flex-row gap-8 items-center lg:items-start bg-light-cream relative">
            {/* Upgrade badge - top left */}
            {profile?.roles.includes('provider') && getProviderUpgradeStatus(profile) === 'accepted' && (
              <span className="absolute top-4 left-4 z-20 bg-green-100 text-green-800 border border-green-300 px-4 py-1 rounded-lg font-bold text-base shadow">
                تمت الترقية
              </span>
            )}
            {/* Avatar + Upload */}
            <div className="relative shrink-0 flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-cover bg-center ring-4 ring-white/50" style={{ backgroundImage: `url(${profile.avatarUrl || ''})` }} />
              </div>
            </div>
            {/* Main Info */}
            <div className="flex-1 flex flex-col gap-2 items-center lg:items-start">
              <div className="flex flex-col gap-1 items-center lg:items-start">
                <h1 className="text-2xl font-bold text-deep-teal mb-2 flex items-center gap-2">
                  {getFullName(profile)}
                  {isVerified(profile) && (
                    <Badge variant="status" size="sm" className="inline-flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500 inline" />
                      <span>موثّق</span>
                    </Badge>
                  )}
                  {/* Verification Method Badges */}
                  {profile.verification?.idFrontUrl && profile.verification?.idBackUrl && (
                    <Badge variant="category" size="sm" icon={CreditCard} className="ml-1">بطاقة هوية</Badge>
                  )}
                  {profile.verification?.criminalRecordUrl && (
                    <Badge variant="premium" size="sm" icon={FileText} className="ml-1">فيش وتشبيه</Badge>
                  )}
                  {profile.verification?.selfieUrl && (
                    <Badge variant="status" size="sm" icon={Camera} className="ml-1">سيلفي</Badge>
                  )}
                </h1>
                {profile?.profile?.bio && (
                  <p className="text-text-secondary text-base text-center lg:text-right mt-2 mb-1 whitespace-pre-line">
                    {profile.profile.bio}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-1">
                  {getRoles(profile).map((role: string) => (
                    <span key={role} className="bg-soft-teal/20 text-deep-teal px-3 py-1 rounded-full text-sm font-semibold font-cairo border border-soft-teal/40">{role === 'provider' ? 'مقدم خدمة' : role === 'seeker' ? 'باحث عن خدمة' : role === 'admin' ? 'مشرف' : role}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-accent text-lg font-cairo">
                  <span className="font-bold">{stats?.averageRating?.toFixed(1) ?? '0.0'}</span>
                  <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <span className="text-sm text-text-secondary">({stats?.totalReviews ?? 0} تقييم)</span>
                </div>
              </div>
              {/* Location */}
              {profile?.profile?.location?.city && profile?.profile?.location?.government && (
                <div className="text-text-secondary text-sm flex items-center gap-2">
                  <span className="inline-block">{profile.profile.location.city}, {profile.profile.location.government}</span>
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                </div>
              )}
              {/* Verified Badge */}
              {profile?.isVerified && (
                <div className="flex items-center gap-1 text-green-600 text-sm font-semibold bg-green-50 px-2 py-1 rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  تم التحقق من الهوية
                </div>
              )}
              {/* Member Since */}
              {profile?.createdAt && (
                <div className="text-text-secondary text-sm">عضو منذ: {new Date(profile.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}</div>
              )}
              {/* Last Active */}
              {profile?.lastLoginAt && (
                <div className="text-text-secondary text-sm">آخر تواجد: {new Date(profile.lastLoginAt).toLocaleString('ar-EG')}</div>
              )}
              {/* Skills - Improved visibility */}
              {profile?.providerProfile && (
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                  {editingSkills ? (
                    <>
                      <div className="flex overflow-x-auto gap-2 mb-2 pb-1">
                        {skills.map(skill => (
                          <span key={skill} className="bg-[#F5A623]/10 text-[#F5A623] px-3 py-1 rounded-full text-sm font-cairo border border-[#F5A623]/30 flex items-center gap-1 whitespace-nowrap">
                            {skill}
                            <button type="button" className="ml-1 text-red-500 hover:text-red-700" onClick={() => handleRemoveSkill(skill)} title="حذف المهارة">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mb-2 w-full">
                        <FormInput
                          type="text"
                          value={newSkill}
                          onChange={e => setNewSkill(e.target.value)}
                          placeholder="أضف مهارة جديدة..."
                          className="flex-1 text-right"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                        />
                        <Button type="button" onClick={handleAddSkill} disabled={!newSkill.trim()} variant="secondary">إضافة</Button>
                      </div>
                      <div className="flex gap-2 mt-2 w-full">
                        <Button type="button" onClick={async () => { await handleSaveSkills(); setEditingSkills(false); if (fetchAllRef.current) fetchAllRef.current(); }} loading={skillsLoading} variant="primary">حفظ</Button>
                        <Button type="button" onClick={() => { setEditingSkills(false); setSkills(profile.providerProfile?.skills || []); setNewSkill(''); }} variant="outline">إلغاء</Button>
                      </div>
                      {skillsError && <div className="text-red-600 mt-2">{skillsError}</div>}
                      {skillsSuccess && <div className="text-green-600 mt-2">{skillsSuccess}</div>}
                    </>
                  ) : (
                    <>
                      {profile.providerProfile.skills && profile.providerProfile.skills.length > 0 ? (
                        <>
                  {profile.providerProfile.skills.slice(0, 5).map((skill: string) => (
                    <span key={skill} className="bg-[#F5A623]/20 text-[#F5A623] px-4 py-2 rounded-full text-sm font-semibold font-cairo border border-[#F5A623]/40">{skill}</span>
                  ))}
                  {profile.providerProfile.skills.length > 5 && (
                    <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold font-cairo border border-gray-300 cursor-pointer hover:bg-gray-300 transition-colors" title="عرض كل المهارات" onClick={() => setShowAllSkills(true)}>
                      +{profile.providerProfile.skills.length - 5}
                    </span>
                  )}
                  {isSelf && (
                            <button
                              className="text-accent hover:text-deep-teal transition p-1 rounded flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent ml-2"
                              style={{ minWidth: '70px' }}
                              onClick={() => { setEditingSkills(true); setSkills(profile.providerProfile?.skills || []); setNewSkill(''); }}
                              title="تعديل المهارات"
                            >
                              <Pencil className="w-4 h-4" /> <span>تعديل</span>
                    </button>
                          )}
                        </>
                      ) :
                        <>
                          <span className="text-[#F5A623] bg-[#F5A623]/10 px-4 py-2 rounded-full text-sm font-semibold font-cairo border border-[#F5A623]/30">
                            {isSelf
                              ? 'لا توجد مهارات مضافة بعد. أضف مهاراتك لزيادة فرصك في الحصول على أعمال!'
                              : 'لم يقم هذا المستخدم بإضافة مهارات بعد.'}
                          </span>
                          {isSelf && (
                            <button className="ml-2 text-sm text-accent underline hover:text-deep-teal transition font-medium flex items-center gap-1" onClick={() => { setEditingSkills(true); setSkills(profile.providerProfile?.skills || []); setNewSkill(''); }}>
                              <Pencil className="w-4 h-4" /> تعديل
                            </button>
                          )}
                        </>
                      }
                    </>
                  )}
                </div>
              )}
              {profile?.roles.includes('provider') && getProviderUpgradeStatus(profile) === 'pending' && (
                <Badge variant="status" size="sm" className="inline-flex items-center gap-1">
                  <span>قيد الترقية</span>
                </Badge>
              )}
              {profile?.roles.includes('provider') && getProviderUpgradeStatus(profile) === 'rejected' && (
                <Badge variant="urgency" size="sm" className="inline-flex items-center gap-1">
                  <span>تم رفض الترقية</span>
                </Badge>
              )}
              {/* Availability Section (for providers) */}
              {profile?.roles.includes('provider') && (
                <div className="mt-2 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-[#2D5D4F] text-base">مواعيد التوفر:</span>
                    {isSelf && !editingAvailability && (
                      <button
                        className="text-accent hover:text-deep-teal transition p-1 rounded flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                        onClick={() => {
                          setEditingAvailability(true);
                          setAvailabilityDays(profile?.providerProfile?.workingDays || []);
                          setAvailabilityTime(
                            profile?.providerProfile?.startTime && profile?.providerProfile?.endTime
                              ? [profile.providerProfile.startTime, profile.providerProfile.endTime]
                              : null
                          );
                        }}
                        title="تعديل مواعيد التوفر"
                      >
                        <Pencil className="w-4 h-4" /> <span>تعديل</span>
                      </button>
              )}
          </div>
                  {!editingAvailability ? (
                    <div className="text-base text-[#50958A] font-bold">
                      {profile?.providerProfile?.workingDays && profile.providerProfile.workingDays.length > 0 ? (
                        <>
                          {profile.providerProfile.workingDays.map((day: string, idx: number) => (
                            <span key={day}>{idx > 0 ? '، ' : ''}{
                              {
                                saturday: 'السبت',
                                sunday: 'الأحد',
                                monday: 'الاثنين',
                                tuesday: 'الثلاثاء',
                                wednesday: 'الأربعاء',
                                thursday: 'الخميس',
                                friday: 'الجمعة'
                              }[day] || day
                            }</span>
                          ))}
                          {profile.providerProfile.startTime && profile.providerProfile.endTime && (
                            <span> (
                              {formatTimeArabic12hr(profile.providerProfile.startTime)} - {formatTimeArabic12hr(profile.providerProfile.endTime)}
                            )</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#F5A623]">لم يتم تحديد مواعيد التوفر بعد</span>
                      )}
            </div>
                  ) : (
                    <form
                      className="flex flex-col gap-4 mt-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setAvailabilityLoading(true);
                        setAvailabilitySuccess('');
                        setAvailabilityError('');
                        try {
                          const res = await fetch('/api/users/me/availability', {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${accessToken}`
                            },
                            body: JSON.stringify({
                              workingDays: availabilityDays,
                              startTime: availabilityTime ? availabilityTime[0] : '',
                              endTime: availabilityTime ? availabilityTime[1] : ''
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setAvailabilitySuccess('تم تحديث مواعيد التوفر بنجاح');
                            setEditingAvailability(false);
                            // Refresh profile data after save
                            if (fetchAllRef.current) fetchAllRef.current();
                          } else {
                            setAvailabilityError(data.error?.message || 'حدث خطأ أثناء التحديث');
                          }
                        } catch {
                          setAvailabilityError('حدث خطأ أثناء التحديث');
                        } finally {
                          setAvailabilityLoading(false);
                        }
                      }}
                    >
                      {/* Day Selector (reuse from PostServiceForm) */}
                      <div className="flex flex-row flex-wrap gap-2 md:gap-3">
                        {[{ value: 'saturday', label: 'السبت' }, { value: 'sunday', label: 'الأحد' }, { value: 'monday', label: 'الاثنين' }, { value: 'tuesday', label: 'الثلاثاء' }, { value: 'wednesday', label: 'الأربعاء' }, { value: 'thursday', label: 'الخميس' }, { value: 'friday', label: 'الجمعة' }].map(day => (
                          <label
                            key={day.value}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors cursor-pointer select-none
                              ${availabilityDays.includes(day.value)
                                ? 'bg-deep-teal/90 border-deep-teal text-white'
                                : 'bg-white border-gray-300 text-deep-teal hover:bg-deep-teal/10'}
                              text-base font-semibold`}
                            style={{ minWidth: '90px' }}
                          >
                            <input
                              type="checkbox"
                              className="w-5 h-5 accent-[#2D5D4F] border-2 border-gray-400 rounded focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              style={{ accentColor: availabilityDays.includes(day.value) ? '#fff' : '#2D5D4F' }}
                              checked={availabilityDays.includes(day.value)}
                              onChange={e => {
                                setAvailabilityDays(prev =>
                                  e.target.checked
                                    ? [...prev, day.value]
                                    : prev.filter(d => d !== day.value)
                                );
                              }}
                            />
                            <span className="ml-1">{day.label}</span>
                          </label>
                  ))}
                </div>
                      {/* Time Range Picker (reuse from PostServiceForm) */}
                      <div className="w-full max-w-xs mt-2">
                        <ConfigProvider locale={arEG}>
                          <TimePicker.RangePicker
                            format={value => {
                              if (!value) return '';
                              const hour = value.hour();
                              const minute = value.minute().toString().padStart(2, '0');
                              const isAM = hour < 12;
                              let displayHour = hour % 12;
                              if (displayHour === 0) displayHour = 12;
                              return `${displayHour}:${minute} ${isAM ? 'ص' : 'م'}`;
                            }}
                            use12Hours
                            showSecond={false}
                            value={availabilityTime && availabilityTime.length === 2 ? [dayjs(availabilityTime[0], 'HH:mm'), dayjs(availabilityTime[1], 'HH:mm')] : null}
                            onChange={val => {
                              setAvailabilityTime(val && val.length === 2 && val[0] && val[1]
                                ? [val[0].format('HH:mm'), val[1].format('HH:mm')]
                                : null);
                            }}
                            allowClear
                            minuteStep={5}
                            size="large"
                            className="bg-white border-2 border-gray-300 rounded-lg py-2 pr-3 pl-3 focus:ring-2 focus:ring-accent focus:border-accent text-right text-black custom-timepicker-contrast"
                            classNames={{ popup: { root: 'rtl' } }}
                            style={{ direction: 'rtl' }}
                            placeholder={["من", "إلى"]}
                          />
                        </ConfigProvider>
                </div>
                      <div className="flex gap-2 mt-4">
                        <Button type="submit" variant="primary" loading={availabilityLoading} disabled={availabilityLoading}>
                          حفظ
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setEditingAvailability(false)} disabled={availabilityLoading}>
                          إلغاء
                        </Button>
                      </div>
                      {availabilitySuccess && <div className="text-green-600 mt-2">{availabilitySuccess}</div>}
                      {availabilityError && <div className="text-red-600 mt-2">{availabilityError}</div>}
                    </form>
            )}
                </div>
              )}
          </div>
          </BaseCard>
        ) : null}
        {showAllSkills && profile?.providerProfile?.skills && (
          <BaseCard className="mb-8 p-6 bg-white border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#2D5D4F]">كل المهارات</h2>
              <button className="text-sm text-red-500 hover:text-red-700" onClick={() => setShowAllSkills(false)}>إغلاق</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.providerProfile.skills.map((skill: string) => (
                <span key={skill} className="bg-[#F5A623]/10 text-[#F5A623] px-3 py-1 rounded-full text-sm font-cairo border border-[#F5A623]/30">{skill}</span>
              ))}
            </div>
          </BaseCard>
        )}
        <div className="w-full mt-8">
          <div className="flex gap-2 md:gap-4 border-b border-[#E5E7EB] mb-4 rtl flex-row-reverse" role="tablist">
            {(profile?.roles?.includes('provider') ? PROVIDER_TABS : TABS).map(tab => (
              <button
                    key={tab.key}
                className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none transition-colors duration-200 ${activeTab === tab.key ? 'bg-[#FDF8F0] text-[#2D5D4F] border-b-2 border-[#2D5D4F]' : 'text-[#50958A] bg-transparent'}`}
                onClick={() => setActiveTab(tab.key)}
                    role="tab"
                  >
                    {tab.label}
              </button>
                ))}
          </div>
          <div className="min-h-[200px]" id="profile-tabs-content">
            {/* الخدمات (offered services) */}
            {activeTab === 'offered' && (
              <div id="tab-panel-offered" role="tabpanel" aria-labelledby="offered">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
                  <label htmlFor="offered-status" className="text-[#0E1B18] font-medium">تصفية حسب الحالة:</label>
                  <UnifiedSelect
                    value={offeredStatus}
                    onChange={setOfferedStatus}
                    options={STATUS_FILTERS}
                    placeholder="تصفية حسب الحالة"
                    size="md"
                    className="w-48 max-w-xs"
                  />
                </div>
                {services && services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(services as Service[]).filter((s: Service) => !offeredStatus || s.status === offeredStatus).length > 0 ? (
                      (services as Service[]).filter((s: Service) => !offeredStatus || s.status === offeredStatus).map((service: Service, idx: number) => (
                        <BaseCard key={service.id || idx} className="flex flex-col gap-3 h-full">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-[#2D5D4F] flex-1 leading-tight">{service.title}</span>
                              <div className="flex flex-col gap-1 shrink-0">
                                <span className="text-sm text-[#50958A] bg-[#F5E6D3] rounded-full px-3 py-1 whitespace-nowrap text-center">{service.status ? STATUS_FILTERS.find(f => f.value === service.status)?.label : '—'}</span>
                                {service.category && <span className="text-sm text-[#50958A] bg-[#FDF8F0] rounded-full px-3 py-1 whitespace-nowrap text-center">{service.category}</span>}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-[#50958A]">
                              {service.createdAt && <span className="bg-gray-50 px-2 py-1 rounded">تاريخ الإضافة: {new Date(service.createdAt).toLocaleDateString('ar-EG')}</span>}
                              {service.budget && <span className="bg-gray-50 px-2 py-1 rounded">الميزانية: يبدأ من {service.budget.min} جنيه إلى {service.budget.max} جنيه</span>}
                              {/* Address */}
                              {profile?.providerProfile?.location && (profile.providerProfile.location.government || profile.providerProfile.location.city) && (
                                <span className="bg-gray-50 px-2 py-1 rounded">
                                  العنوان: {[profile.providerProfile.location.government, profile.providerProfile.location.city].filter(Boolean).join('، ') || 'غير محدد'}
                                </span>
                              )}
                              {/* Member since */}
                              {profile?.createdAt && (
                                <span className="bg-gray-50 px-2 py-1 rounded">
                                  عضو منذ: {new Date(profile.createdAt).toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}
                                </span>
                              )}
                              {/* Skills */}
                              {profile?.providerProfile?.skills && profile.providerProfile.skills.length > 0 && (
                                <span className="bg-gray-50 px-2 py-1 rounded">
                                  المهارات: {profile.providerProfile.skills.slice(0, 3).join('، ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-[#0E1B18] text-sm line-clamp-3 flex-1">{service.description}</div>
                          {service.workingDays && service.workingDays.length > 0 && (
                            <div className="text-xs text-[#50958A] mt-1">
                              <span>مواعيد التوفر: </span>
                              {service.workingDays.map((day: string, idx: number) => (
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
                              {service.startTime && service.endTime && (
                                <span> ({service.startTime} - {service.endTime})</span>
                              )}
                            </div>
                          )}
                          <div className="flex justify-end mt-auto pt-2">
                            <Button size="sm" variant="outline" onClick={() => window.location.href = `/services/${service.id}`}>عرض التفاصيل</Button>
                          </div>
                        </BaseCard>
                      ))
                    ) : (
                      <div className="text-[#50958A] text-center w-full py-8 flex flex-col items-center justify-center gap-2">
                        <svg className="w-8 h-8 mb-2 text-[#50958A]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
                        لا توجد خدمات بهذه الحالة.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[#50958A] text-center w-full py-8">لا توجد خدمات معروضة بعد.</div>
                )}
              </div>
            )}
            {/* الخدمات المطلوبة (requested services) */}
            {activeTab === 'requested' && (
              <div id="tab-panel-requested" role="tabpanel" aria-labelledby="requested">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
                  <label htmlFor="requested-status" className="text-[#0E1B18] font-medium">تصفية حسب الحالة:</label>
                  <UnifiedSelect
                    value={requestedStatus}
                    onChange={setRequestedStatus}
                    options={STATUS_FILTERS}
                    placeholder="تصفية حسب الحالة"
                    size="md"
                    className="w-48 max-w-xs"
                  />
                </div>
                {requestedServices && requestedServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(requestedServices as Service[]).filter((s: Service) => !requestedStatus || s.status === requestedStatus).length > 0 ? (
                      (requestedServices as Service[]).filter((s: Service) => !requestedStatus || s.status === requestedStatus).map((service: Service, idx: number) => (
                        <BaseCard key={service.id || idx} className="flex flex-col gap-3 h-full">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-[#2D5D4F] flex-1 leading-tight">{service.title}</span>
                              <span className="text-sm text-[#50958A] bg-[#F5E6D3] rounded-full px-3 py-1 whitespace-nowrap text-center shrink-0">{service.status ? STATUS_FILTERS.find(f => f.value === service.status)?.label : '—'}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-[#50958A]">
                              {service.budget && <span className="bg-gray-50 px-2 py-1 rounded">الميزانية: {service.budget.min} - {service.budget.max} جنيه</span>}
                              {service.createdAt && <span className="bg-gray-50 px-2 py-1 rounded">تاريخ الإضافة: {new Date(service.createdAt).toLocaleDateString('ar-EG')}</span>}
                            </div>
                          </div>
                          <div className="text-[#0E1B18] text-sm line-clamp-3 flex-1">{service.description}</div>
                          <div className="flex justify-end mt-auto pt-2">
                            <Button size="sm" variant="outline" onClick={() => window.location.href = `/requests/${service.id}`}>عرض التفاصيل</Button>
                          </div>
                        </BaseCard>
                      ))
                    ) : (
                      <div className="text-[#50958A] text-center w-full py-8">لا توجد خدمات مطلوبة بهذه الحالة.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[#50958A] text-center w-full py-8">لا توجد خدمات مطلوبة بعد.</div>
                )}
                </div>
            )}
            {/* التقييمات والمراجعات (reviews) */}
            {activeTab === 'reviews' && (
              <div id="tab-panel-reviews" role="tabpanel" aria-labelledby="reviews">
                {reviews && reviews.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {(reviews as Review[]).map((review: Review, idx: number) => (
                      <BaseCard key={review.id || idx} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {/* Only show reviewer name if not seeker (for privacy) */}
                          {review.role === 'provider' && review.reviewerName ? (
                            <span className="font-bold text-[#2D5D4F]">{review.reviewerName}</span>
                          ) : (
                            <span className="text-sm text-gray-600 italic">(اسم الباحث عن الخدمة مخفي للخصوصية)</span>
                          )}
                          <span className="text-sm text-[#50958A] bg-[#F5E6D3] rounded px-2 py-1">{review.rating} ★</span>
                        </div>
                        {/* Show service/job title if available */}
                        {review.serviceTitle && (
                          <div className="text-sm text-[#50958A]">الخدمة: {review.serviceTitle}</div>
                        )}
                        <div className="text-[#0E1B18] text-sm line-clamp-2">{review.comment}</div>
                        <div className="text-sm text-[#50958A]">{review.createdAt && new Date(review.createdAt).toLocaleDateString('ar-EG')}</div>
                      </BaseCard>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#50958A] text-center w-full py-8">لا توجد تقييمات أو مراجعات بعد.</div>
                )}
              </div>
            )}
            {/* طلبات التوظيف (hire requests) - for providers only */}
            {activeTab === 'hire-requests' && profile?.roles?.includes('provider') && (
              <div id="tab-panel-hire-requests" role="tabpanel" aria-labelledby="hire-requests">
                <div className="text-center py-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-deep-teal mb-2">طلبات التوظيف المباشر</h3>
                    <p className="text-text-secondary">إدارة طلبات التوظيف المباشر التي تلقيتها</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/provider/hire-requests')}
                    className="bg-deep-teal hover:bg-deep-teal/90"
                  >
                    عرض طلبات التوظيف
                  </Button>
                </div>
              </div>
            )}
            {/* الأعمال/المعرض (portfolio) */}
            {activeTab === 'portfolio' && (
              <div id="tab-panel-portfolio" role="tabpanel" aria-labelledby="portfolio">
                {portfolioLoading ? (
                  <div className="text-[#50958A] text-center w-full py-8">جاري تحميل الأعمال...</div>
                ) : portfolioError ? (
                  <div className="text-red-600 text-center w-full py-8">{portfolioError}</div>
                ) : (
                  <>
                    {isSelf && (
                      <div className="mb-4 flex flex-col sm:flex-row items-center gap-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer bg-deep-teal text-white px-4 py-2 rounded-lg shadow hover:bg-deep-teal/90 transition-colors">
                          <Upload className="w-5 h-5" />
                          إضافة صورة جديدة
                          <input type="file" accept="image/*" className="hidden" onChange={handlePortfolioUpload} disabled={portfolioLoading} />
                        </label>
                        {portfolioSuccess && <span className="text-green-600">{portfolioSuccess}</span>}
                      </div>
                    )}
                    {portfolioImages.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {portfolioImages.map((img, idx) => (
                          <div key={img} className="relative group">
                            <img src={img} alt={`عمل ${idx + 1}`} className="w-full h-48 object-cover rounded-lg shadow" />
                            {isSelf && (
                              <button
                                type="button"
                                className="absolute top-2 left-2 bg-white/80 rounded-full p-1 text-red-600 hover:bg-red-100 transition"
                                onClick={() => handleRemovePortfolioImage(img)}
                                title="حذف الصورة"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#50958A] text-center w-full py-8">لم يتم إضافة أعمال أو معرض بعد.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
    </PageLayout>
  );
};

export default ProfilePage; 