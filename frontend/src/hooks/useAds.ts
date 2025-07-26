import { useState, useEffect, useCallback } from 'react';
import { Ad } from '../components/ui/AdBanner';

interface UseAdsOptions {
  location: string;
  type: 'top' | 'bottom' | 'sidebar' | 'interstitial';
  maxAds?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseAdsReturn {
  ads: Ad[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  trackImpression: (adId: string) => void;
  trackClick: (adId: string) => void;
}

export const useAds = ({
  location,
  type,
  maxAds = 6,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}: UseAdsOptions): UseAdsReturn => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/ads/active?type=${type}&location=${location}&limit=${maxAds}`
      );

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
  }, [location, type, maxAds]);

  // Initial fetch
  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchAds, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAds]);

  const trackImpression = useCallback(async (adId: string) => {
    try {
      await fetch(`/api/ads/${adId}/impression`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  }, []);

  const trackClick = useCallback(async (adId: string) => {
    try {
      await fetch(`/api/ads/${adId}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  }, []);

  return {
    ads,
    loading,
    error,
    refresh: fetchAds,
    trackImpression,
    trackClick,
  };
}; 