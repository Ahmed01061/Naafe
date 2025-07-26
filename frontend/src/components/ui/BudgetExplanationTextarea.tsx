import React from 'react';
import { MessageSquare } from 'lucide-react';
import { FormTextarea } from './index';

interface BudgetExplanationTextareaProps {
  value: string;
  onChange: (value: string) => void;
  price: string;
  maxBudget: number;
  isNegotiationAcknowledged: boolean;
  className?: string;
}

const BudgetExplanationTextarea: React.FC<BudgetExplanationTextareaProps> = ({
  value,
  onChange,
  price,
  maxBudget,
  isNegotiationAcknowledged,
  className = ''
}) => {
  const priceValue = Number(price);
  const isOverBudget = priceValue > maxBudget;

  if (!isOverBudget || !isNegotiationAcknowledged) {
    return null;
  }

  return (
    <div className={`mt-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-4 w-4 text-deep-teal" />
        <label className="text-sm font-medium text-deep-teal">
          اشرح لماذا يقدم سعرك قيمة إضافية
        </label>
      </div>
      <FormTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثال: سعرى يعكس سنوات من الخبرة، أو يشمل مواد إضافية، أو يضمن جودة عالية..."
        className="w-full h-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deep-teal focus:border-deep-teal bg-white text-text-primary placeholder-gray-500"
        maxLength={500}
      />
      <p className="text-xs text-text-secondary mt-1">
        هذا التفسير سيظهر لطالب الخدمة لمساعدته في فهم قيمة عرضك
      </p>
    </div>
  );
};

export default BudgetExplanationTextarea; 