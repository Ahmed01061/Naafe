import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import BaseCard from '../components/ui/BaseCard';
import { FormInput } from "../components/ui";
import ProfileBuilder from '../components/onboarding/ProfileBuilder';
import OnboardingSlider from '../components/onboarding/OnboardingSlider';
import PasswordStrengthIndicator from '../components/ui/PasswordStrengthIndicator';
import { 
  validateRegistrationForm, 
  validateEmail, 
  validatePhone, 
  validatePassword,
  validateName,
  checkAvailability,
  debounce,
  FieldValidation
} from '../utils/validation';
import { Mail, Phone, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import heroImage from '/public/images/hero-section.png';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
};

const initialErrors: FieldValidation = {
  firstName: { isValid: true, message: '' },
  lastName: { isValid: true, message: '' },
  email: { isValid: true, message: '' },
  phoneNumber: { isValid: true, message: '' },
  password: { isValid: true, message: '' },
  confirmPassword: { isValid: true, message: '' },
  general: { isValid: true, message: '' }
};

type OnboardingStep = 'register' | 'profile' | 'onboarding' | 'complete';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [formData, setFormData] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldValidation>(initialErrors);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('register');
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    email?: { available: boolean; message: string; checking?: boolean };
    phone?: { available: boolean; message: string; checking?: boolean };
  }>({});
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Debounced availability check
  const debouncedAvailabilityCheck = useCallback(
    debounce(async (...args: unknown[]) => {
      const [email, phone] = args as [string, string];
      if (email || phone) {
        console.log('Checking availability for:', { email, phone });
        
        // Set checking status
        setAvailabilityStatus(prev => ({
          ...prev,
          ...(email && { email: { available: false, message: '', checking: true } }),
          ...(phone && { phone: { available: false, message: '', checking: true } })
        }));
        
        const availability = await checkAvailability(email, phone);
        console.log('Availability result:', availability);
        
        // Clear checking status and set result
        setAvailabilityStatus(prev => ({
          ...prev,
          ...(email && availability.email && { email: { ...availability.email, checking: false } }),
          ...(phone && availability.phone && { phone: { ...availability.phone, checking: false } })
        }));
      }
    }, 500),
    []
  );

  // Real-time validation for email
  const validateEmailField = useCallback((email: string) => {
    const validation = validateEmail(email);
    setFieldErrors(prev => ({
      ...prev,
      email: validation
    }));

    // Check availability if email is valid and not empty
    if (validation.isValid && email && email.trim()) {
      debouncedAvailabilityCheck(email, formData.phoneNumber);
    } else {
      // Clear availability status if email is invalid
      setAvailabilityStatus(prev => ({ ...prev, email: undefined }));
    }
  }, [debouncedAvailabilityCheck, formData.phoneNumber]);

  // Real-time validation for phone
  const validatePhoneField = useCallback((phone: string) => {
    const validation = validatePhone(phone);
    setFieldErrors(prev => ({
      ...prev,
      phoneNumber: validation
    }));

    // Check availability if phone is valid and not empty
    if (validation.isValid && phone && phone.trim()) {
      debouncedAvailabilityCheck(formData.email, phone);
    } else {
      // Clear availability status if phone is invalid
      setAvailabilityStatus(prev => ({ ...prev, phone: undefined }));
    }
  }, [debouncedAvailabilityCheck, formData.email]);

  // Effect to update field errors when availability status changes
  useEffect(() => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      // Email
      if (availabilityStatus.email) {
        if (!availabilityStatus.email.available) {
          newErrors.email = { isValid: false, message: availabilityStatus.email.message };
        } else {
          newErrors.email = { isValid: true, message: '' };
        }
      }
      // Phone
      if (availabilityStatus.phone) {
        if (!availabilityStatus.phone.available) {
          newErrors.phoneNumber = { isValid: false, message: availabilityStatus.phone.message };
        } else {
          newErrors.phoneNumber = { isValid: true, message: '' };
        }
      }
      return newErrors;
    });
  }, [availabilityStatus]);

  // Real-time validation for password
  const validatePasswordField = useCallback((password: string) => {
    const validation = validatePassword(password);
    setFieldErrors(prev => ({
      ...prev,
      password: validation
    }));

    // Also validate confirm password if it exists
    if (formData.confirmPassword) {
      const confirmValidation = password === formData.confirmPassword 
        ? { isValid: true, message: '' }
        : { isValid: false, message: 'كلمتا المرور غير متطابقتين' };
      
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword: confirmValidation
      }));
    }
  }, [formData.confirmPassword]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Mark that user has started interacting with the form
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear general error when user starts typing
    if (fieldErrors.general && !fieldErrors.general.isValid) {
      setFieldErrors(prev => ({ ...prev, general: { isValid: true, message: '' } }));
    }

    // Real-time validation based on field type
    switch (name) {
      case 'email':
        validateEmailField(value);
        break;
      case 'phoneNumber':
        validatePhoneField(value);
        break;
      case 'password':
        validatePasswordField(value);
        break;
      case 'confirmPassword': {
        const confirmValidation = value === formData.password 
          ? { isValid: true, message: '' }
          : { isValid: false, message: 'كلمتا المرور غير متطابقتين' };
        setFieldErrors(prev => ({ ...prev, confirmPassword: confirmValidation }));
        break;
      }
      case 'firstName': {
        const validation = validateName(value, 'الاسم الأول');
        setFieldErrors(prev => ({ ...prev, firstName: validation }));
        break;
      }
      case 'lastName': {
        const validation = validateName(value, 'اسم العائلة');
        setFieldErrors(prev => ({ ...prev, lastName: validation }));
        break;
      }
    }
  };

  const validateForm = () => {
    const errors = validateRegistrationForm(formData);
    
    // Add availability errors
    if (availabilityStatus.email && !availabilityStatus.email.available) {
      errors.email = { isValid: false, message: availabilityStatus.email.message };
    }
    
    if (availabilityStatus.phone && !availabilityStatus.phone.available) {
      errors.phoneNumber = { isValid: false, message: availabilityStatus.phone.message };
    }

    setFieldErrors(errors);
    
    // Check if any field has errors
    const hasErrors = Object.values(errors).some(error => !error.isValid);
    return !hasErrors;
  };

  // Check if form has any errors
  const hasFormErrors = () => {
    return Object.values(fieldErrors).some(error => error && !error.isValid);
  };

  // Check if form is complete (all required fields filled)
  const isFormComplete = () => {
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.phoneNumber.trim() &&
      formData.password &&
      formData.confirmPassword
    );
  };

  // Check if form is valid and ready for submission
  const isFormValid = () => {
    return isFormComplete() && !hasFormErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const payload = {
      email: formData.email,
      password: formData.password,
      name: { first: formData.firstName, last: formData.lastName },
      phone: formData.phoneNumber,
      role: 'seeker' as const,
      roles: ['seeker' as const],
    };
    
    const success = await register(payload);
    if (success) {
      setOnboardingStep('profile');
    } else {
      // Handle specific backend errors
      if (error) {
        if (error.includes('البريد الإلكتروني مسجل مسبقاً')) {
          setFieldErrors(prev => ({ ...prev, email: { isValid: false, message: 'البريد الإلكتروني مسجل مسبقاً' } }));
        } else if (error.includes('رقم الهاتف مسجل مسبقاً')) {
          setFieldErrors(prev => ({ ...prev, phoneNumber: { isValid: false, message: 'رقم الهاتف مسجل مسبقاً' } }));
        } else {
          setFieldErrors(prev => ({ ...prev, general: { isValid: false, message: error } }));
        }
      }
    }
  };

  const handleProfileComplete = () => {
    setOnboardingStep('onboarding');
  };

  const handleProfileSkip = () => {
    setOnboardingStep('onboarding');
  };

  const handleOnboardingComplete = () => {
    setOnboardingStep('complete');
      navigate('/', { replace: true });
  };

  // Show onboarding components after successful registration
  if (onboardingStep === 'profile') {
    return (
      <div className="min-h-screen bg-[#F5E6D3] flex items-center justify-center p-4 font-cairo" dir="rtl">
        <ProfileBuilder
          initialValues={{
            government: '',
            city: '',
            street: '',
            apartmentNumber: '',
            additionalInformation: ''
          }}
          onComplete={handleProfileComplete}
          onSkip={handleProfileSkip}
        />
      </div>
    );
  }

  if (onboardingStep === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#F5E6D3] flex items-center justify-center p-4 font-cairo" dir="rtl">
        <OnboardingSlider onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // Helper function to get border color based on field status
  const getBorderColor = (fieldName: keyof typeof fieldErrors) => {
    const error = fieldErrors[fieldName];
    const isChecking = availabilityStatus[fieldName as keyof typeof availabilityStatus]?.checking;
    
    if (error && !error.isValid) {
      return 'border-red-500 focus:border-red-500';
    }
    
    if (isChecking) {
      return 'border-amber-400 focus:border-amber-400';
    }
    
    // Check if field has value and is valid
    if (formData[fieldName as keyof typeof formData] && !error) {
      return 'border-green-500 focus:border-green-500';
    }
    
    return 'border-gray-300 focus:border-[#2D5D4F]';
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-[#F5E6D3] via-[#FDF8F0] to-[#F5E6D3] font-cairo" dir="rtl">
      {/* Hero Section (left on desktop, top on mobile) */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-[#F5E6D3] to-[#FDF8F0] p-12">
        <div className="flex flex-row items-center gap-4 mb-6">
          <img src="/public/images/logo-no-bg.png" alt="Naafe Logo" className="w-20 h-20" />
          <span className="text-4xl font-extrabold text-[#0e1b18] font-arabic">نافع</span>
        </div>
        <img src={heroImage} alt="Hero" className="max-w-xs w-full mb-8 drop-shadow-xl" />
        <h2 className="text-3xl font-extrabold text-deep-teal mb-2">انضم إلى نافِع</h2>
        <p className="text-lg text-text-secondary text-center max-w-sm">ابدأ رحلتك في منصة الخدمات الأسرع والأكثر أمانًا في مصر.</p>
      </div>
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 bg-white/80 shadow-xl md:rounded-l-3xl">
        <div className="w-full max-w-md">
          <BaseCard className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-200">
            {/* No title at the top of the form card for minimalist look */}
            {/* General Error */}
            {fieldErrors.general?.message && <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 mb-4 animate-fade-in">{fieldErrors.general.message}</div>}
            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              {/* First Name Field */}
              <div className="w-full">
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="firstName">الاسم الأول</label>
                <div className="relative flex items-center w-full">
                  <FormInput
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="أدخل اسمك الأول"
                    className={`w-full bg-gray-50 border-2 pr-12 pl-4 py-3 rounded-xl text-[#0e1b18] text-right placeholder-gray-400 focus:bg-white focus:outline-none transition-colors duration-200 ${getBorderColor('firstName')}`}
                    required
                    autoComplete="given-name"
                  />
                  <User className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-deep-teal pointer-events-none" />
                  {fieldErrors.firstName?.message && (
                    <AlertCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 animate-fade-in pointer-events-none" />
                  )}
                </div>
                {fieldErrors.firstName?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.firstName.message}</p>}
              </div>
              {/* Last Name Field */}
              <div className="w-full">
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="lastName">اسم العائلة</label>
                <FormInput
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="أدخل اسم العائلة"
                  className={`w-full bg-gray-50 border-2 pr-4 pl-4 py-3 rounded-xl text-[#0e1b18] text-right placeholder-gray-400 focus:border-[#2D5D4F] focus:bg-white focus:outline-none transition-colors duration-200 ${getBorderColor('lastName')}`}
                  required
                  autoComplete="family-name"
                />
                {fieldErrors.lastName?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.lastName.message}</p>}
              </div>
              {/* Email Field */}
              <div className="w-full">
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="email">البريد الإلكتروني</label>
                <div className="relative flex items-center w-full">
                  <FormInput
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@email.com"
                    className={`w-full bg-gray-50 border-2 pr-12 pl-4 py-3 rounded-xl text-[#0e1b18] text-right placeholder-gray-400 focus:bg-white focus:outline-none transition-colors duration-200 ${getBorderColor('email')}`}
                    required
                    autoComplete="email"
                  />
                  <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-deep-teal pointer-events-none" />
                  {fieldErrors.email?.message && (
                    <AlertCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 animate-fade-in pointer-events-none" />
                  )}
                </div>
                {fieldErrors.email?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.email.message}</p>}
              </div>
              {/* Phone Field */}
              <div className="w-full">
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="phoneNumber">رقم الهاتف</label>
                <div className="relative flex items-center w-full">
                  <FormInput
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="مثال: 01012345678"
                    className={`w-full bg-gray-50 border-2 pr-12 pl-4 py-3 rounded-xl text-[#0e1b18] text-right placeholder-gray-400 focus:bg-white focus:outline-none transition-colors duration-200 ${getBorderColor('phoneNumber')}`}
                    required
                    autoComplete="tel"
                  />
                  <Phone className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-deep-teal pointer-events-none" />
                  {fieldErrors.phoneNumber?.message && (
                    <AlertCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 animate-fade-in pointer-events-none" />
                  )}
                </div>
                {fieldErrors.phoneNumber?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.phoneNumber.message}</p>}
              </div>
              {/* Password Field */}
              <div className="w-full">
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="password">كلمة المرور</label>
                <div className="relative flex items-center">
                  <FormInput
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="أدخل كلمة المرور"
                    className={`w-full bg-gray-50 border-2 pr-12 pl-4 py-3 rounded-xl text-[#0e1b18] text-right placeholder-gray-400 focus:bg-white focus:outline-none transition-colors duration-200 ${getBorderColor('password')}`}
                    required
                    autoComplete="new-password"
                  />
                  <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-deep-teal pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute left-10 top-1/2 transform -translate-y-1/2 text-accent hover:text-deep-teal transition-colors focus:outline-none"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {fieldErrors.password?.message && (
                    <AlertCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 animate-fade-in pointer-events-none" />
                  )}
                </div>
                <div className="mt-1 mb-2">
                  <PasswordStrengthIndicator password={formData.password} />
                </div>
                {fieldErrors.password?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.password.message}</p>}
              </div>
              {/* Confirm Password Field */}
              <div className="w-full">
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="confirmPassword">تأكيد كلمة المرور</label>
                <div className="relative flex items-center">
                  <FormInput
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="أعد إدخال كلمة المرور"
                    className={`w-full bg-gray-50 border-2 pr-4 pl-4 py-3 rounded-xl text-[#0e1b18] text-right placeholder-gray-400 focus:border-[#2D5D4F] focus:bg-white focus:outline-none transition-colors duration-200 ${getBorderColor('confirmPassword')}`}
                    required
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword?.message && (
                    <AlertCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 animate-fade-in pointer-events-none" />
                  )}
                </div>
                {fieldErrors.confirmPassword?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.confirmPassword.message}</p>}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                disabled={!isFormValid()}
              >
                إنشاء حساب
              </Button>
              {/* Form Status Helper */}
              {hasUserInteracted && !isFormComplete() && (
                <div className="text-amber-600 text-sm text-center bg-amber-50 p-3 rounded-lg border border-amber-200 animate-fade-in">يرجى ملء جميع الحقول المطلوبة</div>
              )}
              {hasUserInteracted && isFormComplete() && hasFormErrors() && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 animate-fade-in">يرجى تصحيح الأخطاء قبل المتابعة</div>
              )}
              <div className="text-center">
                <span className="text-sm text-[#0e1b18]">لديك حساب بالفعل؟{' '}
                  <Link to="/login" className="font-bold text-[#2D5D4F] hover:text-[#F5A623] transition-colors duration-200 focus:outline-none focus:underline">تسجيل الدخول</Link>
                </span>
              </div>
            </form>
          </BaseCard>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 