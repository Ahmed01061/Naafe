import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface NegotiationToggleProps {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  price: string;
  minBudget: number;
  maxBudget: number;
  className?: string;
}

const NegotiationToggle: React.FC<NegotiationToggleProps> = ({
  isChecked,
  onChange,
  price,
  minBudget,
  maxBudget,
  className = ''
}) => {
  if (!price || isNaN(Number(price))) {
    return null;
  }
  const priceValue = Number(price);
  const tooLowThreshold = minBudget * 0.5; // 50% of min budget
  const tooHighThreshold = maxBudget * 2; // 200% of max budget
  
  const isOverBudget = priceValue > maxBudget;
  const isTooLow = priceValue < tooLowThreshold;
  const isTooHigh = priceValue > tooHighThreshold;

  if (!isOverBudget && !isTooLow && !isTooHigh) {
    return null;
  }

  let message = '';
  let icon = <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />;
  let colorClass = 'border-orange-200 bg-orange-50';
  let textColor = 'text-orange-800';

  if (isTooLow) {
    message = `سعرك منخفض جداً (${priceValue} جنيه). السعر الموصى به: ${minBudget} جنيه على الأقل.`;
    icon = <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />;
    colorClass = 'border-red-200 bg-red-50';
    textColor = 'text-red-800';
  } else if (isTooHigh) {
    message = `سعرك مرتفع جداً (${priceValue} جنيه). السعر الموصى به: ${maxBudget} جنيه كحد أقصى.`;
    icon = <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />;
    colorClass = 'border-red-200 bg-red-50';
    textColor = 'text-red-800';
  } else if (isOverBudget) {
    message = `سعرك (${priceValue} جنيه) أعلى من الميزانية المحددة (${maxBudget} جنيه).`;
    icon = <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />;
    colorClass = 'border-orange-200 bg-orange-50';
    textColor = 'text-orange-800';
  }

  return (
    <div className={`mt-3 p-4 rounded-lg border ${colorClass} ${className}`}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => onChange(e.target.checked)}
                className={`w-4 h-4 border rounded focus:ring-2 ${
                  isTooLow || isTooHigh 
                    ? 'text-red-600 border-red-300 focus:ring-red-500' 
                    : 'text-orange-600 border-orange-300 focus:ring-orange-500'
                }`}
              />
              <span className={`text-sm font-medium ${textColor}`}>
                {isTooLow || isTooHigh ? 'أؤكد أنني أريد المتابعة بهذا السعر' : 'سعرى يتطلب تفاوض'}
              </span>
            </label>
          </div>
          <p className={`text-xs ${textColor}`}>
            {message}
            {isOverBudget && !isTooHigh && ' يجب عليك الموافقة على أن هذا السعر يتطلب تفاوض للمتابعة.'}
            {(isTooLow || isTooHigh) && ' يجب عليك الموافقة على المتابعة بهذا السعر.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NegotiationToggle; 