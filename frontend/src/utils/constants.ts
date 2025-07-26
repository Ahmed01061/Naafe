// Application constants and configuration

export const APP_CONFIG = {
  name: "نافع",
  description: "ابحث عن المساعدة التي تحتاجها من محترفينا المحليين الموثوقين",
  version: "1.0.0"
};

export const ROUTES = {
  HOME: "/",
  CATEGORIES: "/categories",
  SEARCH: "/search",
  PROVIDER_DETAILS: "/provider/:id",
  SERVICES: "/services",
  BUSINESS: "/business",
  EXPLORE: "/explore"
} as const;

// Egyptian governorates with their Arabic names
export const EGYPT_GOVERNORATES = [
  { id: 'cairo', name: 'القاهرة' },
  { id: 'giza', name: 'الجيزة' },
  { id: 'alexandria', name: 'الإسكندرية' },
  { id: 'dakahlia', name: 'الدقهلية' },
  { id: 'sharqia', name: 'الشرقية' },
  { id: 'qalyubia', name: 'القليوبية' },
  { id: 'gharbia', name: 'الغربية' },
  { id: 'menoufia', name: 'المنوفية' },
  { id: 'beheira', name: 'البحيرة' },
  { id: 'ismailia', name: 'الإسماعيلية' },
  { id: 'port-said', name: 'بورسعيد' },
  { id: 'suez', name: 'السويس' },
  { id: 'fayoum', name: 'الفيوم' },
  { id: 'beni-suef', name: 'بني سويف' },
  { id: 'minya', name: 'المنيا' },
  { id: 'asyut', name: 'أسيوط' },
  { id: 'sohag', name: 'سوهاج' },
  { id: 'qena', name: 'قنا' },
  { id: 'aswan', name: 'أسوان' },
  { id: 'luxor', name: 'الأقصر' },
  { id: 'red-sea', name: 'البحر الأحمر' },
  { id: 'new-valley', name: 'الوادي الجديد' },
  { id: 'matrouh', name: 'مطروح' },
  { id: 'north-sinai', name: 'شمال سيناء' },
  { id: 'south-sinai', name: 'جنوب سيناء' },
  { id: 'damietta', name: 'دمياط' },
  { id: 'kafr-el-sheikh', name: 'كفر الشيخ' }
] as const;

