import React, { useState } from 'react';
import { FormInput, FormTextarea } from '../ui';
import UnifiedSelect from '../ui/UnifiedSelect';
import { EGYPT_GOVERNORATES, EGYPT_CITIES } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

interface ProfileBuilderProps {
  initialValues?: Partial<ProfileFormData>;
  onComplete: () => void;
  onSkip?: () => void;
}

interface ProfileFormData {
  avatar?: File | null;
  bio: string;
  government: string;
  city: string;
  street: string;
  apartmentNumber: string;
  additionalInformation: string;
}

const defaultFormData: ProfileFormData = {
  avatar: null,
  bio: '',
  government: '',
  city: '',
  street: '',
  apartmentNumber: '',
  additionalInformation: '',
};

const ProfileBuilder: React.FC<ProfileBuilderProps> = ({ 
  initialValues = {}, 
  onComplete, 
  onSkip 
}) => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    ...defaultFormData,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');

  // Update city list when governorate changes
  const cityOptions = selectedGovernorate
    ? [...(EGYPT_CITIES[selectedGovernorate] || []), 'أخرى']
    : [];

  // Get user initials for avatar placeholder
  const getUserInitials = () => {
    if (!user) return '?';
    const firstName = user.name?.first || '';
    const lastName = user.name?.last || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'avatar' && e.target instanceof HTMLInputElement && e.target.type === 'file') {
      const input = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, avatar: input.files && input.files[0] ? input.files[0] : null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const uploadAvatarToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    return data.data.url;
  };

  const saveProfileToBackend = async (avatarUrl?: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No authentication token');

    const addressData = {
      government: formData.government,
      city: formData.city,
      street: formData.street,
      apartmentNumber: formData.apartmentNumber,
      additionalInformation: formData.additionalInformation,
    };

    const updateData: Record<string, unknown> = {
      profile: {
        bio: formData.bio,
        location: addressData,
      }
    };

    if (avatarUrl) {
      updateData.avatarUrl = avatarUrl;
    }

    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to save profile');
    }

    return await response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let avatarUrl: string | undefined;

      // Upload avatar if provided
      if (formData.avatar) {
        avatarUrl = await uploadAvatarToImgBB(formData.avatar);
      }

      // Save profile data to backend
      const response = await saveProfileToBackend(avatarUrl);
      if (response && response.data && response.data.user && updateUser) {
        updateUser({ ...response.data.user, id: response.data.user._id });
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Profile save error:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8 font-cairo" dir="rtl">
      <h2 className="text-3xl font-bold text-deep-teal text-center mb-2">بناء الملف الشخصي</h2>
      <p className="text-text-secondary text-center mb-8">أكمل بيانات ملفك الشخصي لتسهيل استخدام المنصة.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* صورة الملف الشخصي */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-deep-teal to-soft-teal flex items-center justify-center overflow-hidden shadow-lg">
              {formData.avatar ? (
                <img
                  src={URL.createObjectURL(formData.avatar)}
                  alt="صورة الملف الشخصي"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {getUserInitials()}
                </span>
              )}
            </div>
            <label className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white text-deep-teal flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 border-2 border-deep-teal">
              <input
                type="file"
                name="avatar"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
                aria-label="رفع صورة شخصية"
              />
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </label>
          </div>
          <span className="text-xs text-gray-500">اختياري: يمكنك رفع صورة شخصية</span>
        </div>

        {/* Bio Field */}
        <FormTextarea
          id="bio"
          name="bio"
          label="نبذة شخصية (اختياري)"
          placeholder="أخبرنا عن نفسك بإيجاز... مهاراتك، خبراتك، أو أي شيء تود مشاركته"
          value={formData.bio}
          onChange={handleChange}
          rows={3}
        />

        {/* الحقول */}
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
          label="المحافظة"
        />
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
          label="المدينة"
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
            label="مدينة أخرى"
          />
        )}
        
        <FormInput
          type="text"
          id="street"
          name="street"
          label="الشارع"
          placeholder="مثال: شارع التحرير، شارع محمد فريد"
          value={formData.street}
          onChange={handleChange}
          required
        />
        
        <FormInput
          type="text"
          id="apartmentNumber"
          name="apartmentNumber"
          label="رقم الشقة"
          placeholder="مثال: شقة 12، الدور 3"
          value={formData.apartmentNumber}
          onChange={handleChange}
        />
        
        <FormTextarea
          id="additionalInformation"
          name="additionalInformation"
          label="معلومات إضافية"
          placeholder="أي تفاصيل إضافية..."
          value={formData.additionalInformation}
          onChange={handleChange}
        />

        {error && (
          <div className="text-red-600 text-sm text-right bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-green-600 text-sm text-right bg-green-50 p-3 rounded-lg border border-green-200">
            تم حفظ البيانات بنجاح!
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {onSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-6 py-3 text-text-secondary font-semibold rounded-xl border border-gray-300 hover:bg-gray-100 transition-all duration-300"
            >
              تخطي
            </button>
          )}
          <button
            type="submit"
            className="flex-1 bg-deep-teal text-white font-bold py-3 rounded-xl hover:bg-deep-teal/90 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ ومتابعة'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileBuilder; 