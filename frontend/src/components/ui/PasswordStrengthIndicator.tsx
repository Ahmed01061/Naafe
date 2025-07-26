import React from 'react';
import { getPasswordStrength } from '../../utils/validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  className = '' 
}) => {
  if (!password) return null;

  const { strength, score } = getPasswordStrength(password);
  
  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'weak': return 'كلمة المرور ضعيفة';
      case 'medium': return 'كلمة المرور متوسطة';
      case 'strong': return 'كلمة المرور قوية';
      default: return '';
    }
  };

  const getStrengthTextColor = () => {
    switch (strength) {
      case 'weak': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'strong': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(score / 6) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium whitespace-nowrap ${getStrengthTextColor()}`}>{getStrengthText()}</span>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator; 