// Common utility functions

/**
 * Class name utility for conditional classes
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Format price with currency symbol
 */
export const formatPrice = (price: number, currency: string = '$'): string => {
  return `${currency}${price}`;
};

/**
 * Format price range for display
 */
export const formatPriceRange = (min?: number, max?: number): string => {
  if (min && max) {
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  } else if (min) {
    return `${formatPrice(min)}+`;
  } else if (max) {
    return `Up to ${formatPrice(max)}`;
  }
  return 'Price varies';
};

/**
 * Generate star rating display
 */
export const generateStarRating = (rating: number, maxRating: number = 5): {
  fullStars: number;
  hasHalfStar: boolean;
  emptyStars: number;
} => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = maxRating - Math.ceil(rating);

  return {
    fullStars,
    hasHalfStar,
    emptyStars
  };
};

/**
 * Debounce function for search inputs
 */
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

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (text: string): string => {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Generate a slug from text
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Check if a value is within a price range
 */
export const isInPriceRange = (
  price: number,
  range: { min?: number; max?: number }
): boolean => {
  if (range.min && price < range.min) return false;
  if (range.max && price > range.max) return false;
  return true;
};

/**
 * Local storage utilities
 */
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}; 

// Category translation mapping
const categoryTranslations: Record<string, string> = {
  'Cleaning': 'التنظيف',
  'Tutoring': 'الدراسة',
  'Photography': 'التصوير',
  'Home Repair': 'إصلاح المنزل',
  'Landscaping': 'تنسيق الحدائق',
  'Event Planning': 'تخطيط الفعاليات',
  'Personal Training': 'التدريب الشخصي',
  'Pet Care': 'رعاية الحيوانات الأليفة'
};

// Location translation mapping
const locationTranslations: Record<string, string> = {
  'New York, NY': 'نيويورك، نيويورك',
  'Los Angeles, CA': 'لوس أنجلوس، كاليفورنيا',
  'Chicago, IL': 'شيكاغو، إلينوي',
  'Austin, TX': 'أوستن، تكساس',
  'San Francisco, CA': 'سان فرانسيسكو، كاليفورنيا'
};

/**
 * Translates category names from English to Arabic for display
 * @param category - English category name
 * @returns Arabic category name
 */
export const translateCategory = (category: string): string => {
  return categoryTranslations[category] || category;
};

/**
 * Translates Arabic category back to English for internal logic
 * @param arabicCategory - Arabic category name
 * @returns English category name
 */
export const translateCategoryToEnglish = (arabicCategory: string): string => {
  const englishCategory = Object.entries(categoryTranslations).find(
    ([, arabic]) => arabic === arabicCategory
  )?.[0];
  return englishCategory || arabicCategory;
};

/**
 * Translates location names from English to Arabic for display
 * @param location - English location name
 * @returns Arabic location name
 */
export const translateLocation = (location: string): string => {
  return locationTranslations[location] || location;
};

/**
 * Translates Arabic location back to English for internal logic
 * @param arabicLocation - Arabic location name
 * @returns English location name
 */
export const translateLocationToEnglish = (arabicLocation: string): string => {
  const englishLocation = Object.entries(locationTranslations).find(
    ([, arabic]) => arabic === arabicLocation
  )?.[0];
  return englishLocation || arabicLocation;
}; 

/**
 * Fetch wrapper with authentication
 */
export const fetchWithAuth = async (url: string, token: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}; 