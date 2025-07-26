import React, { useState, useEffect } from 'react';
import AdCarousel, { Ad } from './AdCarousel';
import { getPlacementByLocation, AdPlacement as IAdPlacement } from '../../data/adPlacements';
import { useNavigate } from 'react-router-dom';

interface AdPlacementProps {
  location: string;
  type: 'top' | 'bottom' | 'sidebar' | 'interstitial';
  className?: string;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
}

const AdPlacement: React.FC<AdPlacementProps> = ({
  location,
  type,
  className = '',
  onImpression,
  onClick
}) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get placement configuration
  const placement = getPlacementByLocation(location, type) as IAdPlacement | undefined;
  
  if (!placement) {
    console.warn(`No placement configuration found for location: ${location}, type: ${type}`);
    return null;
  }

  // Fetch ads for this placement
  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/ads/active?type=${type}&location=${location}&limit=${placement.maxAds}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch ads');
        }

        const data = await response.json();
        
        if (data.success) {
          setAds(data.data || []);
        } else {
          throw new Error(data.error?.message || 'Failed to fetch ads');
        }
      } catch (err) {
        console.error('Error fetching ads:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch ads');
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [location, type, placement.maxAds]);

  // Handle advertise click
  const handleAdvertiseClick = (placementId: string) => {
    navigate('/advertise', { 
      state: { 
        selectedPlacement: placementId,
        selectedType: type,
        selectedLocation: location
      }
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-gradient-to-r from-deep-teal/10 to-accent/10 border border-deep-teal/20 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-deep-teal/20 rounded mb-2"></div>
          <div className="h-3 bg-deep-teal/20 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('Ad placement error:', error);
    return null; // Don't show anything on error to avoid breaking layout
  }

  return (
    <div className={`w-full ${className}`}>
      <AdCarousel
        ads={ads}
        placement={type}
        placementId={placement.id}
        fallbackMessage={placement.fallbackMessage}
        ctaText={placement.ctaText}
        onImpression={onImpression}
        onClick={onClick}
        onAdvertiseClick={handleAdvertiseClick}
      />
    </div>
  );
};

export default AdPlacement; 