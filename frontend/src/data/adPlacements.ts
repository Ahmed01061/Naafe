export interface AdPlacement {
  id: string;
  name: string;
  type: 'top' | 'bottom' | 'sidebar' | 'interstitial';
  location: string;
  pricing: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  dimensions: {
    width: string;
    height: string;
    mobileWidth?: string;
    mobileHeight?: string;
  };
  maxAds: number;
  fallbackMessage: string;
  ctaText: string;
}

export const adPlacements: AdPlacement[] = [
  {
    id: 'homepage-top',
    name: 'البانر العلوي - الصفحة الرئيسية',
    type: 'top',
    location: 'homepage',
    pricing: {
      daily: 35,
      weekly: 200,
      monthly: 750
    },
    dimensions: {
      width: '100%',
      height: '90px',
      mobileWidth: '100%',
      mobileHeight: '90px'
    },
    maxAds: 6,
    fallbackMessage: 'أعلن هنا ووصل لأكبر عدد من المستخدمين',
    ctaText: 'اشتر الآن'
  },
  {
    id: 'homepage-bottom',
    name: 'البانر السفلي - الصفحة الرئيسية',
    type: 'bottom',
    location: 'homepage',
    pricing: {
      daily: 15,
      weekly: 90,
      monthly: 300
    },
    dimensions: {
      width: '100%',
      height: '90px',
      mobileWidth: '100%',
      mobileHeight: '90px'
    },
    maxAds: 6,
    fallbackMessage: 'اعرض إعلانك أسفل الصفحة الرئيسية',
    ctaText: 'اشتر الآن'
  },
  {
    id: 'categories-top',
    name: 'البانر العلوي - صفحة الفئات',
    type: 'top',
    location: 'categories',
    pricing: {
      daily: 35,
      weekly: 200,
      monthly: 750
    },
    dimensions: {
      width: '100%',
      height: '90px',
      mobileWidth: '100%',
      mobileHeight: '90px'
    },
    maxAds: 6,
    fallbackMessage: 'أعلن هنا ووصل للعملاء الباحثين عن خدماتك',
    ctaText: 'اشتر الآن'
  },
  {
    id: 'categories-bottom',
    name: 'البانر السفلي - صفحة الفئات',
    type: 'bottom',
    location: 'categories',
    pricing: {
      daily: 15,
      weekly: 90,
      monthly: 300
    },
    dimensions: {
      width: '100%',
      height: '90px',
      mobileWidth: '100%',
      mobileHeight: '90px'
    },
    maxAds: 6,
    fallbackMessage: 'اعرض إعلانك أسفل صفحة الفئات',
    ctaText: 'اشتر الآن'
  },
  {
    id: 'search-top',
    name: 'البانر العلوي - صفحة البحث',
    type: 'top',
    location: 'search',
    pricing: {
      daily: 35,
      weekly: 200,
      monthly: 750
    },
    dimensions: {
      width: '100%',
      height: '90px',
      mobileWidth: '100%',
      mobileHeight: '90px'
    },
    maxAds: 6,
    fallbackMessage: 'أعلن هنا ووصل للعملاء الباحثين',
    ctaText: 'اشتر الآن'
  },
  {
    id: 'search-bottom',
    name: 'البانر السفلي - صفحة البحث',
    type: 'bottom',
    location: 'search',
    pricing: {
      daily: 15,
      weekly: 90,
      monthly: 300
    },
    dimensions: {
      width: '100%',
      height: '90px',
      mobileWidth: '100%',
      mobileHeight: '90px'
    },
    maxAds: 6,
    fallbackMessage: 'اعرض إعلانك أسفل صفحة البحث',
    ctaText: 'اشتر الآن'
  },
  {
    id: 'categories-interstitial',
    name: 'إعلان داخلي - صفحة الفئات',
    type: 'interstitial',
    location: 'categories',
    pricing: {
      daily: 15,
      weekly: 90,
      monthly: 300
    },
    dimensions: {
      width: '100%',
      height: 'auto',
      mobileWidth: '100%',
      mobileHeight: 'auto'
    },
    maxAds: 4,
    fallbackMessage: 'أعلن هنا بين محتوى الفئات',
    ctaText: 'اشتر الآن'
  },
  {
    id: 'search-interstitial',
    name: 'إعلان داخلي - صفحة البحث',
    type: 'interstitial',
    location: 'search',
    pricing: {
      daily: 15,
      weekly: 90,
      monthly: 300
    },
    dimensions: {
      width: '100%',
      height: 'auto',
      mobileWidth: '100%',
      mobileHeight: 'auto'
    },
    maxAds: 4,
    fallbackMessage: 'أعلن هنا بين نتائج البحث',
    ctaText: 'اشتر الآن'
  }
];

export const getPlacementByLocation = (location: string, type: string): AdPlacement | undefined => {
  return adPlacements.find(placement => 
    placement.location === location && placement.type === type
  );
};

export const getPlacementsByLocation = (location: string): AdPlacement[] => {
  return adPlacements.filter(placement => placement.location === location);
}; 