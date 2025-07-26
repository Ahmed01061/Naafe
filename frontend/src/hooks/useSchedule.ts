import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ScheduleItem {
  id: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed';
  serviceTitle: string;
  seekerName: string;
  location: string;
}

interface ScheduleData {
  schedule: ScheduleItem[];
}

interface UseScheduleReturn {
  schedule: ScheduleItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const useSchedule = (providerId?: string): UseScheduleReturn => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, user } = useAuth();

  const fetchSchedule = useCallback(async () => {
    if (!accessToken || !(providerId || user?.id)) {
      setError('No access token or provider ID available');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/${providerId || user?.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch schedule');
      const data: { success: boolean; data: { schedule: ScheduleItem[] } } = await res.json();
      setSchedule(data.data.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  }, [accessToken, providerId, user?.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return {
    schedule,
    loading,
    error,
    refetch: fetchSchedule
  };
};

export default useSchedule; 