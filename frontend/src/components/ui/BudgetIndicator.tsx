import React from 'react';
import { Check, AlertTriangle, TrendingUp, AlertCircle } from 'lucide-react';

interface BudgetIndicatorProps {
  price: string;
  minBudget: number;
  maxBudget: number;
  className?: string;
}

const BudgetIndicator: React.FC<BudgetIndicatorProps> = ({
  price,
  minBudget,
  maxBudget,
  className = ''
}) => {
  if (!price || isNaN(Number(price))) {
    return null;
  }

  const priceValue = Number(price);
  let status: 'within' | 'below' | 'above' | 'too-low' | 'too-high' | 'unknown';
  let message: string;
  let icon: React.ReactNode;
  let colorClass: string;

  // Calculate thresholds for edge cases
  const tooLowThreshold = minBudget * 0.5; // 50% of min budget
  const tooHighThreshold = maxBudget * 2; // 200% of max budget

  if (priceValue >= minBudget && priceValue <= maxBudget) {
    status = 'within';
    message = `هذا السعر يناسب ميزانية طالب الخدمة (${minBudget}–${maxBudget} جنيه)`;
    icon = <Check className="h-4 w-4" />;
    colorClass = 'text-green-600 bg-green-50 border-green-200';
  } else if (priceValue < tooLowThreshold) {
    status = 'too-low';
    message = `سعر منخفض جداً - قد يشكك في جودة الخدمة`;
    icon = <AlertCircle className="h-4 w-4" />;
    colorClass = 'text-red-600 bg-red-50 border-red-200';
  } else if (priceValue < minBudget) {
    status = 'below';
    message = `أقل من الميزانية - قيمة ممتازة!`;
    icon = <TrendingUp className="h-4 w-4" />;
    colorClass = 'text-blue-600 bg-blue-50 border-blue-200';
  } else if (priceValue > tooHighThreshold) {
    status = 'too-high';
    message = `سعر مرتفع جداً - قد يرفض طالب الخدمة`;
    icon = <AlertCircle className="h-4 w-4" />;
    colorClass = 'text-red-600 bg-red-50 border-red-200';
  } else {
    status = 'above';
    message = `أعلى من الميزانية - قد يحتاج إلى تفاوض`;
    icon = <AlertTriangle className="h-4 w-4" />;
    colorClass = 'text-orange-600 bg-orange-50 border-orange-200';
  }

  return (
    <div className={`mt-2 p-3 rounded-lg border ${colorClass} ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{message}</span>
      </div>
      {(status === 'above' || status === 'too-high') && (
        <p className="text-xs mt-1 text-orange-700">
          طالب الخدمة حدد ميزانية: {minBudget}–{maxBudget} جنيه. أنت أدخلت {priceValue} جنيه.
        </p>
      )}
      {status === 'too-low' && (
        <p className="text-xs mt-1 text-red-700">
          السعر الموصى به: {minBudget} جنيه على الأقل. أنت أدخلت {priceValue} جنيه.
        </p>
      )}
    </div>
  );
};

export default BudgetIndicator; 