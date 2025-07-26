import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ServiceDetailsContainer from '../components/ServiceDetails';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/ui/BackButton';
import { useAuth } from '../contexts/AuthContext';
import { useOfferContext } from '../contexts/OfferContext';

const RequestServiceDetailsPage = () => {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const { offers, addNewOffer, setOffers } = useOfferContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [service, setService] = useState<any>(null); // TODO: Replace 'any' with proper type after mapping
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch offers
  const fetchOffers = useCallback(async () => {
    if (!id) return;
    try {
      console.log('Fetching offers for job request:', id);
      const offersRes = await fetch(`/api/requests/${id}/offers`, {
        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
      });
      const offersData = await offersRes.json();
      console.log('Offers data response:', offersData);
      
      if (offersData.success) {
        // Map backend offers to frontend responses model
        const mappedOffers = (offersData.data?.offers || []).map(async (offer: {
          _id: string;
          provider?: {
            _id?: string;
            name?: { first?: string; last?: string } | string;
            avatarUrl?: string;
            rating?: number;
            reviewCount?: number;
            specialties?: string[];
            verified?: boolean;
            isVerified?: boolean;
            isPremium?: boolean;
            isTopRated?: boolean;
            createdAt?: string;
            providerProfile?: {
              rating?: number;
              skills?: string[];
              totalJobsCompleted?: number;
              averageResponseTime?: string;
              completionRate?: number;
            };
          };
          jobRequest?: {
            _id?: string;
            seeker?: string;
            title?: string;
            status?: string;
          };
          budget?: { min?: number };
          message?: string;
          estimatedTimeDays?: number;
          availableDates?: string[];
          timePreferences?: string[];
          status?: string;
          createdAt: string;
        }) => {
          // Ensure provider exists
          if (!offer.provider) {
            console.warn('Offer missing provider data:', offer);
            return {
              id: offer._id,
              providerId: '',
              name: 'مستخدم غير معروف',
              avatar: '',
              rating: 0,
              price: offer.budget?.min || 0,
              specialties: [],
              verified: false,
              message: offer.message || '',
              estimatedTimeDays: offer.estimatedTimeDays || 1,
              availableDates: offer.availableDates || [],
              timePreferences: offer.timePreferences || [],
              createdAt: offer.createdAt,
              jobRequestSeekerId: offer.jobRequest?.seeker || '',
              status: offer.status || 'pending',
            };
          }

          // Safe name extraction
          let providerName = 'مستخدم غير معروف';
          if (offer.provider.name) {
            if (typeof offer.provider.name === 'object') {
              const firstName = offer.provider.name.first || '';
              const lastName = offer.provider.name.last || '';
              providerName = `${firstName} ${lastName}`.trim() || 'مستخدم غير معروف';
            } else {
              providerName = offer.provider.name || 'مستخدم غير معروف';
            }
          }

          // Fetch provider stats
          const statsRes = await fetch(`/api/users/${offer.provider._id}/stats`, {
            headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
          });
          const statsData = await statsRes.json();
          const providerStats = statsData.data?.stats || {};

          return {
            id: offer._id,
            providerId: offer.provider._id || '',
            name: providerName,
            avatar: offer.provider.avatarUrl || '',
            rating: providerStats.averageRating || 0,
            price: offer.budget?.min || 0,
            specialties: offer.provider.providerProfile?.skills || [],
            verified: offer.provider.isVerified || false,
            completedJobs: providerStats.totalJobsCompleted || 0,
            responseTime: providerStats.responseTime || 'غير محدد',
            completionRate: providerStats.completionRate || 0,
            joinDate: offer.provider.createdAt || '',
            isTopRated: offer.provider.isTopRated || false,
            isPremium: offer.provider.isPremium || false,
            message: offer.message || '',
            estimatedTimeDays: offer.estimatedTimeDays || 1,
            availableDates: offer.availableDates || [],
            timePreferences: offer.timePreferences || [],
            createdAt: offer.createdAt,
            jobRequestSeekerId: offer.jobRequest?.seeker || '',
            status: offer.status || 'pending',
            stats: {
              rating: providerStats.averageRating || 0,
              completedJobs: providerStats.totalJobsCompleted || 0,
              completionRate: providerStats.completionRate || 0,
              joinDate: offer.provider.createdAt || '',
              isTopRated: offer.provider.isTopRated || false,
              isPremium: offer.provider.isPremium || false,
            }
          };
        });
        
        console.log('Mapped offers:', mappedOffers);
        setOffers(await Promise.all(mappedOffers));
      }
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  }, [id, accessToken, setOffers]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Fetching service data for ID:', id);
        const res = await fetch(`/api/requests/${id}`);
        const data = await res.json();
        console.log('Service data response:', data);
        console.log('Seeker data:', data.data.jobRequest.seeker);
        
        if (!data.success) throw new Error(data.error?.message || 'Failed to fetch');
        
        // TODO: Map backend jobRequest to frontend service model as needed
        const mappedService = {
          ...data.data.jobRequest,
          postedBy: { 
            id: data.data.jobRequest.seeker?._id || data.data.jobRequest.seeker?.id || data.data.jobRequest.seeker, 
            name: data.data.jobRequest.seeker?.name || 'مستخدم غير معروف'
          },
          // Map location/address fields, images, requester, etc. as needed
          images: (data.data.jobRequest.attachments || []).map((a: { url: string }) => a.url),
          requester: data.data.jobRequest.seeker ? {
            id: data.data.jobRequest.seeker._id || data.data.jobRequest.seeker.id,
            name: typeof data.data.jobRequest.seeker.name === 'object'
              ? `${data.data.jobRequest.seeker.name.first || ''} ${data.data.jobRequest.seeker.name.last || ''}`.trim()
              : data.data.jobRequest.seeker.name || 'مستخدم غير معروف',
            avatar: data.data.jobRequest.seeker.avatarUrl || '',
            createdAt: data.data.jobRequest.seeker.createdAt,
          } : null,
          // Add comments: [] if not present
          comments: [],
          timeline: data.data.jobRequest.deadline ? new Date(data.data.jobRequest.deadline).toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined,
        };
        
        console.log('Mapped service data:', mappedService);
        setService(mappedService);
        
        // Fetch offers
        await fetchOffers();
      } catch (err: unknown) {
        console.error('Error in fetchData:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, fetchOffers]);

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-warm-cream">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-deep-teal text-lg">جاري التحميل...</div>
      </main>
      <Footer />
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex flex-col bg-warm-cream">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-red-500 text-lg">{error}</div>
      </main>
      <Footer />
    </div>
  );
  
  if (!service) return (
    <div className="min-h-screen flex flex-col bg-warm-cream">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-deep-teal text-lg">لم يتم العثور على الخدمة</div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-warm-cream">
      <Header />
      <main className="flex-1">
        {/* Back Button Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <BackButton to="/search" className="mb-4" />
        </div>
        
        {/* Service Details */}
        {(() => {
          try {
            console.log('Rendering ServiceDetailsContainer with:', { service, offers });
            return (
              <ServiceDetailsContainer
                service={service}
                offers={offers}
                onInterested={() => {}}
                onShare={() => {}}
                onBookmark={() => {}}
                onReport={() => {}}
                onOfferAdded={addNewOffer}
                onOffersRefresh={fetchOffers}
              />
            );
          } catch (error) {
            console.error('Error rendering ServiceDetailsContainer:', error);
            return (
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <h2 className="text-xl font-bold text-red-800 mb-2">خطأ في عرض البيانات</h2>
                  <p className="text-red-600 mb-4">حدث خطأ أثناء عرض تفاصيل الخدمة</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    إعادة تحميل الصفحة
                  </button>
                </div>
              </div>
            );
          }
        })()}
      </main>
      <Footer />
    </div>
  );
};

export default RequestServiceDetailsPage; 