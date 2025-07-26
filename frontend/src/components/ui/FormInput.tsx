
import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'search' | 'admin';
  size?: 'sm' | 'md' | 'lg';
  required?: boolean;
  containerClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({
    label,
    error,
    success,
    helperText,
    icon,
    variant = 'default',
    size = 'md',
    required = false,
    containerClassName = '',
    className = '',
    disabled = false,
    id,
    type,
    value,
    onChange,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    const baseClasses = 'w-full rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-deep-teal/40 focus:border-deep-teal shadow-md';

    const variantClasses = {
      default: cn(
        'border-2 border-gray-300 bg-white text-text-primary placeholder:text-gray-500 hover:border-gray-400 focus:border-deep-teal focus:bg-white hover:shadow-lg focus:shadow-xl',
        disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-75 border-gray-200'
      ),
      search: cn(
        'pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-deep-teal/40 focus:border-deep-teal transition-all duration-200 bg-white text-text-primary placeholder:text-gray-500 hover:border-gray-400 hover:shadow-lg focus:shadow-xl'
      ),
      admin: cn(
        'border border-gray-300 rounded-lg text-right transition-all duration-200 shadow-md',
        error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/40 hover:border-red-500' : 'border-gray-300 hover:border-gray-400 focus:border-deep-teal hover:shadow-lg focus:shadow-xl',
        disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-75 border-gray-200'
      )
    };

    const stateClasses = cn(
      error && 'border-red-500 focus:border-red-500 focus:ring-red-500/40',
      success && 'border-green-500 focus:border-green-500 focus:ring-green-500/40',
      disabled && 'cursor-not-allowed'
    );

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-2',
              variant === 'admin' ? 'text-deep-teal text-right' : 'text-text-primary'
            )}
          >
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && variant === 'default' && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            className={cn(
              baseClasses,
              sizeClasses[size],
              variantClasses[variant],
              stateClasses,
              icon && variant === 'default' ? 'pl-10' : '',
              className
            )}
            disabled={disabled}
            type={type}
            value={value}
            onChange={onChange}
            {...props}
          />
          
          {/* Status Icons */}
          {error && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
          
          {success && !error && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>
        
        {/* Helper Text */}
        {error && (
          <p className={cn(
            'mt-1 text-sm text-red-600',
            variant === 'admin' ? 'text-right' : ''
          )}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className={cn(
            'mt-1 text-sm text-text-secondary',
            variant === 'admin' ? 'text-right' : ''
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput; 