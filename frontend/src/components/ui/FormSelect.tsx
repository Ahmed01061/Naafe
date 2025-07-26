import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  options: Option[];
  variant?: 'default' | 'admin';
  size?: 'sm' | 'md' | 'lg';
  required?: boolean;
  containerClassName?: string;
  placeholder?: string;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      options,
      variant = 'default',
      size = 'md',
      required = false,
      containerClassName = '',
      className = '',
      disabled = false,
      id,
      placeholder,
      ...props
    },
    ref
  ) => {
    const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const baseClasses = 'w-full rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-deep-teal/40 focus:border-deep-teal shadow-md';

    const variantClasses = {
      default: cn(
        'border-2 border-gray-300 bg-white text-text-primary placeholder:text-gray-500 hover:border-gray-400 focus:border-deep-teal focus:bg-white hover:shadow-lg focus:shadow-xl',
        disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-75 border-gray-200'
      ),
      admin: cn(
        'border-2 border-gray-300 rounded-lg text-right transition-all duration-200 shadow-md',
        error
          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20 hover:border-red-500'
          : 'border-gray-300 bg-white hover:border-gray-400 focus:border-deep-teal hover:shadow-lg focus:shadow-xl',
        disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-75 border-gray-200'
      ),
    };

    const stateClasses = cn(
      error && 'border-red-500 focus:border-red-500 focus:ring-red-500/40',
      success && 'border-green-500 focus:border-green-500 focus:ring-green-500/40',
      disabled && 'cursor-not-allowed'
    );

    return (
      <div className={cn('w-full', containerClassName)}>
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
          <select
            id={inputId}
            ref={ref}
            className={cn(
              baseClasses,
              sizeClasses[size],
              variantClasses[variant],
              stateClasses,
              'appearance-none pr-10', // Hide native arrow, add space for custom icon
              className
            )}
            disabled={disabled}
            {...props}
          >
            <option value="">{placeholder || 'اختر...'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 h-5 w-5 text-gray-400" style={{ zIndex: 2 }} />

          {/* Status Icons */}
          {error && (
            <div className="absolute top-3 left-3 pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
          {success && !error && (
            <div className="absolute top-3 left-3 pointer-events-none">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>

        {/* Helper Text */}
        {error && (
          <p className={cn('mt-1 text-sm text-red-600', variant === 'admin' ? 'text-right' : '')}>{error}</p>
        )}
        {helperText && !error && (
          <p className={cn('mt-1 text-sm text-text-secondary', variant === 'admin' ? 'text-right' : '')}>{helperText}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

export default FormSelect; 