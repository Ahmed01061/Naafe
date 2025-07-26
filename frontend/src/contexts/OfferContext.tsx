import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';

export interface Offer {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  price: number;
  specialties: string[];
  verified?: boolean;
  message?: string;
  estimatedTimeDays?: number;
  availableDates?: string[];
  timePreferences?: string[];
  createdAt?: string;
  status?: string; // 'pending', 'negotiating', 'accepted', 'in_progress', 'completed', 'rejected'
}

export interface NegotiationTerms {
  price?: number;
  date?: string;
  time?: string;
  materials?: string;
  scope?: string;
}

export interface NegotiationHistoryEntry {
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  timestamp: string;
  note?: string;
}

export interface NegotiationState {
  currentTerms: NegotiationTerms;
  confirmationStatus: {
    seeker: boolean;
    provider: boolean;
  };
  canAcceptOffer: boolean;
  isNegotiating: boolean;
  lastUpdatedBy: string;
  negotiationHistory: NegotiationHistoryEntry[];
}

interface OfferContextType {
  offers: Offer[];
  addNewOffer: (offer: Offer) => void;
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  negotiationState: Record<string, NegotiationState>;
  fetchNegotiation: (offerId: string) => Promise<void>;
  updateNegotiation: (offerId: string, data: NegotiationTerms) => Promise<void>;
  confirmNegotiation: (offerId: string) => Promise<void>;
  resetNegotiation: (offerId: string) => Promise<void>;
  fetchNegotiationHistory: (offerId: string) => Promise<void>;
}

const OfferContext = createContext<OfferContextType | undefined>(undefined);

export const useOfferContext = () => {
  const context = useContext(OfferContext);
  if (context === undefined) {
    throw new Error('useOfferContext must be used within an OfferProvider');
  }
  return context;
};

interface OfferProviderProps {
  children: ReactNode;
}

export const OfferProvider: React.FC<OfferProviderProps> = ({ children }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [negotiationState, setNegotiationState] = useState<Record<string, NegotiationState>>({});
  const { accessToken, user } = useAuth();
  const { on } = useSocket(accessToken || undefined);

  const addNewOffer = useCallback((offer: Offer) => {
    setOffers(prev => [offer, ...prev]);
  }, []);

  // Fetch negotiation state for an offer
  const fetchNegotiation = useCallback(async (offerId: string) => {
    if (!accessToken) return;
    
    console.log('Fetching negotiation for offer:', offerId);
    
    const res = await fetch(`/api/offers/${offerId}` , {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    console.log('Negotiation data:', data);
    
    if (data.success && data.data.negotiation) {
      const n = data.data.negotiation;
      console.log('Setting negotiation state for offer:', offerId, n);
      
      setNegotiationState(prev => ({
        ...prev,
        [offerId]: {
          currentTerms: {
            price: n.price,
            date: n.date,
            time: n.time,
            materials: n.materials,
            scope: n.scope
          },
          confirmationStatus: {
            seeker: !!n.seekerConfirmed,
            provider: !!n.providerConfirmed
          },
          canAcceptOffer: !!(n.seekerConfirmed && n.providerConfirmed),
          isNegotiating: true,
          lastUpdatedBy: n.lastModifiedBy || '',
          negotiationHistory: n.negotiationHistory || []
        }
      }));
    } else {
      console.log('No negotiation data found for offer:', offerId);
    }
  }, [accessToken]);

  // Update negotiation terms
  const updateNegotiation = useCallback(async (offerId: string, data: NegotiationTerms) => {
    if (!accessToken) return;
    await fetch(`/api/offers/${offerId}/negotiation`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    await fetchNegotiation(offerId);
  }, [accessToken, fetchNegotiation]);

  // Confirm negotiation
  const confirmNegotiation = useCallback(async (offerId: string) => {
    if (!accessToken) return;
    await fetch(`/api/offers/${offerId}/confirm-negotiation`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    await fetchNegotiation(offerId);
  }, [accessToken, fetchNegotiation]);

  // Reset negotiation confirmations
  const resetNegotiation = useCallback(async (offerId: string) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`/api/offers/${offerId}/reset-confirmation`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error resetting negotiation:', data.error?.message || data.message || 'Unknown error');
        throw new Error(data.error?.message || data.message || 'Failed to reset negotiation confirmations');
      }
      
      await fetchNegotiation(offerId);
      return data;
    } catch (error) {
      console.error('Error in resetNegotiation:', error);
      throw error;
    }
  }, [accessToken, fetchNegotiation]);

  // Fetch negotiation history
  const fetchNegotiationHistory = useCallback(async (offerId: string) => {
    if (!accessToken) return;
    const res = await fetch(`/api/offers/${offerId}/negotiation-history`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (data.success) {
      setNegotiationState(prev => ({
        ...prev,
        [offerId]: {
          ...(prev[offerId] || {}),
          negotiationHistory: data.data
        }
      }));
    }
  }, [accessToken]);

  // Real-time negotiation update listener
  React.useEffect(() => {
    if (!on) return;
    const off = on('negotiation:update', (payload: { offerId: string }) => {
      if (payload && payload.offerId) {
        fetchNegotiation(payload.offerId);
      }
    });
    return () => { off && off(); };
  }, [on, fetchNegotiation]);

  return (
    <OfferContext.Provider value={{
      offers,
      addNewOffer,
      setOffers,
      negotiationState,
      fetchNegotiation,
      updateNegotiation,
      confirmNegotiation,
      resetNegotiation,
      fetchNegotiationHistory
    }}>
      {children}
    </OfferContext.Provider>
  );
}; 