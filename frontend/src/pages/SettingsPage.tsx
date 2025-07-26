import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Trash2, AlertTriangle, CheckCircle, Settings as SettingsIcon } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { FormInput, FormTextarea } from "../components/ui";
import VerificationCenter from '../components/settings/VerificationCenter';
import UnifiedSelect from '../components/ui/UnifiedSelect';
import { EGYPT_GOVERNORATES, EGYPT_CITIES } from '../utils/constants';
import Button from '../components/ui/Button';
import SettingsSection from '../components/settings/SettingsSection';
import SettingsCard from '../components/settings/SettingsCard';
import SettingsNavigation from '../components/settings/SettingsNavigation';

const SettingsPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigationItems = [
    { 
      id: 'account', 
      label: 'معلومات الحساب', 
      icon: User,
      description: 'تحديث المعلومات الشخصية'
    },
    { 
      id: 'verification', 
      label: 'مركز التحقق', 
      icon: Shield,
      description: 'التحقق من الهوية'
    },
    { 
      id: 'management', 
      label: 'إدارة الحساب', 
      icon: SettingsIcon,
      description: 'الأمان والبيانات'
    },
  ];

  const isAdmin = user?.roles?.includes('admin');
  const isProvider = user?.roles?.includes('provider');
  const isPremium = !!user?.isPremium;

  // Fix address state initialization to avoid type errors
  const [address, setAddress] = useState<{
    government: string;
    city: string;
    street: string;
    apartmentNumber: string;
    additionalInformation: string;
  }>({
    government: '',
    city: '',
    street: '',
    apartmentNumber: '',
    additionalInformation: '',
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');

  // Update city list when governorate changes
  const cityOptions = selectedGovernorate
    ? [...(EGYPT_CITIES[selectedGovernorate] || []), 'أخرى']
    : [];

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarUploading(true);
      setError('');
      try {
        const formData = new FormData();
        formData.append('image', file);
        const imgbbApiKey = import.meta.env.VITE_IMGBB_API_KEY;
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setAvatarUrl(data.data.url);
          setSuccess('تم رفع الصورة بنجاح');
        } else {
          setError('فشل رفع الصورة');
        }
      } catch {
        setError('حدث خطأ أثناء رفع الصورة');
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  const [personalInfo, setPersonalInfo] = useState({
    fullName: `${user?.name?.first || ''} ${user?.name?.last || ''}`,
    phone: user?.phone || '',
    bio: user?.profile?.bio || '',
  });

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({ ...prev, [name]: value }));
  };

  const handlePersonalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Split full name
      const [first, ...rest] = personalInfo.fullName.trim().split(' ');
      const last = rest.join(' ');
      const payload = {
        name: { first, last },
        phone: personalInfo.phone,
        profile: {
          bio: personalInfo.bio,
          location: {
            government: address.government,
            city: address.city,
            street: address.street,
            apartmentNumber: address.apartmentNumber,
            additionalInformation: address.additionalInformation,
          },
        },
        avatarUrl: avatarUrl,
      };
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setSuccess('تم تحديث المعلومات الشخصية بنجاح');
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'حدث خطأ أثناء تحديث المعلومات الشخصية');
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  // Sync address from user context on mount or when user changes
  useEffect(() => {
    if (user?.profile?.location) {
      setAddress({
        government: user.profile?.location?.government || '',
        city: user.profile?.location?.city || '',
        street: user.profile?.location?.street || '',
        apartmentNumber: user.profile?.location?.apartmentNumber || '',
        additionalInformation: user.profile?.location?.additionalInformation || '',
      });
      // Set dropdowns for UnifiedSelect
      const govId = EGYPT_GOVERNORATES.find(g => g.name === user.profile?.location?.government)?.id || '';
      setSelectedGovernorate(govId);
      setSelectedCity(user.profile?.location?.city || '');
      setCustomCity(user.profile?.location?.city && !EGYPT_CITIES[govId]?.includes(user.profile?.location?.city) ? user.profile?.location?.city : '');
    }
  }, [user]);

  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          await response.json();
          // setSettings(data.data.settings); // This line is removed as per the edit hint
        }
      } catch {
        console.error('Error fetching settings');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchSettings();
    }
  }, [accessToken]);

  // Update settings
  // const updateSettings = async (newSettings: Partial<UserSettings>) => { // This function is removed as per the edit hint
  //   setSaving(true);
  //   setError('');
  //   setSuccess('');
  //
  //   try {
  //     const response = await fetch('/api/settings', {
  //       method: 'PATCH',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${accessToken}`
  //       },
  //       body: JSON.stringify(newSettings)
  //     });
  //
  //     if (response.ok) {
  //       const data = await response.json();
  //       setSettings(data.data.settings);
  //       setSuccess('تم تحديث الإعدادات بنجاح');
  //     } else {
  //       const errorData = await response.json();
  //       setError(errorData.error?.message || 'حدث خطأ أثناء تحديث الإعدادات');
  //     }
  //   } catch {
  //     setError('حدث خطأ في الاتصال');
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  useEffect(() => {
    if (isProvider && isPremium) {
      // Removed as per new UX decision
    }
    // eslint-disable-next-line
  }, [isProvider, isPremium]);

  const renderAccountInformation = () => (
    <SettingsSection
      title="معلومات الحساب"
      description="تحديث معلوماتك الشخصية والتفاصيل الأساسية"
      icon={User}
    >
      <SettingsCard title="المعلومات الشخصية">
        <form onSubmit={handlePersonalInfoSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center gap-4">
              <img
                src={avatarPreview || '/default-avatar.png'}
                alt="الصورة الشخصية"
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-deep-teal/10 file:text-deep-teal hover:file:bg-deep-teal/20"
                title="اختر صورة شخصية"
                aria-label="اختر صورة شخصية"
              />
              {avatarUploading && (
                <div className="text-sm text-deep-teal mt-2">جاري رفع الصورة...</div>
              )}
              {error && (
                <div className="text-sm text-red-600 mt-2">{error}</div>
              )}
              {success && (
                <div className="text-sm text-green-600 mt-2">{success}</div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
            <FormInput
              id="fullName"
                name="fullName"
              type="text"
              label="الاسم الكامل"
              placeholder="أدخل اسمك الكامل"
                value={personalInfo.fullName}
                onChange={handlePersonalInfoChange}
              className="w-full"
            />
            <FormInput
              id="email"
              type="email"
              label="البريد الإلكتروني"
              placeholder="أدخل بريدك الإلكتروني"
              defaultValue={user?.email || ''}
              className="w-full"
              disabled
            />
            <FormInput
              id="phone"
                name="phone"
              type="tel"
              label="رقم الهاتف"
              placeholder="أدخل رقم هاتفك"
                value={personalInfo.phone}
                onChange={handlePersonalInfoChange}
                className="w-full"
              />
              <FormTextarea
                id="bio"
                name="bio"
                label="نبذة شخصية"
                placeholder="اكتب نبذة عن نفسك"
                value={personalInfo.bio}
                onChange={handlePersonalInfoChange}
                className="w-full"
                rows={3}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <UnifiedSelect
              value={selectedGovernorate}
              onChange={val => {
                setSelectedGovernorate(val);
                setSelectedCity('');
                setCustomCity('');
                setAddress(prev => ({ ...prev, government: EGYPT_GOVERNORATES.find(g => g.id === val)?.name || '' }));
              }}
              options={EGYPT_GOVERNORATES.map(g => ({ value: g.id, label: g.name }))}
              placeholder="اختر المحافظة"
              isSearchable
              searchPlaceholder="ابحث عن محافظة..."
              required
              label="المحافظة"
              className="w-full"
            />
            <UnifiedSelect
              value={selectedCity}
              onChange={val => {
                setSelectedCity(val);
                setCustomCity('');
                setAddress(prev => ({ ...prev, city: val === 'أخرى' ? '' : val }));
              }}
              options={cityOptions.map(city => ({ value: city, label: city }))}
              placeholder="اختر المدينة"
              isSearchable
              searchPlaceholder="ابحث عن مدينة..."
              required
              label="المدينة"
              disabled={!selectedGovernorate}
              className="w-full"
            />
            {selectedCity === 'أخرى' && (
              <FormInput
                type="text"
                value={customCity}
                onChange={e => {
                  setCustomCity(e.target.value);
                  setAddress(prev => ({ ...prev, city: e.target.value }));
                }}
                placeholder="أدخل اسم المدينة"
                size="md"
                className="mt-2 w-full"
                required
                label="مدينة أخرى"
              />
            )}
            <FormInput
              id="street"
              name="street"
              label="الشارع"
              placeholder="مثال: شارع التحرير، شارع محمد فريد"
              value={address.street}
              onChange={handleAddressChange}
              className="w-full"
            />
            <FormInput
              id="apartmentNumber"
              name="apartmentNumber"
              label="رقم الشقة"
              placeholder="مثال: شقة 12، الدور 3"
              value={address.apartmentNumber}
              onChange={handleAddressChange}
              className="w-full"
            />
            <FormTextarea
              id="additionalInformation"
              name="additionalInformation"
              label="معلومات إضافية"
              placeholder="أي تفاصيل إضافية..."
              value={address.additionalInformation}
              onChange={handleAddressChange}
              className="w-full"
              rows={2}
            />
        </div>
        <div className="flex justify-end mt-8">
          <Button 
              type="submit"
            className="bg-deep-teal text-white font-semibold py-3 px-8 rounded-xl hover:bg-deep-teal/90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'جاري التحديث...' : 'تحديث المعلومات'}
          </Button>
        </div>
        </form>
      </SettingsCard>
    </SettingsSection>
  );

  const renderVerificationCenter = () => (
    !isAdmin ? (
      <VerificationCenter />
    ) : (
      <SettingsSection title="مركز التحقق" description="التحقق من هويتك لفتح الميزات الإضافية وزيادة الثقة" icon={Shield}>
        <SettingsCard title="التحقق من الهوية">
          <div className="p-6 text-text-secondary text-center">
            المسؤولون لا يحتاجون إلى التحقق من الهوية.
          </div>
        </SettingsCard>
      </SettingsSection>
    )
  );

  const renderAccountManagement = () => (
    <SettingsSection
      title="إدارة الحساب"
      description="إدارة أمان حسابك وبياناتك"
      icon={SettingsIcon}
    >
      <SettingsCard title="الأمان والبيانات">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-deep-teal/10 p-3 rounded-full text-deep-teal">
                <Key size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-text-primary">تغيير كلمة المرور</h4>
                <p className="text-text-secondary text-sm mt-1">حافظ على أمان حسابك بكلمة مرور قوية.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-deep-teal border-deep-teal hover:bg-deep-teal hover:text-white"
            >
              تغيير
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-red-800">حذف الحساب</h4>
                <p className="text-red-600 text-sm mt-1">حذف حسابك وبياناتك نهائياً.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-deep-teal border-deep-teal hover:bg-deep-teal hover:text-white"
            >
              حذف
            </Button>
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return renderAccountInformation();
      case 'verification':
        return renderVerificationCenter();
      case 'management':
        return renderAccountManagement();
      default:
        return renderAccountInformation();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-cream" dir="rtl">
        <Header />
        <div className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-text-secondary">جاري التحميل...</div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-cream" dir="rtl">
      <Header />
      <div className="flex pt-20">
        <SettingsNavigation
          items={navigationItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">{success}</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}
            
            {renderContent()}

            {/* Targeted Leads for Premium Providers */}
            {/* Removed as per new UX decision */}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default SettingsPage; 