import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import FilterForm from '../components/ui/FilterForm';
import ServiceCard from '../components/ServiceCard';
import ServiceRequestCard from '../components/ServiceRequestCard';
import Button from '../components/ui/Button';
import BaseCard from '../components/ui/BaseCard';
import { useQuery } from '@tanstack/react-query';
import { FilterState } from '../types';
import { useUrlParams } from '../hooks/useUrlParams';
import { useAuth } from '../contexts/AuthContext';
import { Search, Users, FileText, ArrowLeft, CheckCircle } from 'lucide-react';
import AdPlacement from '../components/ui/AdPlacement';

const fetchListings = async (filters: FilterState) => {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.premiumOnly) params.set('premiumOnly', 'true');
  // Add more filters as needed (location, price, etc.)
  const res = await fetch(`/api/listings/listings?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'فشل تحميل الخدمات');
  return json.data.listings || json.data.items || [];
};

const fetchRequests = async (filters: FilterState) => {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  // Add more filters as needed (location, price, etc.)
  const res = await fetch(`/api/requests?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'فشل تحميل الطلبات');
  return json.data.requests || json.data.jobRequests || json.data.items || [];
};

type SearchType = 'providers' | 'service-requests' | null;

// Add a minimal JobRequest type for targeted leads
interface JobRequestLead {
  _id: string;
  title: string;
  description: string;
  category: string;
  location?: { government?: string; city?: string };
  budget?: { min?: number; max?: number };
  createdAt?: string;
  seeker?: { avatarUrl?: string; isVerified?: boolean };
  requiredSkills?: string[];
}

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, accessToken } = useAuth();
  const { getFiltersFromUrl, updateFiltersInUrl } = useUrlParams();
  
  // Determine search type from URL
  const getSearchTypeFromUrl = (): SearchType => {
    if (location.pathname.includes('/providers')) return 'providers';
    if (location.pathname.includes('/service-requests')) return 'service-requests';
    return null;
  };

  const [searchType, setSearchType] = useState<SearchType>(getSearchTypeFromUrl());
  const [filters, setFilters] = useState<FilterState>(getFiltersFromUrl());
  const { data: listings = [], isLoading: listingsLoading, error: listingsError } = useQuery({
    queryKey: ['listings', filters],
    queryFn: () => fetchListings(filters),
  });
  const { data: requests = [], isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['requests', filters],
    queryFn: () => fetchRequests(filters),
  });
  const [providerOfferRequestIds, setProviderOfferRequestIds] = useState<string[]>([]);

  const isProvider = user?.roles?.includes('provider');
  const isPremium = !!user?.isPremium;
  // Targeted Leads state
  const [leads, setLeads] = useState<JobRequestLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadFilters, setLeadFilters] = useState({ minBudget: '', maxBudget: '', government: '', city: '' });

  // Add express interest state
  const [interestSuccess, setInterestSuccess] = useState<string | null>(null);
  const handleExpressInterest = (leadId: string) => {
    setInterestSuccess('تم إرسال اهتمامك بنجاح! سيتم إعلام صاحب الطلب.');
    setTimeout(() => setInterestSuccess(null), 2500);
    // In a real implementation, you would POST to an endpoint here
  };

  // Update search type when URL changes
  useEffect(() => {
    setSearchType(getSearchTypeFromUrl());
  }, [location.pathname]);

  // Change mappedProviders to be async and use Promise.all
  const [resolvedProviders, setResolvedProviders] = useState<any[]>([]);
  useEffect(() => {
    const fetchProvidersWithStats = async () => {
      const providers = await Promise.all((listings as unknown[]).map(async (listing: unknown) => {
        const l = listing as Record<string, unknown>;
        let providerName = 'مزود خدمة غير معروف';
        let memberSince = '';
        let address = '';
        let budgetMin = 0;
        let budgetMax = 0;
        let providerId = '';
        let provider: Record<string, unknown> = {};
        if (l.provider && typeof l.provider === 'object' && 'name' in l.provider) {
          provider = l.provider as Record<string, unknown>;
          providerId = provider._id as string || '';
          if (provider.name && typeof provider.name === 'object' && provider.name !== null) {
            const nameObj = provider.name as { first?: string; last?: string };
            providerName = `${nameObj.first || ''} ${nameObj.last || ''}`.trim() || providerName;
          } else if (typeof provider.name === 'string') {
            providerName = provider.name;
          }
          if ('createdAt' in provider && typeof provider.createdAt === 'string') {
            memberSince = provider.createdAt;
          }
        }
        if (l.location && typeof l.location === 'object') {
          const loc = l.location as Record<string, unknown>;
          const gov = loc.government as string || '';
          const city = loc.city as string || '';
          address = [gov, city].filter(Boolean).join('، ');
        }
        if (!address) address = 'غير محدد';
        if (l.budget && typeof l.budget === 'object') {
          budgetMin = (l.budget as Record<string, unknown>).min as number || 0;
          budgetMax = (l.budget as Record<string, unknown>).max as number || 0;
        }
        // Fetch provider stats
        let providerStats: any = {};
        if (providerId) {
          try {
            const statsRes = await fetch(`/api/users/${providerId}/stats`, {
              headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
            });
            const statsData = await statsRes.json();
            providerStats = statsData.data?.stats || {};
          } catch {}
        }
        const upgradeStatus = provider && 'providerUpgradeStatus' in provider 
          ? provider.providerUpgradeStatus as string 
          : 'none';
        const validUpgradeStatus = ['none', 'pending', 'accepted', 'rejected'].includes(upgradeStatus) 
          ? upgradeStatus as 'none' | 'pending' | 'accepted' | 'rejected' 
          : 'none';
        return {
          id: l._id as string, // Use the listing's unique ID instead of provider ID
          providerId: providerId || '', // Keep provider ID for reference
          name: providerName,
          rating: providerStats.averageRating || 0,
          reviewCount: providerStats.totalReviews || 0,
          completedJobs: providerStats.totalJobsCompleted || 0,
          completionRate: providerStats.completionRate || 0,
          skills: (provider.providerProfile && Array.isArray((provider.providerProfile as { skills?: string[] }).skills)) ? (provider.providerProfile as { skills?: string[] }).skills! : [],
          workingDays: (provider.providerProfile && Array.isArray((provider.providerProfile as { workingDays?: string[] }).workingDays)) ? (provider.providerProfile as { workingDays?: string[] }).workingDays! : (l.workingDays as string[] || []),
          startTime: (provider.providerProfile && (provider.providerProfile as { startTime?: string }).startTime) ? (provider.providerProfile as { startTime?: string }).startTime! : (l.startTime as string || ''),
          endTime: (provider.providerProfile && (provider.providerProfile as { endTime?: string }).endTime) ? (provider.providerProfile as { endTime?: string }).endTime! : (l.endTime as string || ''),
          category: l.category as string,
          description: l.description as string,
          title: l.title as string,
          location: address,
          budgetMin,
          budgetMax,
          memberSince,
          startingPrice: budgetMin,
          imageUrl: provider && 'avatarUrl' in provider ? provider.avatarUrl as string : '',
          isPremium: provider && 'isPremium' in provider ? provider.isPremium as boolean : false,
          isTopRated: provider && 'isTopRated' in provider ? provider.isTopRated as boolean : false,
          isIdentityVerified: provider && 'isVerified' in provider ? provider.isVerified as boolean : false,
          isVerified: provider && 'isVerified' in provider ? provider.isVerified as boolean : false,
          providerUpgradeStatus: validUpgradeStatus,
          availability: l.availability as { days: string[]; timeSlots: string[] } || { days: [], timeSlots: [] },
        };
      }));
      setResolvedProviders(await Promise.all(providers));
    };
    fetchProvidersWithStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, accessToken]);

  const mappedRequests = (requests as unknown[]).map((req) => {
    const r = req as Record<string, unknown>;
    const urgencyValue = r.urgency as string;
    const validUrgency = ['low', 'medium', 'high'].includes(urgencyValue) ? urgencyValue as 'low' | 'medium' | 'high' : 'medium';
    const statusValue = r.status as string;
    const validStatus = ['open', 'accepted', 'closed'].includes(statusValue) ? statusValue as 'open' | 'accepted' | 'closed' : 'open';
    
    return {
      id: r._id as string,
      title: r.title as string,
      description: r.description as string,
      budget: r.budget as { min: number; max: number; currency: string },
      location: r.location && typeof r.location === 'object' && 'address' in r.location ? (r.location as Record<string, unknown>).address as string : '',
      postedBy: {
        id: (r.seeker as Record<string, unknown>)?._id as string || '',
        name: (r.seeker as Record<string, unknown>)?.name ? `${((r.seeker as Record<string, unknown>).name as Record<string, unknown>)?.first} ${((r.seeker as Record<string, unknown>).name as Record<string, unknown>)?.last}` : '',
        avatar: (r.seeker as Record<string, unknown>)?.avatarUrl as string || '',
        isPremium: (r.seeker as Record<string, unknown>)?.isPremium as boolean || false,
      },
      timePosted: r.createdAt as string || new Date().toISOString(),
      createdAt: r.createdAt as string || new Date().toISOString(),
      responses: r.offersCount as number || 0,
      urgency: validUrgency,
      deadline: r.deadline as string || '',
      requiredSkills: r.requiredSkills as string[] || [],
      status: validStatus,
      category: r.category as string || '',
      availability: r.availability as { days: string[]; timeSlots: string[] } || { days: [], timeSlots: [] },
    };
  });

  // Update URL when filters change
  useEffect(() => {
    updateFiltersInUrl(filters);
  }, [filters, updateFiltersInUrl]);

  useEffect(() => {
    const fetchProviderOffers = async () => {
      if (user && user.roles.includes('provider') && searchType === 'service-requests') {
        try {
          type Offer = { jobRequest: string };
          const res = await fetch('/api/offers', {
            headers: { 'Authorization': `Bearer ${accessToken || localStorage.getItem('accessToken')}` },
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setProviderOfferRequestIds(data.data.map((offer: Offer) => offer.jobRequest));
          }
        } catch {
          // Optionally log error
        }
      }
    };
    fetchProviderOffers();
  }, [user, searchType, accessToken]);

  const fetchLeads = async () => {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const params = new URLSearchParams();
      if (leadFilters.minBudget) params.set('minBudget', leadFilters.minBudget);
      if (leadFilters.maxBudget) params.set('maxBudget', leadFilters.maxBudget);
      if (leadFilters.government) params.set('location.government', leadFilters.government);
      if (leadFilters.city) params.set('location.city', leadFilters.city);
      const res = await fetch(`/api/users/providers/me/targeted-leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) setLeads(data.data.leads || []);
      else setLeadsError(data.error?.message || 'فشل تحميل العروض المستهدفة');
    } catch {
      setLeadsError('فشل تحميل العروض المستهدفة');
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    if (searchType === 'service-requests' && isProvider && isPremium) fetchLeads();
    // eslint-disable-next-line
  }, [searchType, isProvider, isPremium]);

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      location: '',
      priceRange: '',
      rating: '',
      category: ''
    });
  };

  const handleViewProviderDetails = (providerId: string) => {
    navigate(`/provider/${providerId}`);
  };

  const handleViewRequestDetails = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleInterestedInRequest = (requestId: string) => {
    navigate(`/requests/${requestId}/respond`);
  };

  const handleChoiceSelection = (type: SearchType) => {
    if (type === 'providers') {
      navigate('/search/providers', { replace: true });
    } else if (type === 'service-requests') {
      navigate('/search/service-requests', { replace: true });
    }
    setSearchType(type);
  };

  const handleBackToChoice = () => {
    navigate('/search', { replace: true });
    setSearchType(null);
  };

  const breadcrumbItems = [
    { label: 'الرئيسية', href: '/' },
    { label: 'البحث', href: '/search' },
    ...(searchType ? [{ 
      label: searchType === 'providers' ? 'مقدمو الخدمات' : 'طلبات الخدمات', 
      active: true 
    }] : [{ label: 'نوع البحث', active: true }])
  ];

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <BaseCard className="p-8">
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          {searchType === 'providers' ? 'لم يتم العثور على مزودي خدمات' : 'لم يتم العثور على طلبات خدمات'}
        </h3>
        <p className="text-text-secondary mb-4">
          {searchType === 'providers' 
            ? 'حاول تعديل المرشحات أو مصطلحات البحث للعثور على ما تبحث عنه.'
            : 'حاول تعديل المرشحات أو مصطلحات البحث للعثور على طلبات الخدمات المناسبة.'
          }
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="primary"
            onClick={handleClearFilters}
          >
            مسح جميع المرشحات
          </Button>
          {searchType === 'service-requests' && (
            <Button
              variant="outline"
              onClick={() => navigate('/post-request')}
            >
              نشر طلب خدمة جديد
            </Button>
          )}
        </div>
      </BaseCard>
    </div>
  );

  const renderChoiceScreen = () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <BaseCard className="max-w-2xl w-full p-12 text-center">
        <div className="mb-8">
          <Search className="w-16 h-16 text-deep-teal mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-text-primary mb-3">ماذا تبحث عن؟</h2>
          <p className="text-lg text-text-secondary">اختر نوع البحث للعثور على ما تحتاجه</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => handleChoiceSelection('providers')}
            className="group p-8 rounded-xl border-2 border-gray-200 hover:border-deep-teal transition-all duration-300 hover:shadow-lg hover:bg-soft-teal/5"
          >
            <Users className="w-12 h-12 text-deep-teal mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">مقدم خدمة</h3>
            <p className="text-text-secondary">ابحث عن مقدمي الخدمات والمحترفين في مختلف المجالات</p>
          </button>
          
          <button
            onClick={() => handleChoiceSelection('service-requests')}
            className="group p-8 rounded-xl border-2 border-gray-200 hover:border-deep-teal transition-all duration-300 hover:shadow-lg hover:bg-soft-teal/5"
          >
            <FileText className="w-12 h-12 text-deep-teal mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">طلبات الخدمات</h3>
            <p className="text-text-secondary">تصفح طلبات الخدمات المتاحة وقدم عروضك</p>
          </button>
        </div>
      </BaseCard>
    </div>
  );

  const getPageTitle = () => {
    if (searchType === 'providers') return 'البحث عن مقدمي الخدمات';
    if (searchType === 'service-requests') return 'البحث في طلبات الخدمات';
    return 'البحث';
  };

  const getPageSubtitle = () => {
    if (searchType === 'providers') {
      let text = `${resolvedProviders.length} مقدم خدمة`;
      if (filters.category) text += ` في ${filters.category}`;
      return text;
    }
    if (searchType === 'service-requests') {
      let text = `${mappedRequests.length} طلب خدمة`;
      if (filters.category) text += ` في ${filters.category}`;
      return text;
    }
    return 'اختر نوع البحث للبدء';
  };

  if (!searchType) {
    return (
      <PageLayout
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        breadcrumbItems={breadcrumbItems}
        user={user}
        onLogout={logout}
      >
        {renderChoiceScreen()}
      </PageLayout>
    );
  }

  // In the resolvedProviders rendering, mark the first 5 premium providers as featured
  let featuredCount = 0;
  const providersWithFeatured = resolvedProviders.map((provider, idx) => {
    let featured = false;
    if (provider.isPremium && featuredCount < 5) {
      featured = true;
      featuredCount++;
    }
    return { ...provider, featured };
  });

  return (
    <PageLayout
      title={getPageTitle()}
      subtitle={getPageSubtitle()}
      breadcrumbItems={breadcrumbItems}
      onSearch={handleSearch}
      searchValue={filters.search}
      user={user}
      onLogout={logout}
    >
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackToChoice}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة للخيارات
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/4 lg:sticky lg:top-4 lg:self-start">
          <FilterForm
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            onSearch={handleSearch}
            variant="sidebar"
            activeTab={searchType === 'providers' ? 'services' : 'requests'}
          />
        </div>
        
        <div className="w-full lg:w-3/4">
          {/* Top Banner Ad */}
          <div className="mb-6">
            <AdPlacement location="search" type="top" />
          </div>
          
          {/* Targeted Leads for Premium Providers */}
          {/* Removed: عروض مستهدفة لك (مميز) section as per new requirements */}
          {searchType === 'providers' ? (
            listingsLoading ? (
              <div className="text-center py-12 text-lg text-deep-teal">جاري تحميل مقدمي الخدمات...</div>
            ) : listingsError ? (
              <div className="text-center py-12 text-red-600">{listingsError.message}</div>
            ) : providersWithFeatured.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {providersWithFeatured.map((provider, index) => (
                    <React.Fragment key={provider.id}>
                      <ServiceCard
                        provider={provider}
                        onViewDetails={() => handleViewProviderDetails(provider.providerId || provider.id)}
                        featured={provider.featured}
                      />
                      {/* Interstitial Ad every 6 providers */}
                      {(index + 1) % 6 === 0 && index < providersWithFeatured.length - 1 && (
                        <div className="col-span-full my-6">
                          <AdPlacement location="search" type="interstitial" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : (
              renderEmptyState()
            )
          ) : (
            requestsLoading ? (
              <div className="text-center py-12 text-lg text-deep-teal">جاري تحميل طلبات الخدمات...</div>
            ) : requestsError ? (
              <div className="text-center py-12 text-red-600">{requestsError.message}</div>
            ) : mappedRequests.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {mappedRequests.map((request, index) => (
                    <React.Fragment key={request.id}>
                      <ServiceRequestCard
                        request={request}
                        onInterested={handleInterestedInRequest}
                        onViewDetails={handleViewRequestDetails}
                        alreadyApplied={providerOfferRequestIds.includes(request.id)}
                      />
                      {/* Interstitial Ad every 6 requests */}
                      {(index + 1) % 6 === 0 && index < mappedRequests.length - 1 && (
                        <div className="col-span-full my-6">
                          <AdPlacement location="search" type="interstitial" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : (
              renderEmptyState()
            )
          )}
          {/* Bottom Banner Ad */}
          <div className="mt-8">
            <AdPlacement location="search" type="bottom" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default SearchPage; 