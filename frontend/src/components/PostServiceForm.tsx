import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Button from './ui/Button';
import BaseCard from './ui/BaseCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FormInput, FormTextarea, AIAssistant, PricingGuidance } from './ui';
import UnifiedSelect from './ui/UnifiedSelect';
import { Sparkles } from 'lucide-react';
import { EGYPT_GOVERNORATES, EGYPT_CITIES } from '../utils/constants';
import { TimePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import arEG from 'antd/locale/ar_EG';

interface PostServiceFormData {
  serviceTitle: string;
  category: string;
  serviceDescription: string;
  minBudget: string;
  maxBudget: string;
  government: string;
  city: string;
  tags: string;
  workingDays?: string[];
  startTime?: string;
  endTime?: string;
}

interface AddressFields {
  government: string;
  city: string;
  street: string;
  apartmentNumber: string;
  additionalInformation: string;
}

const PostServiceForm: React.FC = () => {
  const { accessToken, user } = useAuth();
  const [formData, setFormData] = useState<PostServiceFormData>({
    serviceTitle: '',
    category: '',
    serviceDescription: '',
    minBudget: '',
    maxBudget: '',
    government: '',
    city: '',
    tags: '',
    workingDays: [],
    startTime: '',
    endTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [providerSkills, setProviderSkills] = useState<string[]>([]);
  const [profileAddress, setProfileAddress] = useState<AddressFields | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');

  // Update city list when governorate changes
  const cityOptions = selectedGovernorate
    ? [...(EGYPT_CITIES[selectedGovernorate] || []), 'أخرى']
    : [];

  useEffect(() => {
    setCategoriesLoading(true);
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data.categories)) {
          setCategories(data.data.categories.map((cat: { name: string }) => cat.name));
        } else {
          setCategoriesError('فشل تحميل الفئات');
        }
      })
      .catch(() => setCategoriesError('فشل تحميل الفئات'))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Fetch provider skills on mount
  useEffect(() => {
    fetch('/api/users/me/skills', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setProviderSkills(data.data.skills || []);
      });
  }, [accessToken]);

  useEffect(() => {
    fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.user?.profile?.location) {
          setProfileAddress(data.data.user.profile.location);
        }
      });
  }, [accessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAISuggestion = (field: string, value: string) => {
    if (field === 'title') {
      setFormData(prev => ({ ...prev, serviceTitle: value }));
    } else if (field === 'description') {
      setFormData(prev => ({ ...prev, serviceDescription: value }));
    } else if (field === 'keywords') {
      setFormData(prev => ({ ...prev, tags: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePricingApply = (min: number, max: number) => {
    setFormData(prev => ({ 
      ...prev, 
      minBudget: min.toString(),
      maxBudget: max.toString()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        title: formData.serviceTitle,
        description: formData.serviceDescription,
        category: formData.category,
        budget: {
          min: Number(formData.minBudget),
          max: Number(formData.maxBudget),
          currency: 'EGP',
        },
        location: {
          government: formData.government,
          city: formData.city,
        },
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        attachments: [],
        workingDays: formData.workingDays,
        startTime: formData.startTime,
        endTime: formData.endTime,
      };
      const res = await fetch('/api/listings/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to post service');
      }
      setSuccess(true);
      setTimeout(() => navigate('/search?category=' + encodeURIComponent(formData.category)), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5E6D3] flex flex-col font-cairo" dir="rtl">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* AI Form Section */}
          <div>
            <BaseCard className="p-6 md:sticky md:top-24">
              <h2 className="text-xl font-bold text-deep-teal mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#F5A623]" />
                أدوات الذكاء الاصطناعي
              </h2>
              <AIAssistant
                formType="service"
                category={formData.category}
                currentFields={formData as unknown as Record<string, unknown>}
                onSuggestionApply={handleAISuggestion}
                inputPlaceholder="مثال: أعلن عن خدمة تنظيف منازل باحترافية..."
                skills={providerSkills}
                className="mb-4"
                rating={user?.providerProfile?.rating}
              />
              <PricingGuidance
                formType="service"
                category={formData.category}
                location={formData.government}
                userBudget={formData.minBudget && formData.maxBudget ? {
                  min: Number(formData.minBudget),
                  max: Number(formData.maxBudget)
                } : null}
                onPricingApply={handlePricingApply}
                skills={providerSkills}
                rating={user?.providerProfile?.rating}
              />
            </BaseCard>
          </div>

          {/* Main Form Section */}
          <div>
          <BaseCard className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-200">
            <h1 className="text-3xl font-extrabold text-[#0e1b18] text-center mb-8">نشر خدمة</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="serviceTitle">عنوان الخدمة</label>
                  <FormInput
                    type="text"
                    id="serviceTitle"
                    name="serviceTitle"
                    value={formData.serviceTitle}
                    onChange={handleChange}
                    placeholder="عنوان الخدمة"
                    required
                    size="md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="category">الفئة</label>
                  <UnifiedSelect
                    value={formData.category}
                    onChange={val => setFormData(prev => ({ ...prev, category: val }))}
                    options={categories.map((cat: string) => ({ value: cat, label: cat }))}
                    placeholder="اختر الفئة"
                    required
                    disabled={categoriesLoading}
                    size="md"
                  />
                  {categoriesError && <div className="text-red-600 text-sm text-right bg-red-50 p-2 rounded-lg border border-red-200 mt-2">{categoriesError}</div>}
                </div>
              </div>
                {/* Service Description Field */}
              <div>
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="serviceDescription">وصف الخدمة</label>
                <FormTextarea
                  id="serviceDescription"
                  name="serviceDescription"
                  value={formData.serviceDescription}
                  onChange={handleChange}
                    placeholder="اكتب وصفاً مفصلاً للخدمة التي تقدمها..."
                    required
                    size="md"
                  />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2">المحافظة</label>
                    <UnifiedSelect
                      value={selectedGovernorate}
                      onChange={val => {
                        setSelectedGovernorate(val);
                        setSelectedCity('');
                        setCustomCity('');
                        setFormData(prev => ({ ...prev, government: EGYPT_GOVERNORATES.find(g => g.id === val)?.name || '' }));
                      }}
                      options={EGYPT_GOVERNORATES.map(g => ({ value: g.id, label: g.name }))}
                      placeholder="اختر المحافظة"
                      isSearchable
                      searchPlaceholder="ابحث عن محافظة..."
                      required
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2">المدينة</label>
                    <UnifiedSelect
                      value={selectedCity}
                      onChange={val => {
                        setSelectedCity(val);
                        setCustomCity('');
                        setFormData(prev => ({ ...prev, city: val === 'أخرى' ? '' : val }));
                      }}
                      options={cityOptions.map(city => ({ value: city, label: city }))}
                      placeholder="اختر المدينة"
                      isSearchable
                      searchPlaceholder="ابحث عن مدينة..."
                      required
                      size="md"
                      disabled={!selectedGovernorate}
                    />
                    {selectedCity === 'أخرى' && (
                      <FormInput
                        type="text"
                        value={customCity}
                        onChange={e => {
                          setCustomCity(e.target.value);
                          setFormData(prev => ({ ...prev, city: e.target.value }));
                        }}
                        placeholder="أدخل اسم المدينة"
                        size="md"
                        className="mt-2"
                        required
                      />
                    )}
                  </div>
                </div>
                {profileAddress && (
                  <div className="mb-4 flex items-center gap-4">
                    <button
                      type="button"
                      className="bg-bright-orange text-white font-semibold py-2 px-6 rounded-xl hover:bg-bright-orange/90 transition-all duration-300 shadow"
                      onClick={() => {
                        const govId = EGYPT_GOVERNORATES.find(g => g.name === profileAddress.government)?.id || '';
                        setSelectedGovernorate(govId);
                        setSelectedCity(profileAddress.city || '');
                        setCustomCity(profileAddress.city && !EGYPT_CITIES[govId]?.includes(profileAddress.city) ? profileAddress.city : '');
                        setFormData(prev => ({
                          ...prev,
                          government: profileAddress.government || '',
                          city: profileAddress.city || ''
                        }));
                      }}
                    >
                      استخدم العنوان المحفوظ
                    </button>
                  </div>
                )}
                {/* Budget Fields - move above availability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="minBudget">يبدأ من (جنيه)</label>
                    <FormInput
                      type="number"
                      id="minBudget"
                      name="minBudget"
                      value={formData.minBudget}
                      onChange={handleChange}
                      placeholder="مثال: 100"
                      min="0"
                      required
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="maxBudget">إلى (جنيه)</label>
                    <FormInput
                      type="number"
                      id="maxBudget"
                      name="maxBudget"
                      value={formData.maxBudget}
                      onChange={handleChange}
                      placeholder="مثال: 500"
                      min="0"
                      required
                      size="md"
                    />
                  </div>
                </div>
                {/* Availability Section (مواعيد التوفر (أيام وساعات العمل)) */}
                <div>
                  <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2">مواعيد التوفر (أيام وساعات العمل)</label>
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Working Days Checkboxes - horizontal row */}
                    <div className="flex flex-row flex-wrap gap-2 md:gap-3">
                      {[
                        { value: 'saturday', label: 'السبت' },
                        { value: 'sunday', label: 'الأحد' },
                        { value: 'monday', label: 'الاثنين' },
                        { value: 'tuesday', label: 'الثلاثاء' },
                        { value: 'wednesday', label: 'الأربعاء' },
                        { value: 'thursday', label: 'الخميس' },
                        { value: 'friday', label: 'الجمعة' }
                      ].map(day => (
                        <label
                          key={day.value}
                          className={
                            `flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors cursor-pointer select-none
                            ${formData.workingDays?.includes(day.value)
                              ? 'bg-deep-teal/90 border-deep-teal text-white'
                              : 'bg-white border-gray-300 text-deep-teal hover:bg-deep-teal/10'}
                            text-base font-semibold`
                          }
                          style={{ minWidth: '90px' }}
                        >
                          <input
                            type="checkbox"
                            className="w-5 h-5 accent-[#2D5D4F] border-2 border-gray-400 rounded focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            style={{ accentColor: formData.workingDays?.includes(day.value) ? '#fff' : '#2D5D4F' }}
                            checked={formData.workingDays?.includes(day.value) || false}
                            onChange={e => {
                              setFormData(prev => ({
                                ...prev,
                                workingDays: e.target.checked
                                  ? [...(prev.workingDays || []), day.value]
                                  : (prev.workingDays || []).filter(d => d !== day.value)
                              }));
                            }}
                          />
                          <span className="ml-1">{day.label}</span>
                        </label>
                      ))}
                    </div>
                    {/* Time Pickers - inline with checkboxes */}
                    <div className="flex gap-2 items-center">
                      <div className="w-full">
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
                            value={formData.startTime && formData.endTime ? [dayjs(formData.startTime, 'HH:mm'), dayjs(formData.endTime, 'HH:mm')] : null}
                            onChange={(val) => {
                              setFormData(prev => ({
                                ...prev,
                                startTime: val && val[0] ? val[0].format('HH:mm') : '',
                                endTime: val && val[1] ? val[1].format('HH:mm') : '',
                              }));
                            }}
                            disabled={false}
                            size="large"
                            className="bg-white border-2 border-gray-300 rounded-lg py-2 pr-3 pl-3 focus:ring-2 focus:ring-accent focus:border-accent text-right text-black custom-timepicker-contrast"
                            placeholder={["من", "إلى"]}
                            minuteStep={5}
                            allowClear
                            classNames={{ popup: { root: 'rtl' } }}
                            style={{ direction: 'rtl' }}
                          />
                        </ConfigProvider>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="tags">الوسوم (افصل بينها بفاصلة)</label>
                  <FormInput
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="مثال: تنظيف, سباكة, كهرباء"
                    size="md"
                  />
              </div>
              {error && <div className="text-red-600 text-sm text-right bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
              {success && <div className="text-green-600 text-sm text-right bg-green-50 p-3 rounded-lg border border-green-200">تم إرسال الطلب بنجاح!</div>}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="rounded-xl"
              >
                إرسال الطلب
              </Button>
            </form>
          </BaseCard>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PostServiceForm; 