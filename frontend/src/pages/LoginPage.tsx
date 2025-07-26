import { useState, useCallback } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import BaseCard from '../components/ui/BaseCard';
import { User } from '../types';
import { FormInput } from '../components/ui';
import { validateEmail } from '../utils/validation';
import heroImage from '/public/images/hero-section.png';

// Field validation type
type FieldValidation = {
  email?: { isValid: boolean; message: string };
  password?: { isValid: boolean; message: string };
  general?: { isValid: boolean; message: string };
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldValidation>({});
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Real-time validation for email
  const validateEmailField = useCallback((email: string) => {
    const validation = validateEmail(email);
    setFieldErrors(prev => ({
      ...prev,
      email: validation
    }));
  }, []);

  // Real-time validation for password
  const validatePasswordField = useCallback((password: string) => {
    const validation = password.trim() 
      ? { isValid: true, message: '' }
      : { isValid: false, message: 'كلمة المرور مطلوبة' };
    
    setFieldErrors(prev => ({
      ...prev,
      password: validation
    }));
  }, []);

  // Check if form has any errors
  const hasFormErrors = () => {
    return Object.values(fieldErrors).some(error => error && !error.isValid);
  };

  // Check if form is complete (all required fields filled)
  const isFormComplete = () => {
    return formData.email.trim() && formData.password.trim();
  };

  // Check if form is valid and ready for submission
  const isFormValid = () => {
    return isFormComplete() && !hasFormErrors();
  };

  // Helper function to get border color based on field status
  const getBorderColor = (fieldName: keyof typeof fieldErrors) => {
    const error = fieldErrors[fieldName];
    
    if (error && !error.isValid) {
      return 'border-red-500 focus:border-red-500';
    }
    
    // Check if field has value and is valid
    if (formData[fieldName as keyof typeof formData] && !error) {
      return 'border-green-500 focus:border-green-500';
    }
    
    return 'border-gray-300 focus:border-[#2D5D4F]';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (name === 'email') {
      validateEmailField(value);
    } else if (name === 'password') {
      validatePasswordField(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user: User | null = await login(formData.email, formData.password);
    if (user) {
      const redirectTo = searchParams.get('redirect');
      if (user.roles.includes('admin') && redirectTo === '/admin') {
        navigate('/admin', { replace: true });
      } else if (user.roles.includes('admin')) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true }); // Redirect to homepage for all non-admin users
      }
    }
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
        <h2 className="text-3xl font-extrabold text-deep-teal mb-2">مرحبًا بك في نافِع</h2>
        <p className="text-lg text-text-secondary text-center max-w-sm">منصة الخدمات الأسرع والأكثر أمانًا في مصر. سجّل دخولك وابدأ رحلتك!</p>
      </div>
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 bg-white/80 shadow-xl md:rounded-l-3xl">
        <div className="w-full max-w-md">
          <BaseCard className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-200">
            {/* No title at the top of the form card for minimalist look */}
            {/* General Error */}
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 mb-4 animate-fade-in">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="relative">
                <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2" htmlFor="email">البريد الإلكتروني</label>
                <div className="relative flex items-center">
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
                    aria-describedby="email-error"
                  />
                  <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-deep-teal pointer-events-none" />
                  {fieldErrors.email?.message && (
                    <AlertCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 animate-fade-in pointer-events-none" />
                  )}
                </div>
                {fieldErrors.email?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.email.message}</p>}
              </div>
              {/* Password Field */}
              <div className="relative">
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
                    autoComplete="current-password"
                    aria-describedby="password-error"
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
                {fieldErrors.password?.message && <p className="text-red-600 text-sm text-right mt-1 animate-fade-in">{fieldErrors.password.message}</p>}
              </div>
              {/* Forgot Password Link */}
              <div className="text-right mb-2">
                <Link to="#" className="text-sm font-medium text-[#2D5D4F] hover:text-[#F5A623] transition-colors duration-200 focus:outline-none focus:underline">هل نسيت كلمة المرور؟</Link>
              </div>
              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                disabled={!isFormValid()}
              >
                تسجيل الدخول
              </Button>
              {/* Form Status Helper */}
              {hasUserInteracted && !isFormComplete() && (
                <div className="text-amber-600 text-sm text-center bg-amber-50 p-3 rounded-lg border border-amber-200 animate-fade-in">يرجى ملء جميع الحقول المطلوبة</div>
              )}
              {hasUserInteracted && isFormComplete() && hasFormErrors() && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 animate-fade-in">يرجى تصحيح الأخطاء قبل المتابعة</div>
              )}
              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">أو</span>
                </div>
              </div>
              {/* Sign Up Link */}
              <div className="text-center">
                <span className="text-sm text-[#0e1b18]">ليس لديك حساب؟{' '}
                  <Link to="/register" className="font-bold text-[#2D5D4F] hover:text-[#F5A623] transition-colors duration-200 focus:outline-none focus:underline">أنشئ حساب</Link>
                </span>
              </div>
            </form>
          </BaseCard>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 