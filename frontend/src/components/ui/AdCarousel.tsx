import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import AdBanner, { Ad } from './AdBanner';
import Button from './Button';
import { Megaphone } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface AdCarouselProps {
  ads: Ad[];
  placement: 'top' | 'bottom' | 'sidebar' | 'interstitial';
  placementId: string;
  fallbackMessage: string;
  ctaText: string;
  className?: string;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
  onAdvertiseClick?: (placementId: string) => void;
}

const AdCarousel: React.FC<AdCarouselProps> = ({
  ads,
  placement,
  placementId,
  fallbackMessage,
  ctaText,
  className = '',
  onImpression,
  onClick,
  onAdvertiseClick
}) => {
  const swiperRef = useRef<{ swiper: SwiperType }>(null);

  // Pause autoplay on hover
  const handleMouseEnter = () => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.autoplay.stop();
    }
  };

  const handleMouseLeave = () => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.autoplay.start();
    }
  };

  // If no ads, show fallback banner
  if (!ads || ads.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-white border border-deep-teal/20 rounded-lg p-6 text-center shadow-sm h-48 flex flex-col items-center justify-center">
          <Megaphone className="w-8 h-8 text-deep-teal mx-auto mb-3" />
          <h3 className="text-lg font-bold text-deep-teal mb-2">{fallbackMessage}</h3>
          <p className="text-sm text-text-secondary mb-4">
            اعلن هنا ووصل لأكبر عدد من المستخدمين
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAdvertiseClick?.(placementId)}
            className="mx-auto"
          >
            {ctaText}
          </Button>
        </div>
      </div>
    );
  }

  // If only one ad, show it without carousel
  if (ads.length === 1) {
    return (
      <div className={`w-full ${className}`}>
        <AdBanner
          ad={ads[0]}
          placement={placement}
          onImpression={onImpression}
          onClick={onClick}
        />
      </div>
    );
  }

  return (
    <div 
      className={`w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Swiper
        ref={swiperRef}
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={10}
        slidesPerView={1}
        loop={ads.length > 1}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={{
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        }}
        breakpoints={{
          640: {
            slidesPerView: 1,
            spaceBetween: 10,
          },
          768: {
            slidesPerView: 1,
            spaceBetween: 15,
          },
          1024: {
            slidesPerView: 1,
            spaceBetween: 20,
          },
        }}
        className="ad-carousel"
      >
        {ads.map((ad) => (
          <SwiperSlide key={ad._id}>
            <AdBanner
              ad={ad}
              placement={placement}
              onImpression={onImpression}
              onClick={onClick}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom navigation buttons */}
      {ads.length > 1 && (
        <>
          <button 
            className="swiper-button-prev absolute left-2 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-all duration-200"
            aria-label="الإعلان السابق"
            title="الإعلان السابق"
          >
            <svg className="w-4 h-4 text-deep-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            className="swiper-button-next absolute right-2 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-all duration-200"
            aria-label="الإعلان التالي"
            title="الإعلان التالي"
          >
            <svg className="w-4 h-4 text-deep-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Custom styles for Swiper */}
      <style>{`
        .ad-carousel .swiper-pagination-bullet {
          background: #2D5D4F;
          opacity: 0.3;
        }
        .ad-carousel .swiper-pagination-bullet-active {
          opacity: 1;
        }
        .ad-carousel .swiper-button-prev,
        .ad-carousel .swiper-button-next {
          color: #2D5D4F;
        }
        .ad-carousel .swiper-button-prev:hover,
        .ad-carousel .swiper-button-next:hover {
          background: white;
        }
      `}</style>
    </div>
  );
};

export default AdCarousel; 