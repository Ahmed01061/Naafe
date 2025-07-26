
import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/helpers';
import Button from './Button';
import { FilterState } from '../../types';
import { EGYPT_GOVERNORATES, PRICE_RANGES } from '../../utils/constants';
import { SearchTab } from './SearchTabs';
import { FormInput } from './';
import UnifiedSelect from './UnifiedSelect';
import { TimePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import arEG from 'antd/locale/ar_EG';

interface FilterFormProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  onSearch?: (query: string) => void;
  variant?: 'inline' | 'sidebar';
  className?: string;
  activeTab?: SearchTab;
}

const FilterForm = ({
  filters,
  onFiltersChange,
  onClearFilters,
  onSearch,
  variant = 'inline',
  className,
  activeTab = 'services'
}: FilterFormProps) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const handleInputChange = (field: keyof FilterState, value: string | boolean | { days: string[]; timeSlots: string[] }) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchQuery = filters.search.trim();
    if (searchQuery && onSearch) {
      onSearch(searchQuery);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

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

  if (variant === 'sidebar') {
    return (
      <div className={cn('bg-white rounded-lg p-6 shadow-sm', className)}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">المرشحات</h2>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-deep-teal hover:text-deep-teal/80 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              مسح الكل
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              البحث
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary h-4 w-4 search-icon" />
              <FormInput
                type="text"
                placeholder={activeTab === 'services' ? "البحث عن الخدمات..." : "البحث عن طلبات الخدمات..."}
                value={filters.search}
                onChange={(e) => handleInputChange('search', e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              الفئة
            </label>
            <UnifiedSelect
              value={filters.category || ''}
              onChange={val => handleInputChange('category', val)}
              options={[
                { value: '', label: 'جميع الفئات' },
                ...categories.map((cat) => ({ value: cat, label: cat }))
              ]}
              disabled={categoriesLoading}
              placeholder="اختر الفئة"
              size="md"
            />
            {categoriesError && <div className="text-red-600 text-sm text-right bg-red-50 p-2 rounded-lg border border-red-200 mt-2">{categoriesError}</div>}
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              المحافظة
            </label>
            <UnifiedSelect
              value={filters.location}
              onChange={val => handleInputChange('location', val)}
              options={[
                { value: '', label: 'جميع المحافظات' },
                ...EGYPT_GOVERNORATES.map((gov) => ({ value: gov.id, label: gov.name }))
              ]}
              placeholder="اختر المحافظة"
              size="md"
              isSearchable
              searchPlaceholder="ابحث عن محافظة..."
            />
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              حدود السعر
            </label>
            <UnifiedSelect
              value={filters.priceRange}
              onChange={val => handleInputChange('priceRange', val)}
              options={[
                { value: '', label: 'جميع الأسعار' },
                ...Object.entries(PRICE_RANGES).map(([key, range]) => ({
                  value: key.toLowerCase(),
                  label: range.label
                }))
              ]}
              placeholder="اختر حدود السعر"
              size="md"
            />
          </div>

          {/* Rating Filter - Only for Services */}
          {activeTab === 'services' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                الحد الأدنى للتقييم
              </label>
              <UnifiedSelect
                value={filters.rating}
                onChange={val => handleInputChange('rating', val)}
                options={[
                  { value: '', label: 'أي تقييم' },
                  { value: '4+', label: '4+ نجوم' },
                  { value: '3+', label: '3+ نجوم' },
                  { value: 'any', label: 'أي تقييم' }
                ]}
                placeholder="اختر التقييم"
                size="md"
              />
            </div>
          )}

          {/* Premium Filter */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={filters.premiumOnly || false}
                onChange={(e) => handleInputChange('premiumOnly', e.target.checked ? 'true' : '')}
              />
              <span className="text-sm font-medium text-text-primary">
                عرض المستخدمين المميزين فقط
              </span>
            </label>
          </div>

          {activeTab === 'services' && (
            <>
              {/* Working Days Filter (for providers) */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  أيام العمل
                </label>
                <div className="flex flex-wrap gap-2">
                  {['saturday','sunday','monday','tuesday','wednesday','thursday','friday'].map(day => (
                    <label
                      key={day}
                      className={
                        `flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors cursor-pointer select-none
                        ${filters.workingDays?.includes(day)
                          ? 'bg-deep-teal/90 border-deep-teal text-white'
                          : 'bg-white border-gray-300 text-deep-teal hover:bg-deep-teal/10'}
                        text-base font-semibold`
                      }
                      style={{ minWidth: '90px' }}
                    >
                      <input
                        type="checkbox"
                        checked={filters.workingDays?.includes(day) || false}
                        onChange={e => {
                          const newDays = e.target.checked
                            ? [...(filters.workingDays || []), day]
                            : (filters.workingDays || []).filter(d => d !== day);
                          onFiltersChange({ ...filters, workingDays: newDays });
                        }}
                        className="w-5 h-5 accent-[#2D5D4F] border-2 border-gray-400 rounded focus:ring-2 focus:ring-accent focus:ring-offset-2"
                        style={{ accentColor: filters.workingDays?.includes(day) ? '#fff' : '#2D5D4F' }}
                      />
                      <span className="ml-1">
                        {{
                          saturday: 'السبت',
                          sunday: 'الأحد',
                          monday: 'الاثنين',
                          tuesday: 'الثلاثاء',
                          wednesday: 'الأربعاء',
                          thursday: 'الخميس',
                          friday: 'الجمعة'
                        }[day]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Work Time Range Filter (for providers) */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  وقت العمل
                </label>
                <ConfigProvider locale={arEG}>
                  <TimePicker.RangePicker
                    format={value => {
                      if (!value) return '';
                      const hour = value.hour();
                      const minute = value.minute().toString().padStart(2, '0');
                      const isAM = hour < 12;
                      let displayHour = hour % 12;
                      if (displayHour === 0) displayHour = 12;
                      return `${displayHour}:${minute} ${isAM ? 'ص' : 'م'}`;
                    }}
                    use12Hours
                    showSecond={false}
                    value={filters.timeRange && filters.timeRange.length === 2 ? [dayjs(filters.timeRange[0], 'HH:mm'), dayjs(filters.timeRange[1], 'HH:mm')] : null}
                    onChange={val => {
                      onFiltersChange({
                        ...filters,
                        timeRange: val && val.length === 2 && val[0] && val[1]
                          ? [val[0].format('HH:mm'), val[1].format('HH:mm')]
                          : undefined
                      });
                    }}
                    allowClear
                    minuteStep={5}
                    size="large"
                    className="bg-white border-2 border-gray-300 rounded-lg py-2 pr-3 pl-3 focus:ring-2 focus:ring-accent focus:border-accent text-right text-black custom-timepicker-contrast"
                    classNames={{ popup: { root: 'rtl' } }}
                    style={{ direction: 'rtl' }}
                    placeholder={["من", "إلى"]}
                  />
                </ConfigProvider>
              </div>
            </>
          )}
          {activeTab === 'requests' && (
            <>
              {/* Only show filters relevant to seekers here (e.g., category, location, price, etc.) */}
              {/* Remove working days and time range filters for seekers */}
            </>
          )}
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={cn('rounded-2xl bg-white/80 backdrop-blur-lg shadow-lg sticky top-20 z-40 mb-8', className)}>
      <div className="card-body p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-center">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-5 w-5 text-text-secondary search-icon" />
            </div>
            <FormInput
              type="text"
              placeholder={activeTab === 'services' ? "البحث عن الخدمات..." : "البحث عن طلبات الخدمات..."}
              value={filters.search}
              onChange={(e) => handleInputChange('search', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const searchQuery = filters.search.trim();
                  if (searchQuery && onSearch) {
                    onSearch(searchQuery);
                  }
                }
              }}
            />
          </div>
          
          <UnifiedSelect
            value={filters.location}
            onChange={val => handleInputChange('location', val)}
            options={[
              { value: '', label: 'جميع المحافظات' },
              ...EGYPT_GOVERNORATES.map((gov) => ({ value: gov.id, label: gov.name }))
            ]}
            placeholder="اختر المحافظة"
            size="md"
            isSearchable
            searchPlaceholder="ابحث عن محافظة..."
          />
          
          <UnifiedSelect
            value={filters.priceRange}
            onChange={val => handleInputChange('priceRange', val)}
            options={[
              { value: '', label: 'جميع الأسعار' },
              ...Object.entries(PRICE_RANGES).map(([key, range]) => ({
                value: key.toLowerCase(),
                label: range.label
              }))
            ]}
            placeholder="حدود السعر"
            size="md"
          />
          
          <div className="flex items-center justify-between gap-2">
            <UnifiedSelect
              value={filters.rating}
              onChange={val => handleInputChange('rating', val)}
              options={[
                { value: '', label: 'أي تقييم' },
                { value: '4+', label: '4+ نجوم' },
                { value: '3+', label: '3+ نجوم' },
                { value: 'any', label: 'أي تقييم' }
              ]}
              placeholder="اختر التقييم"
              size="md"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClearFilters();
              }}
              className="text-text-secondary hover:text-deep-teal"
            >
              مسح
            </Button>
          </div>

          <Button
            type="submit"
            variant="primary"
          >
            بحث
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FilterForm; 