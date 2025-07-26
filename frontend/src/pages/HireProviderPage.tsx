import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/ui/BackButton';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import FormTextarea from '../components/ui/FormTextarea';
import UnifiedSelect from '../components/ui/UnifiedSelect';
import { AIAssistant, PricingGuidance } from '../components/ui';
import { EGYPT_GOVERNORATES, EGYPT_CITIES } from '../utils/constants';
import { TimePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import arEG from 'antd/locale/ar_EG';
import { Upload, X, ImageIcon } from 'lucide-react';

interface Provider {
  _id: string;
  name: { first: string; last: string } | string;
  email: string;
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
  skills?: string[];
  providerProfile?: {
    rating: number;
    totalJobsCompleted: number;
  };
}

interface HireRequestFormData {
  serviceTitle: string;
  category: string;
  serviceDescription: string;
  minBudget: string;
  maxBudget: string;
  government: string;
  city: string;
  street: string;
  apartmentNumber: string;
  additionalInformation: string;
  preferredDateTime: string;
  deliveryTimeDays: string;
  tags: string;
  images: string[]; // Array of image URLs
}

interface AddressFields {
  government: string;
  city: string;
  street: string;
  apartmentNumber: string;
  additionalInformation: string;
}

const HireProviderPage: React.FC = () => {
  const { id: providerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<HireRequestFormData>({
    serviceTitle: '',
    category: '',
    serviceDescription: '',
    minBudget: '',
    maxBudget: '',
    government: '',
    city: '',
    street: '',
    apartmentNumber: '',
    additionalInformation: '',
    preferredDateTime: '',
    deliveryTimeDays: '',
    tags: '',
    images: []
  });

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [profileAddress, setProfileAddress] = useState<AddressFields | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<{[key: string]: boolean}>({});

  // Update city list when governorate changes
  const cityOptions = selectedGovernorate
    ? [...(EGYPT_CITIES[selectedGovernorate] || []), 'أخرى']
    : [];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = accessToken || localStorage.getItem('accessToken') || '';
        
        // Fetch provider
        const providerRes = await fetch(`/api/users/${providerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const providerData = await providerRes.json();
        if (providerData.success) {
          setProvider(providerData.data.user);
        } else {
          throw new Error(providerData.error?.message || 'فشل تحميل بيانات مقدم الخدمة');
        }
        
        // Fetch categories
        const categoriesRes = await fetch('/api/categories');
        const categoriesData = await categoriesRes.json();
        if (categoriesData.success && Array.isArray(categoriesData.data.categories)) {
          setCategories(categoriesData.data.categories.map((cat: { name: string }) => cat.name));
        } else {
          setCategoriesError('فشل تحميل الفئات');
        }
        
        // Fetch user's saved address
        const profileRes = await fetch('/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        if (profileData.success && profileData.data.user.profile?.location) {
          setProfileAddress(profileData.data.user.profile.location);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
      } finally {
        setLoading(false);
        setCategoriesLoading(false);
      }
    };

    fetchData();
  }, [providerId, accessToken, user, navigate]);

  const getProviderName = (provider: Provider): string => {
    if (typeof provider.name === 'string') return provider.name;
    return `${provider.name?.first || ''} ${provider.name?.last || ''}`.trim() || 'مقدم خدمة';
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAISuggestion = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePricingApply = (min: number, max: number) => {
    setFormData(prev => ({
      ...prev,
      minBudget: min.toString(),
      maxBudget: max.toString()
    }));
  };

  const handleAutofillAddress = () => {
    if (profileAddress) {
      const govId = EGYPT_GOVERNORATES.find(g => g.name === profileAddress.government)?.id || '';
      setSelectedGovernorate(govId);
      setSelectedCity(profileAddress.city || '');
      setCustomCity(profileAddress.city && !EGYPT_CITIES[govId]?.includes(profileAddress.city) ? profileAddress.city : '');
      setFormData(prev => ({
        ...prev,
        government: profileAddress.government || '',
        city: profileAddress.city || '',
        street: profileAddress.street || '',
        apartmentNumber: profileAddress.apartmentNumber || '',
        additionalInformation: profileAddress.additionalInformation || ''
      }));
    }
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const newImages: string[] = [];
    const maxFiles = 5;
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    for (let i = 0; i < Math.min(files.length, maxFiles - formData.images.length); i++) {
      const file = files[i];
      
      // Validate file size
      if (file.size > maxFileSize) {
        alert(`الملف ${file.name} أكبر من 5 ميجابايت`);
        continue;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`الملف ${file.name} ليس صورة صالحة`);
        continue;
      }

      setImageUploadProgress(prev => ({ ...prev, [file.name]: true }));

      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || localStorage.getItem('accessToken')}`
          },
          body: formData
        });

        const data = await res.json();
        if (data.success) {
          newImages.push(data.data.url);
        } else {
          alert(`فشل رفع الصورة ${file.name}: ${data.error?.message || 'خطأ غير معروف'}`);
        }
      } catch (error) {
        console.error('Image upload error:', error);
        alert(`فشل رفع الصورة ${file.name}`);
      } finally {
        setImageUploadProgress(prev => ({ ...prev, [file.name]: false }));
      }
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
    setUploadingImages(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.serviceTitle.trim()) {
      setError('عنوان الخدمة مطلوب');
      return false;
    }
    if (!formData.category) {
      setError('الفئة مطلوبة');
      return false;
    }
    if (!formData.serviceDescription.trim()) {
      setError('وصف الخدمة مطلوب');
      return false;
    }
    if (!formData.minBudget || !formData.maxBudget) {
      setError('الميزانية مطلوبة');
      return false;
    }
    if (Number(formData.minBudget) > Number(formData.maxBudget)) {
      setError('الحد الأدنى للميزانية يجب أن يكون أقل من الحد الأقصى');
      return false;
    }
    if (!formData.government || !formData.city) {
      setError('الموقع مطلوب');
      return false;
    }
    if (!formData.preferredDateTime) {
      setError('التاريخ والوقت المفضل مطلوب');
      return false;
    }
    if (!formData.deliveryTimeDays) {
      setError('مدة التنفيذ مطلوبة');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    setSubmitting(true);
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
          street: formData.street,
          apartmentNumber: formData.apartmentNumber,
          additionalInformation: formData.additionalInformation,
        },
        preferredDateTime: formData.preferredDateTime,
        deliveryTimeDays: Number(formData.deliveryTimeDays),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        images: formData.images,
        targetProviderId: providerId // Add target provider ID
      };

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/requests/${data.data.jobRequest._id}`);
        }, 1500);
      } else {
        setError(data.error?.message || 'فشل إرسال طلب التوظيف');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
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

  if (error && !provider) {
    return (
      <div className="min-h-screen bg-warm-cream">
        <Header />
        <div className="pt-20 container mx-auto px-4 py-8">
          <BackButton to={`/provider/${providerId}`} className="mb-4" />
          <BaseCard className="text-center p-8">
            <h2 className="text-xl font-bold text-red-600 mb-2">خطأ</h2>
            <p className="text-text-secondary mb-4">{error}</p>
            <Button onClick={() => navigate(`/provider/${providerId}`)}>العودة لصفحة مقدم الخدمة</Button>
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
          <BackButton to={`/provider/${providerId}`} className="mb-6" />
          
          {/* Provider Info Header */}
          <BaseCard className="mb-8 bg-gradient-to-r from-deep-teal/5 to-soft-teal/5">
            <div className="flex items-center gap-4">
              <img
                src={provider?.avatarUrl || '/default-avatar.png'}
                alt={getProviderName(provider!)}
                className="w-16 h-16 rounded-full object-cover border-2 border-deep-teal"
              />
              <div>
                <h2 className="text-xl font-bold text-deep-teal">
                  توظيف {getProviderName(provider!)}
                </h2>
                <p className="text-text-secondary">
                  إرسال طلب خدمة مباشر لمقدم الخدمة
                </p>
              </div>
            </div>
          </BaseCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* AI Assistant & Pricing Guidance */}
            <div className="lg:col-span-1 space-y-6">
              <AIAssistant
                formType="hire"
                category={formData.category}
                location={formData.government}
                userBudget={formData.minBudget && formData.maxBudget ? {
                  min: Number(formData.minBudget),
                  max: Number(formData.maxBudget)
                } : null}
                onSuggestion={handleAISuggestion}
                className="mb-4"
                rating={user?.providerProfile?.rating}
              />
              <PricingGuidance
                formType="hire"
                category={formData.category}
                location={formData.government}
                userBudget={formData.minBudget && formData.maxBudget ? {
                  min: Number(formData.minBudget),
                  max: Number(formData.maxBudget)
                } : null}
                onPricingApply={handlePricingApply}
                skills={provider?.skills || []}
                rating={provider?.providerProfile?.rating}
              />
            </div>

            {/* Main Form Section */}
            <div className="lg:col-span-2">
              <BaseCard className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-200">
                <h1 className="text-3xl font-extrabold text-[#0e1b18] text-center mb-8">طلب توظيف مباشر</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="serviceTitle">عنوان الخدمة</label>
                      <FormInput
                        type="text"
                        id="serviceTitle"
                        name="serviceTitle"
                        value={formData.serviceTitle}
                        onChange={(e) => handleInputChange('serviceTitle', e.target.value)}
                        placeholder="عنوان الخدمة المطلوبة"
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
                      onChange={(e) => handleInputChange('serviceDescription', e.target.value)}
                      placeholder="اكتب وصفاً مفصلاً للخدمة المطلوبة..."
                      required
                      size="md"
                    />
                  </div>

                  {/* Location Fields */}
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

                  {/* Use Saved Address Button */}
                  {profileAddress && (
                    <div className="mb-4 flex items-center gap-4">
                      <button
                        type="button"
                        className="bg-bright-orange text-white font-semibold py-2 px-6 rounded-xl hover:bg-bright-orange/90 transition-all duration-300 shadow"
                        onClick={handleAutofillAddress}
                      >
                        استخدم العنوان المحفوظ
                      </button>
                    </div>
                  )}

                  {/* Detailed Address Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="street">الشارع</label>
                      <FormInput
                        type="text"
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        placeholder="اسم الشارع"
                        size="md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="apartmentNumber">رقم الشقة/المكتب</label>
                      <FormInput
                        type="text"
                        id="apartmentNumber"
                        name="apartmentNumber"
                        value={formData.apartmentNumber}
                        onChange={(e) => handleInputChange('apartmentNumber', e.target.value)}
                        placeholder="رقم الشقة أو المكتب"
                        size="md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="additionalInformation">معلومات إضافية</label>
                    <FormTextarea
                      id="additionalInformation"
                      name="additionalInformation"
                      value={formData.additionalInformation}
                      onChange={(e) => handleInputChange('additionalInformation', e.target.value)}
                      placeholder="معلومات إضافية عن الموقع (مثال: قرب من مترو، مبنى معين، إلخ)"
                      size="md"
                    />
                  </div>

                  {/* Budget Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="minBudget">يبدأ من (جنيه)</label>
                      <FormInput
                        type="number"
                        id="minBudget"
                        name="minBudget"
                        value={formData.minBudget}
                        onChange={(e) => handleInputChange('minBudget', e.target.value)}
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
                        onChange={(e) => handleInputChange('maxBudget', e.target.value)}
                        placeholder="مثال: 500"
                        min="0"
                        required
                        size="md"
                      />
                    </div>
                  </div>

                                     {/* Preferred Date & Time */}
                   <div>
                     <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="preferredDateTime">التاريخ والوقت المفضل</label>
                     <ConfigProvider locale={arEG}>
                       <input
                         id="preferredDateTime"
                         type="datetime-local"
                         value={formData.preferredDateTime}
                         onChange={(e) => handleInputChange('preferredDateTime', e.target.value)}
                         className="w-full bg-white border-2 border-gray-300 rounded-lg py-2 pr-3 pl-3 focus:ring-2 focus:ring-accent focus:border-accent text-right text-black"
                         required
                         aria-label="التاريخ والوقت المفضل"
                       />
                     </ConfigProvider>
                   </div>

                  {/* Delivery Time */}
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="deliveryTimeDays">مدة التنفيذ (أيام)</label>
                    <FormInput
                      type="number"
                      id="deliveryTimeDays"
                      name="deliveryTimeDays"
                      value={formData.deliveryTimeDays}
                      onChange={(e) => handleInputChange('deliveryTimeDays', e.target.value)}
                      placeholder="مثال: 3"
                      min="1"
                      required
                      size="md"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="tags">الوسوم (افصل بينها بفاصلة)</label>
                    <FormInput
                      type="text"
                      id="tags"
                      name="tags"
                      value={formData.tags}
                      onChange={(e) => handleInputChange('tags', e.target.value)}
                      placeholder="مثال: تنظيف, سباكة, كهرباء"
                      size="md"
                    />
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2">
                      صور توضيحية للخدمة (اختياري)
                    </label>
                    <div className="border-2 border-dashed border-deep-teal/30 rounded-lg p-6 text-center hover:border-deep-teal/50 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImages || formData.images.length >= 5}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-deep-teal mx-auto mb-2" />
                        <p className="text-deep-teal font-medium mb-1">
                          {uploadingImages ? 'جاري رفع الصور...' : 'اضغط لرفع الصور'}
                        </p>
                        <p className="text-text-secondary text-sm">
                          يمكنك رفع حتى 5 صور (JPG, PNG) - الحد الأقصى 5 ميجابايت لكل صورة
                        </p>
                      </label>
                    </div>

                    {/* Uploaded Images Preview */}
                    {formData.images.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-deep-teal mb-3">الصور المرفوعة:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          {formData.images.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={imageUrl}
                                alt={`صورة ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-deep-teal/20"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="حذف الصورة"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload Progress */}
                    {Object.keys(imageUploadProgress).length > 0 && (
                      <div className="mt-3">
                        {Object.entries(imageUploadProgress).map(([fileName, isUploading]) => (
                          <div key={fileName} className="flex items-center gap-2 text-sm text-deep-teal">
                            <ImageIcon className="w-4 h-4" />
                            <span>{fileName}</span>
                            {isUploading && <span>جاري الرفع...</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <div className="text-red-600 text-sm text-right bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
                  {success && <div className="text-green-600 text-sm text-right bg-green-50 p-3 rounded-lg border border-green-200">تم إرسال طلب التوظيف بنجاح!</div>}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={submitting}
                    className="rounded-xl"
                  >
                    إرسال طلب التوظيف
                  </Button>
                </form>
              </BaseCard>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HireProviderPage; 