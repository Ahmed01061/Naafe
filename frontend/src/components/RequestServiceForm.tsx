import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Button from './ui/Button';
import BaseCard from './ui/BaseCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FormInput, FormTextarea } from './ui';
import UnifiedSelect from './ui/UnifiedSelect';
import { AIAssistant } from './ui';
import { PricingGuidance } from './ui';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { EGYPT_GOVERNORATES, EGYPT_CITIES } from '../utils/constants';
import { DatePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import 'antd/dist/reset.css';
import arEG from 'antd/locale/ar_EG';

interface RequestServiceFormData {
  requestTitle: string;
  category: string;
  requestDescription: string;
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

const RequestServiceForm: React.FC = () => {
  const { accessToken } = useAuth();
  const [formData, setFormData] = useState<RequestServiceFormData>({
    requestTitle: '',
    category: '',
    requestDescription: '',
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
    images: [],
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<{[key: string]: boolean}>({});
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [profileAddress, setProfileAddress] = useState<AddressFields | null>(null);
  const [showAutofillSuccess, setShowAutofillSuccess] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');

  // Update city list when governorate changes
  const cityOptions = selectedGovernorate
    ? [...(EGYPT_CITIES[selectedGovernorate] || []), 'أخرى']
    : [];

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Limit to 5 images
    if (formData.images.length + files.length > 5) {
      alert('يمكنك رفع 5 صور كحد أقصى');
      return;
    }

    setUploadingImages(true);

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert('يرجى رفع صور فقط');
        continue;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        continue;
      }

      setImageUploadProgress(prev => ({ ...prev, [file.name]: true }));

      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        if (data.success && data.data && data.data.url) {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, data.data.url]
          }));
        } else {
          alert('فشل رفع الصورة. يرجى المحاولة مرة أخرى.');
        }
      } catch (error) {
        alert('فشل رفع الصورة. يرجى المحاولة مرة أخرى.');
      }

      setImageUploadProgress(prev => ({ ...prev, [file.name]: false }));
    }

    setUploadingImages(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: formData.requestTitle,
        description: formData.requestDescription,
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
          address: `${formData.government}, ${formData.city}, ${formData.street}, ${formData.apartmentNumber}`,
          additionalInformation: formData.additionalInformation,
        },
        deadline: formData.preferredDateTime ? new Date(formData.preferredDateTime) : undefined,
        deliveryTimeDays: Number(formData.deliveryTimeDays),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        attachments: formData.images.map(url => ({
          url,
          filename: url.split('/').pop() || 'image.jpg',
          fileType: 'image/jpeg', // You can improve this if you have the actual type
          fileSize: 0 // If you have the size, set it; otherwise, leave as 0 or omit
        })),
      };
      const res = await fetch('/api/requests', {
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
        throw new Error(data.error?.message || 'Failed to post request');
      }
      setSuccess(true);
      setTimeout(() => navigate('/search/service-requests'), 1500);
    } catch (err) {
      setLoading(false);
      alert(err instanceof Error ? err.message : 'Failed to post request');
    }
  };

  // Add this handler to map AI fields to form fields
  const handleAISuggestion = (field: string, value: string) => {
    if (field === 'title') {
      setFormData(prev => ({ ...prev, requestTitle: value }));
    } else if (field === 'description') {
      setFormData(prev => ({ ...prev, requestDescription: value }));
    } else if (field === 'keywords') {
      setFormData(prev => ({ ...prev, tags: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Add this handler for pricing guidance
  const handlePricingApply = (min: number, max: number) => {
    setFormData(prev => ({
      ...prev,
      minBudget: min.toString(),
      maxBudget: max.toString()
    }));
  };

  const handleAutofillAddress = () => {
    if (!profileAddress) return;
    setFormData(prev => ({
      ...prev,
      government: profileAddress.government || '',
      city: profileAddress.city || '',
      street: profileAddress.street || '',
      apartmentNumber: profileAddress.apartmentNumber || '',
      additionalInformation: profileAddress.additionalInformation || '',
    }));
    // Set dropdowns for UnifiedSelect
    const govId = EGYPT_GOVERNORATES.find(g => g.name === profileAddress.government)?.id || '';
    setSelectedGovernorate(govId);
    setSelectedCity(profileAddress.city || '');
    setCustomCity(profileAddress.city && !EGYPT_CITIES[govId]?.includes(profileAddress.city) ? profileAddress.city : '');
    setShowAutofillSuccess(true);
    setTimeout(() => setShowAutofillSuccess(false), 2000);
  };

  // Helper for 12-hour Arabic time format
  const formatArabicTime = (value: dayjs.Dayjs | null): string => {
    if (!value) return '';
    const hour = value.hour();
    const minute = value.minute().toString().padStart(2, '0');
    const isAM = hour < 12;
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    return `${displayHour}:${minute} ${isAM ? 'ص' : 'م'}`;
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
                <span className="text-[#F5A623]">✨</span>
                أدوات الذكاء الاصطناعي
              </h2>
              <AIAssistant
                formType="request"
                category={formData.category}
                currentFields={formData as unknown as Record<string, unknown>}
                onSuggestionApply={handleAISuggestion}
                className="mb-4"
              />
              <PricingGuidance
                formType="request"
                category={formData.category}
                location={formData.government}
                userBudget={formData.minBudget && formData.maxBudget ? {
                  min: Number(formData.minBudget),
                  max: Number(formData.maxBudget)
                } : null}
                onPricingApply={handlePricingApply}
              />
            </BaseCard>
          </div>

          {/* Main Form Section */}
          <div>
            <BaseCard className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-200">
              <h1 className="text-3xl font-extrabold text-[#0e1b18] text-center mb-8">طلب خدمة</h1>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="requestTitle">عنوان الطلب</label>
                    <FormInput
                      type="text"
                      id="requestTitle"
                      name="requestTitle"
                      value={formData.requestTitle}
                      onChange={handleChange}
                      placeholder="عنوان الطلب"
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
                <div>
                  <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="requestDescription">وصف الطلب</label>
                  <FormTextarea
                    id="requestDescription"
                    name="requestDescription"
                    value={formData.requestDescription}
                    onChange={handleChange}
                    placeholder="وصف مفصل للخدمة المطلوبة..."
                    required
                    size="md"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="minBudget">الحد الأدنى للميزانية (جنيه)</label>
                    <FormInput
                      type="number"
                      id="minBudget"
                      name="minBudget"
                      value={formData.minBudget}
                      onChange={handleChange}
                      placeholder="مثال: 50"
                      min="0"
                      required
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="maxBudget">الحد الأقصى للميزانية (جنيه)</label>
                    <FormInput
                      type="number"
                      id="maxBudget"
                      name="maxBudget"
                      value={formData.maxBudget}
                      onChange={handleChange}
                      placeholder="مثال: 200"
                      min="0"
                      required
                      size="md"
                    />
                  </div>
                </div>
                {profileAddress && (
                  <div className="mb-4 flex items-center gap-4">
                    <button
                      type="button"
                      className="bg-bright-orange text-white font-semibold py-2 px-6 rounded-xl hover:bg-bright-orange/90 transition-all duration-300 shadow"
                      onClick={handleAutofillAddress}
                    >
                      استخدم العنوان المحفوظ
                    </button>
                    {showAutofillSuccess && <span className="text-green-600 font-semibold">تم تعبئة العنوان!</span>}
                  </div>
                )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="street">الشارع</label>
                    <FormInput
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="مثال: شارع التحرير، شارع محمد فريد"
                      required
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="apartmentNumber">رقم الشقة</label>
                    <FormInput
                      type="text"
                      id="apartmentNumber"
                      name="apartmentNumber"
                      value={formData.apartmentNumber}
                      onChange={handleChange}
                      placeholder="مثال: شقة 12، الدور 3"
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
                    onChange={handleChange}
                    placeholder="أي تفاصيل إضافية..."
                    size="md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="preferredDateTime">التاريخ والوقت المفضل</label>
                  <ConfigProvider locale={arEG}>
                    <DatePicker
                      showTime={{
                        use12Hours: true,
                        showSecond: false,
                        format: formatArabicTime,
                        locale: {
                          ...arEG.TimePicker,
                          meridiem: (hour: number) => (hour < 12 ? 'ص' : 'م')
                        }
                      }}
                      format="YYYY-MM-DD hh:mm A"
                      value={formData.preferredDateTime ? dayjs(formData.preferredDateTime) : null}
                      onChange={val => setFormData(prev => ({
                        ...prev,
                        preferredDateTime: val ? val.toISOString() : ''
                      }))}
                      className="w-full custom-timepicker-placeholder bg-white border-2 border-gray-300 rounded-lg py-2 pr-3 pl-3 focus:ring-2 focus:ring-accent focus:border-accent text-right text-[#0e1b18]"
                      placeholder="اختر التاريخ والوقت"
                      style={{ direction: 'rtl' }}
                      classNames={{ popup: { root: 'rtl custom-datepicker-dropdown' } }}
                      disabledDate={current => current && current < dayjs().startOf('day')}
                    />
                  </ConfigProvider>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="deliveryTimeDays">مدة التنفيذ (أيام)</label>
                    <FormInput
                      type="number"
                      id="deliveryTimeDays"
                      name="deliveryTimeDays"
                      value={formData.deliveryTimeDays}
                      onChange={handleChange}
                      placeholder="مثال: 3"
                      min="1"
                      required
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="tags">العلامات (اختياري)</label>
                    <FormInput
                      type="text"
                      id="tags"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="مثال: تنظيف، منزل، عاجل"
                      size="md"
                    />
                  </div>
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

export default RequestServiceForm; 