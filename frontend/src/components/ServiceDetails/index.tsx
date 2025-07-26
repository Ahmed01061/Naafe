// Temporary fix for TypeScript module resolution
import React from 'react';
import ServiceGallery from './ServiceGallery.tsx';
import ServiceDetails from './ServiceDetails.tsx';
import RequesterInfo from './RequesterInfo.tsx';
import ResponsesSection from './ResponsesSection.tsx';
import CommentsSection from './CommentsSection.tsx';
import ServiceSidebar from './ServiceSidebar.tsx';
import { useAuth } from '../../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ServiceDetailsContainerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any; // TODO: type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  offers: any[];
  onInterested?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  onReport?: () => void;
  onOfferAdded?: (newOffer: any) => void;
  onOffersRefresh?: () => Promise<void>;
}

const ServiceDetailsContainer: React.FC<ServiceDetailsContainerProps> = ({
  service,
  offers,
  onInterested,
  onShare,
  onBookmark,
  onReport,
  onOfferAdded,
  onOffersRefresh
}) => {
  const { user } = useAuth();
  
  console.log('ServiceDetailsContainer render:', { service, offers, user });
  
  const alreadyApplied = !!(user && user.roles.includes('provider') && offers.some(o => o.providerId === user.id));
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8">
          {(() => {
            try {
              return <ServiceGallery images={service.images} title={service.title} />;
            } catch (error) {
              console.error('Error rendering ServiceGallery:', error);
              return <div className="mb-6 bg-white rounded-lg shadow-lg p-6 text-center border border-deep-teal/10">خطأ في عرض الصور</div>;
            }
          })()}
          
          {(() => {
            try {
              return <ServiceDetails service={service} />;
            } catch (error) {
              console.error('Error rendering ServiceDetails:', error);
              return <div className="mb-6 bg-white rounded-lg shadow-lg p-6 text-center border border-deep-teal/10">خطأ في عرض تفاصيل الخدمة</div>;
            }
          })()}
          
          {(() => {
            try {
              return <RequesterInfo requester={service.requester} />;
            } catch (error) {
              console.error('Error rendering RequesterInfo:', error);
              return <div className="mb-6 bg-white rounded-lg shadow-lg p-6 text-center border border-deep-teal/10">خطأ في عرض معلومات مقدم الطلب</div>;
            }
          })()}
          
          {(() => {
            try {
              return (
                <ResponsesSection 
                  responses={offers} 
                  onOffersRefresh={onOffersRefresh}
                  jobRequestStatus={service.status}
                  jobRequestId={service._id}
                  seekerId={service.seeker?._id || service.seeker?.id || service.seeker}
                />
              );
            } catch (error) {
              console.error('Error rendering ResponsesSection:', error);
              return <div className="mb-6 bg-white rounded-lg shadow-lg p-6 text-center border border-deep-teal/10">خطأ في عرض العروض</div>;
            }
          })()}
          
          {(() => {
            try {
              return <CommentsSection comments={service.comments || []} />;
            } catch (error) {
              console.error('Error rendering CommentsSection:', error);
              return <div className="mb-6 bg-white rounded-lg shadow-lg p-6 text-center border border-deep-teal/10">خطأ في عرض التعليقات</div>;
            }
          })()}
        </div>
        {/* Sidebar */}
        <div className="lg:col-span-4">
          {(() => {
            try {
              return (
                <ServiceSidebar
                  service={service}
                  onInterested={onInterested}
                  onShare={onShare}
                  onBookmark={onBookmark}
                  onReport={onReport}
                  alreadyApplied={alreadyApplied}
                />
              );
            } catch (error) {
              console.error('Error rendering ServiceSidebar:', error);
              return <div className="bg-white rounded-lg shadow-lg p-6 text-center border border-deep-teal/10">خطأ في عرض الشريط الجانبي</div>;
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsContainer; 