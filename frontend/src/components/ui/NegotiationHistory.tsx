import React, { useState } from 'react';
import { NegotiationHistoryEntry } from '../../contexts/OfferContext';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface NegotiationHistoryProps {
  negotiationHistory: NegotiationHistoryEntry[];
  userMap?: Record<string, string>; // userId to name
  isMobile?: boolean;
}

const fieldLabels: Record<string, string> = {
  price: 'السعر',
  date: 'التاريخ',
  time: 'الوقت',
  materials: 'المواد',
  scope: 'نطاق العمل',
  confirmation: 'تأكيد الاتفاق',
};

// Helper function to format values for display
const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'نعم' : 'لا';
  }
  
  if (typeof value === 'object') {
    // Handle confirmation status objects
    if (value.hasOwnProperty('seekerConfirmed') && value.hasOwnProperty('providerConfirmed')) {
      return `المشترك: ${value.seekerConfirmed ? 'نعم' : 'لا'}, المزود: ${value.providerConfirmed ? 'نعم' : 'لا'}`;
    }
    // For other objects, return a JSON representation
    return JSON.stringify(value);
  }
  
  return String(value);
};

const NegotiationHistory: React.FC<NegotiationHistoryProps> = ({ negotiationHistory, userMap = {}, isMobile }) => {
  const [collapsed, setCollapsed] = useState(true); // Start collapsed by default
  
  if (!negotiationHistory || negotiationHistory.length === 0) {
    return <div className="text-gray-400 text-sm text-center p-4 border rounded-lg border-gray-100">لا يوجد تغييرات في التفاوض بعد</div>;
  }
  
  const sortedHistory = [...negotiationHistory].reverse();
  
  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 mb-4 overflow-hidden flex-none" dir="rtl">
      <button 
        onClick={() => setCollapsed(prev => !prev)}
        className="w-full flex items-center justify-between p-4 text-right hover:bg-warm-cream/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-deep-teal" />
          <h3 className="font-bold text-deep-teal">سجل التفاوض</h3>
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
            {negotiationHistory.length}
          </span>
        </div>
        <div className="text-deep-teal">
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>
      </button>
      
      {!collapsed && (
        <div className="border-t border-gray-100">
          <ul className="space-y-3 p-4 max-h-72 overflow-y-auto" style={{ height: 'auto', maxHeight: '18rem' }}>
            {sortedHistory.map((entry, idx) => (
              <li key={idx} className={`rounded-lg p-3 text-sm ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-warm-cream/10'}`}>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="font-medium text-deep-teal">{fieldLabels[entry.field] || entry.field}:</span>
                  {entry.oldValue !== undefined && entry.oldValue !== null && (
                    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs">
                      {formatValue(entry.oldValue)}
                    </span>
                  )}
                  {entry.oldValue !== undefined && entry.newValue !== undefined && (
                    <span className="text-gray-400 mx-1">→</span>
                  )}
                  {entry.newValue !== undefined && entry.newValue !== null && (
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">
                      {formatValue(entry.newValue)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 items-center text-xs text-gray-500 mt-1 border-t border-gray-100 pt-1">
                  <span>بواسطة: <span className="font-medium">{userMap[entry.changedBy] || entry.changedBy}</span></span>
                  <span>في: {new Date(entry.timestamp).toLocaleString('ar-EG')}</span>
                  {entry.note && (
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                      {entry.note}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NegotiationHistory; 