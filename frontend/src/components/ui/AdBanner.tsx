import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface Ad {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  type: 'featured' | 'sidebar' | 'banner';
  advertiserId: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  performance: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
}

interface AdBannerProps {
  ad: Ad;
  placement: 'top' | 'bottom' | 'sidebar' | 'interstitial';
  className?: string;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
}

const AdBanner: React.FC<AdBannerProps> = ({
  ad,
  placement,
  className = '',
  onImpression,
  onClick
}) => {
  const handleClick = async () => {
    // Track click
    if (onClick) {
      onClick(ad._id);
    }

    // Track click on backend
    try {
      await fetch(`/api/ads/${ad._id}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }

    // Open target URL - ensure it's a valid URL
    const targetUrl = ad.targetUrl || 'https://example.com';
    
    // Ensure URL has protocol
    const finalUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  // Track impression on mount
  React.useEffect(() => {
    if (onImpression) {
      onImpression(ad._id);
    }

    // Track impression on backend
    const trackImpression = async () => {
      try {
        await fetch(`/api/ads/${ad._id}/impression`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error tracking ad impression:', error);
      }
    };

    trackImpression();
  }, [ad._id, onImpression]);

  const getPlacementStyles = () => {
    switch (placement) {
      case 'top':
      case 'bottom':
        return 'w-full bg-white border border-deep-teal/20 rounded-lg overflow-hidden shadow-sm hover:shadow-md';
      case 'sidebar':
        return 'w-full bg-white border border-deep-teal/20 rounded-lg overflow-hidden shadow-sm';
      case 'interstitial':
        return 'w-full bg-white border border-deep-teal/20 rounded-lg overflow-hidden shadow-md';
      default:
        return 'w-full bg-white border border-deep-teal/20 rounded-lg overflow-hidden shadow-sm';
    }
  };

  const getContentLayout = () => {
    switch (placement) {
      case 'top':
      case 'bottom':
        return (
          <div className="relative h-48">
            {/* Main Image - Full Width */}
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://picsum.photos/728/128?random=1';
              }}
            />
            
            {/* Overlay with Text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-2xl mb-1">{ad.title}</h3>
                    <p className="text-white/90 text-2xl line-clamp-1">{ad.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl bg-white/20 text-white px-2 py-1 rounded">
                      إعلان
                    </span>
                    <ExternalLink className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'sidebar':
        return (
          <div className="p-3">
            <div className="text-center mb-2">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-8 h-8 object-cover rounded-full mx-auto mb-2"
                onError={(e) => {
                  e.currentTarget.src = 'https://picsum.photos/32/32?random=1';
                }}
              />
              <h3 className="text-xs font-bold text-deep-teal mb-1">{ad.title}</h3>
              <p className="text-xs text-text-secondary line-clamp-2">{ad.description}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-accent font-bold">{ad.advertiserId.name}</span>
            </div>
          </div>
        );
      
      case 'interstitial':
        return (
          <div className="relative h-48">
            {/* Main Image - Full Width */}
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://picsum.photos/728/128?random=1';
              }}
            />
            
            {/* Overlay with Text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-2xl mb-1">{ad.title}</h3>
                    <p className="text-white/90 text-2xl line-clamp-1">{ad.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl bg-white/20 text-white px-2 py-1 rounded">
                      إعلان
                    </span>
                    <ExternalLink className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      className={`${getPlacementStyles()} ${className} cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`إعلان: ${ad.title}`}
    >
      {getContentLayout()}
    </div>
  );
};

export default AdBanner; 