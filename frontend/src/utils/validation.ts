// Validation utility functions for frontend forms

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export interface FieldValidation {
  [key: string]: ValidationResult;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, message: 'البريد الإلكتروني مطلوب' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'البريد الإلكتروني غير صحيح' };
  }
  
  return { isValid: true, message: '' };
};

// Password validation (matching backend requirements)
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, message: 'كلمة المرور مطلوبة' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }
  
  // Check for at least one uppercase letter, one lowercase letter, one number, and one special character
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  if (!hasUpperCase) {
    return { isValid: false, message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل' };
  }
  
  if (!hasLowerCase) {
    return { isValid: false, message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل' };
  }
  
  if (!hasNumbers) {
    return { isValid: false, message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' };
  }
  
  if (!hasSpecialChar) {
    return { isValid: false, message: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (@$!%*?&)' };
  }
  
  return { isValid: true, message: '' };
};

// Phone validation (Egyptian phone numbers)
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, message: 'رقم الهاتف مطلوب' };
  }
  
  const phoneRegex = /^(\+20|0)?1[0125][0-9]{8}$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, message: 'رقم الهاتف غير صحيح (يجب أن يكون رقم مصري صحيح)' };
  }
  
  return { isValid: true, message: '' };
};

// Name validation
export const validateName = (name: string, fieldName: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, message: `${fieldName} مطلوب` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, message: `${fieldName} يجب أن يكون حرفين على الأقل` };
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, message: `${fieldName} يجب أن يكون 50 حرف كحد أقصى` };
  }
  
  // Check if name contains only letters (Arabic and English)
  const lettersOnlyRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z]+$/;
  if (!lettersOnlyRegex.test(name.trim())) {
    return { isValid: false, message: `${fieldName} يجب أن يحتوي على أحرف فقط (بدون أرقام أو رموز خاصة)` };
  }
  
  return { isValid: true, message: '' };
};

// Password confirmation validation
export const validatePasswordConfirmation = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, message: 'تأكيد كلمة المرور مطلوب' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, message: 'كلمتا المرور غير متطابقتين' };
  }
  
  return { isValid: true, message: '' };
};

// Real-time availability checking
export const checkAvailability = async (email?: string, phone?: string): Promise<{
  email?: { available: boolean; message: string };
  phone?: { available: boolean; message: string };
}> => {
  try {
    // Only check if we have valid values to check
    const payload: { email?: string; phone?: string } = {};
    
    if (email && email.trim()) {
      payload.email = email.trim();
    }
    
    if (phone && phone.trim()) {
      payload.phone = phone.trim();
    }
    
    // Don't make API call if no valid data to check
    if (!payload.email && !payload.phone) {
      return {};
    }

    const response = await fetch('/api/auth/check-availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data;
    } else {
      const errorData = await response.json();
      console.error('Availability check failed:', errorData);
      throw new Error('فشل في التحقق من التوفر');
    }
  } catch (error) {
    console.error('Availability check error:', error);
    return {
      email: { available: false, message: 'فشل في التحقق من البريد الإلكتروني' },
      phone: { available: false, message: 'فشل في التحقق من رقم الهاتف' },
    };
  }
};

// Debounce function for real-time validation
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Password strength indicator
export const getPasswordStrength = (password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
} => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push('يجب أن تكون 8 أحرف على الأقل');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('أضف حرف كبير');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('أضف حرف صغير');

  if (/\d/.test(password)) score += 1;
  else feedback.push('أضف رقم');

  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push('أضف رمز خاص (@$!%*?&)');

  if (password.length >= 12) score += 1;

  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else strength = 'strong';

  return { strength, score, feedback };
};

// Form validation helper
export const validateRegistrationForm = (formData: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}): FieldValidation => {
  const errors: FieldValidation = {};

  // Validate names
  const firstNameValidation = validateName(formData.firstName, 'الاسم الأول');
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation;
  }

  const lastNameValidation = validateName(formData.lastName, 'اسم العائلة');
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation;
  }

  // Validate email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation;
  }

  // Validate phone
  const phoneValidation = validatePhone(formData.phoneNumber);
  if (!phoneValidation.isValid) {
    errors.phoneNumber = phoneValidation;
  }

  // Validate password
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation;
  }

  // Validate password confirmation
  const confirmPasswordValidation = validatePasswordConfirmation(formData.password, formData.confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation;
  }

  return errors;
}; 