// Mapping of governorate IDs to their main cities (in Arabic)
export const EGYPT_CITIES: Record<string, string[]> = {
  cairo: ['القاهرة', 'حلوان', 'مدينتي', 'الشروق', 'العبور', 'بدر', '15 مايو'],
  giza: ['الجيزة', '6 أكتوبر', 'الشيخ زايد', 'الحوامدية', 'البدرشين', 'العياط', 'أوسيم', 'كرداسة', 'أبو النمرس', 'منشأة القناطر'],
  alexandria: ['الإسكندرية', 'برج العرب', 'العجمي', 'سيدي بشر', 'المنتزه', 'محرم بك'],
  dakahlia: ['المنصورة', 'طلخا', 'ميت غمر', 'دكرنس', 'منية النصر', 'الجمالية', 'شربين', 'بلقاس'],
  sharqia: ['الزقازيق', 'العاشر من رمضان', 'بلبيس', 'منيا القمح', 'فاقوس', 'أبو كبير', 'ههيا', 'أبو حماد'],
  qalyubia: ['بنها', 'شبرا الخيمة', 'قليوب', 'القناطر الخيرية', 'طوخ', 'الخانكة', 'كفر شكر'],
  gharbia: ['طنطا', 'المحلة الكبرى', 'كفر الزيات', 'زفتى', 'السنطة', 'سمنود', 'بسيون'],
  menoufia: ['شبين الكوم', 'منوف', 'السادات', 'أشمون', 'الباجور', 'بركة السبع', 'تلا'],
  beheira: ['دمنهور', 'كفر الدوار', 'إيتاي البارود', 'أبو حمص', 'الدلنجات', 'المحمودية', 'رشيد'],
  ismailia: ['الإسماعيلية', 'فايد', 'القنطرة شرق', 'القنطرة غرب', 'التل الكبير'],
  'port-said': ['بورسعيد', 'بورفؤاد'],
  suez: ['السويس', 'عتاقة', 'الجناين'],
  fayoum: ['الفيوم', 'سنورس', 'إطسا', 'طامية', 'يوسف الصديق'],
  'beni-suef': ['بني سويف', 'الواسطى', 'ناصر', 'إهناسيا', 'ببا', 'سمسطا'],
  minya: ['المنيا', 'ملوي', 'بني مزار', 'مطاي', 'سمالوط', 'أبو قرقاص'],
  asyut: ['أسيوط', 'ديروط', 'منفلوط', 'القوصية', 'أبنوب', 'أبو تيج'],
  sohag: ['سوهاج', 'طهطا', 'طما', 'جرجا', 'المراغة', 'أخميم'],
  qena: ['قنا', 'نجع حمادي', 'دشنا', 'قفط', 'قوص', 'نقادة'],
  aswan: ['أسوان', 'دراو', 'كوم أمبو', 'إدفو', 'نصر النوبة'],
  luxor: ['الأقصر', 'إسنا', 'أرمنت', 'الزينية', 'البياضية'],
  'red-sea': ['الغردقة', 'رأس غارب', 'سفاجا', 'القصير', 'مرسى علم'],
  'new-valley': ['الخارجة', 'الداخلة', 'الفرافرة', 'باريس'],
  matrouh: ['مرسى مطروح', 'الحمام', 'العلمين', 'النجيلة', 'سيدي براني', 'السلوم'],
  'north-sinai': ['العريش', 'رفح', 'الشيخ زويد', 'بئر العبد'],
  'south-sinai': ['شرم الشيخ', 'دهب', 'نويبع', 'طابا', 'سانت كاترين', 'أبو رديس'],
  damietta: ['دمياط', 'رأس البر', 'فارسكور', 'الزرقا', 'كفر سعد'],
  'kafr-el-sheikh': ['كفر الشيخ', 'دسوق', 'سيدي سالم', 'الحامول', 'بلطيم', 'بيلا']
};

// Updated price ranges in EGP
export const PRICE_RANGES = {
  VERY_LOW: { min: 0, max: 100, label: 'حتى 100 جنيه' },
  LOW: { min: 100, max: 300, label: '100 - 300 جنيه' },
  MEDIUM: { min: 300, max: 500, label: '300 - 500 جنيه' },
  HIGH: { min: 500, max: 1000, label: '500 - 1000 جنيه' },
  VERY_HIGH: { min: 1000, max: null, label: 'أكثر من 1000 جنيه' }
} as const;

export const RATING_OPTIONS = [
  { value: "4", label: "4+ نجوم" },
  { value: "4.5", label: "4.5+ نجوم" },
  { value: "5", label: "5 نجوم" }
] as const;

export const LOCATIONS = [
  "New York, NY",
  "Los Angeles, CA", 
  "Chicago, IL",
  "Austin, TX",
  "San Francisco, CA"
] as const;

export const CATEGORIES = [
  "التنظيف",
  "الدراسة", 
  "التصوير",
  "إصلاح المنزل",
  "تنسيق الحدائق"
] as const;

// Local storage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: "naafe_user_preferences",
  SEARCH_HISTORY: "naafe_search_history",
  RECENT_VIEWS: "naafe_recent_views"
} as const;

// API endpoints (for future integration)
export const API_ENDPOINTS = {
  CATEGORIES: "/api/categories",
  PROVIDERS: "/api/providers",
  REQUESTS: "/api/requests",
  SEARCH: "/api/search",
  PROVIDER_DETAILS: "/api/providers/:id",
  REQUEST_DETAILS: "/api/requests/:id",
  POST_REQUEST: "/api/requests"
} as const; 