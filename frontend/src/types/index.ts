export interface ServiceCategory {
  id: string;
  name: string;
  description?: string; // Add description field
  serviceCount: number;
  startingPrice: number;
  icon: React.ComponentType<{ className?: string }> | string; // Allow both component and string (for images)
  dateAdded?: string; // ISO date string for sorting by recently added
  numServices?: number;
  avgServicePrice?: number;
  numRequests?: number;
  avgRequestPrice?: number;
}

export interface ServiceProvider {
  id: string;
  providerId?: string; // Provider's user ID for navigation
  name: string;
  rating: number;
  category: string;
  description: string;
  title?: string;
  location: string;
  startingPrice: number;
  imageUrl: string;
  isPremium: boolean;
  isTopRated: boolean;
  completedJobs: number;
  isVerified: boolean;
  providerUpgradeStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  availability: {
    days: string[];
    timeSlots: string[];
  };
  budgetMin: number;
  budgetMax: number;
  memberSince: string;
  skills: string[];
  workingDays?: string[];
  startTime?: string;
  endTime?: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  location: string;
  postedBy: {
    id: string;
    name: string;
    avatar?: string;
    isPremium: boolean;
  };
  createdAt: string;
  preferredDate?: string;
  status: 'open' | 'accepted' | 'closed';
  category: string;
  urgency?: 'low' | 'medium' | 'high';
  availability: {
    days: string[];
    timeSlots: string[];
  };
}

export interface FilterState {
  search: string;
  location: string;
  priceRange: string;
  rating: string;
  category?: string;
  tab?: 'services' | 'requests';
  premiumOnly?: boolean;
  availability?: {
    days: string[];
    timeSlots: string[];
  };
  workingDays?: string[];
  timeRange?: [string, string];
}

export interface SortOption {
  value: string;
  label: string;
}

export interface User {
  id: string;
  name: { first: string; last: string };
  email: string;
  avatar?: string;
  avatarUrl?: string;
  isPremium?: boolean;
  isTopRated?: boolean;
  isVerified?: boolean;
  phone?: string;
  roles: ('admin' | 'seeker' | 'provider')[];
  profile?: {
    bio?: string;
    location?: {
      government?: string;
      city?: string;
      street?: string;
      apartmentNumber?: string;
      additionalInformation?: string;
    };
  };
  providerProfile?: {
    rating?: number;
    reviewCount?: number;
    totalJobsCompleted?: number;
    totalEarnings?: number;
    verification?: { status: string; method: string | null; documents: string[] };
    skills?: string[];
    location?: { city: string; government: string };
  };
}