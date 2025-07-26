import React, { useState } from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { FormInput } from './';

interface UnifiedSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isSearchable?: boolean;
  searchPlaceholder?: string;
}

const UnifiedSelect: React.FC<UnifiedSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  size = 'md',
  isSearchable = false,
  searchPlaceholder = 'ابحث...'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-deep-teal text-right">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={cn(
              'w-full border-2 border-gray-300 bg-white text-text-primary placeholder:text-gray-500 hover:border-gray-400 focus:border-deep-teal focus:bg-white hover:shadow-lg focus:shadow-xl rounded-lg shadow-md transition-all duration-200 flex items-center justify-between',
              sizeClasses[size],
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/40',
              disabled && 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-75 border-gray-200',
            )}
          >
            <span className={cn(
              !selectedOption ? 'text-gray-500' : 'text-[#0e1b18]',
              'truncate flex-1 text-right'
            )}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown className="h-5 w-5 ml-2 text-gray-400 flex-shrink-0" />
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto focus:outline-none py-1">
            {isSearchable && (
              <div className="sticky top-0 bg-white px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <FormInput
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="text-right"
                    icon={<Search className="h-4 w-4" />}
                    size="sm"
                  />
                </div>
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="text-center py-2 text-sm text-gray-500">
                لا توجد نتائج
              </div>
            ) : (
              <>
                {value !== '' && (
                  <Listbox.Option
                    value=""
                    className={({ active }) =>
                      cn(
                        'px-4 py-2 cursor-pointer select-none text-right',
                        active ? 'bg-soft-teal/10 text-deep-teal' : 'text-[#0e1b18]'
                      )
                    }
                  >
                    {placeholder}
                  </Listbox.Option>
                )}
                {filteredOptions.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                    className={({ active, selected }) =>
                      cn(
                        'px-4 py-2 cursor-pointer select-none text-right',
                        active ? 'bg-soft-teal/10 text-deep-teal' : 'text-[#0e1b18]',
                        selected && 'font-semibold bg-soft-teal/20 border-r-4 border-deep-teal'
                      )
                    }
                  >
                    {({ selected }) => (
                      <div className="flex items-center justify-between">
                        <span className="truncate flex-1">{option.label}</span>
                        {selected && <Check className="h-4 w-4 text-deep-teal ml-2" />}
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </>
            )}
          </Listbox.Options>
        </div>
      </Listbox>
      {error && (
        <p className="mt-1 text-sm text-red-600 text-right">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-text-secondary text-right">{helperText}</p>
      )}
    </div>
  );
};

export default UnifiedSelect; 