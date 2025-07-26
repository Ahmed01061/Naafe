import React, { useState, useCallback } from 'react';
import { Sparkles, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from './Button';
import BaseCard from './BaseCard';
import FormTextarea from './FormTextarea';

interface AIAssistantProps {
  formType: 'service' | 'request';
  category: string;
  currentFields: Record<string, unknown>;
  onSuggestionApply: (field: string, value: string) => void;
  className?: string;
  inputPlaceholder?: string;
  skills?: string[];
  categories?: string[];
  governorates?: { id: string; name: string }[];
  cities?: Record<string, string[]>;
  rating?: number;
}

interface AISuggestion {
  type: 'title' | 'description' | 'keywords';
  content: string;
  reasoning: string;
}

interface AIAssistance {
  suggestions: AISuggestion[];
  enhancedContent: {
    title: string;
    description: string;
    keywords: string;
  } | null;
  helpfulText: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  formType,
  category,
  currentFields,
  onSuggestionApply,
  className = '',
  inputPlaceholder,
  skills = [],
  categories,
  governorates,
  rating,
}) => {
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [assistance, setAssistance] = useState<AIAssistance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');

  const getAIAssistance = useCallback(async () => {
    if (!userInput.trim()) {
      setError('يرجى إدخال وصف للخدمة أولاً');
      return;
    }

    if (!category || category.trim() === '') {
      setError('يرجى اختيار الفئة أولاً');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        formType,
        category,
        userInput,
        currentFields,
        skills,
      };
      
      console.log('AI Assistant Request:', requestBody);
      console.log('Access Token:', accessToken ? 'Present' : 'Missing');
      
      const response = await fetch('/api/ai/assist-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setAssistance(data.data);
      } else {
        setError(data.error?.message || 'فشل في الحصول على المساعدة');
      }
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setError('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  }, [userInput, formType, category, currentFields, accessToken, skills]);

  const handleApplySuggestion = (suggestion: AISuggestion) => {
    onSuggestionApply(suggestion.type, suggestion.content);
  };

  // ---
  // NOTE: When using in 'نشر خدمة' (service posting), the AI prompt and UI should be curated for providers.
  // When using in 'طلب خدمة' (service request), curate for seekers. Adjust the backend prompt and UI labels accordingly.
  // ---

  const handleApplyEnhancedContent = (e?: React.MouseEvent) => {
    // Prevent form submission if button is inside a form
    if (e) e.preventDefault();
    if (assistance?.enhancedContent) {
      if (assistance.enhancedContent.title) {
        onSuggestionApply('title', assistance.enhancedContent.title);
      }
      if (assistance.enhancedContent.description) {
        onSuggestionApply('description', assistance.enhancedContent.description);
      }
      if (assistance.enhancedContent.keywords) {
        onSuggestionApply('keywords', assistance.enhancedContent.keywords);
      }
    }
  };

  return (
    <BaseCard className={`p-6 border-l-4 border-[#F5A623] bg-gradient-to-br from-white via-orange-50 to-teal-50 shadow-md ${className}`}>
      {/* Instructions */}
      <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-900 text-sm text-right">
        <span className="font-semibold">تعليمات:</span> اختر الفئة أولاً، وحدد المحافظة والمدينة من القوائم المتاحة، وأضف وصفاً واضحاً للخدمة. الذكاء الاصطناعي على علم بجميع الفئات والمحافظات والمدن المتوفرة ولن يقترح خيارات غير موجودة. أضف أيضاً مواعيد التوفر والوسوم (الكلمات المفتاحية) لتحصل على أفضل اقتراحات.
        {categories && categories.length > 0 && (
          <div className="mt-2 text-xs text-orange-800">
            <span className="font-semibold">الفئات المتاحة:</span> {categories.join('، ')}
          </div>
        )}
        {governorates && governorates.length > 0 && (
          <div className="mt-1 text-xs text-orange-800">
            <span className="font-semibold">المحافظات المتاحة:</span> {governorates.map(g => g.name).join('، ')}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#F5A623]" />
        <h3 className="text-lg font-bold text-[#0e1b18]">
          المساعد الذكي
        </h3>
      </div>
      <div className="space-y-4">
        {/* Input Section */}
        {/* Show rating first, then skills, above the input (unified order with PricingGuidance) */}
        {typeof rating === 'number' && (
          <div className="mb-2 flex items-center gap-2 justify-end">
            <span className="text-sm font-semibold text-[#0e1b18]">تقييمك الحالي:</span>
            <span className="text-base font-bold text-[#F5A623]">{rating.toFixed(2)} / 5</span>
            <span className="text-yellow-400">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
          </div>
        )}
        {skills && skills.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 justify-end">
            <span className="text-sm font-semibold text-[#0e1b18]">مهاراتك:</span>
            {skills.map((skill, idx) => (
              <span key={idx} className="bg-[#F5A623]/10 text-[#F5A623] px-2 py-1 rounded-full text-xs font-cairo border border-[#F5A623]/30">{skill}</span>
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-[#0e1b18] text-right mb-2">
            اكتب عنواناً مختصراً للخدمة (مثال: سباك لإصلاح تسرب المياه)
          </label>
          <FormTextarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={inputPlaceholder || "مثال: أحتاج سباك محترف لإصلاح تسرب في الحمام..."}
            rows={3}
            required
            label={undefined}
          />
        </div>
        {/* Get Assistance Button */}
        <Button
          onClick={getAIAssistance}
          loading={isLoading}
          disabled={!userInput.trim() || !category || category.trim() === ''}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          <div className="flex items-center justify-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span>احصل على المساعدة الذكية</span>
          </div>
        </Button>
        {/* Category Requirement Notice */}
        {(!category || category.trim() === '') && (
          <div className="text-sm text-gray-600 text-right">
            * يجب اختيار الفئة أولاً لاستخدام المساعد الذكي
          </div>
        )}
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}
        {/* AI Suggestions */}
        {assistance && (
          <div className="space-y-4">
            {/* Helpful Text */}
            {assistance.helpfulText && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm text-right">{assistance.helpfulText}</p>
              </div>
            )}
            {/* Individual Suggestions */}
            {assistance.suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-[#0e1b18] text-right">
                  الاقتراحات:
                </h4>
                {assistance.suggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <Button
                        onClick={() => handleApplySuggestion(suggestion)}
                        variant="primary"
                        size="xs"
                        className="flex-shrink-0"
                      >
                        <CheckCircle className="w-3 h-3 ml-1" />
                        تطبيق
                      </Button>
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm bg-[#F5A623] text-white px-2 py-1 rounded">
                            {suggestion.type === 'title' ? 'العنوان' : 
                             suggestion.type === 'description' ? 'الوصف' : 'الكلمات المفتاحية'}
                          </span>
                        </div>
                        <p className="text-sm text-[#0e1b18] mb-1">{suggestion.content}</p>
                        <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Enhanced Content */}
            {assistance.enhancedContent && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <h4 className="font-semibold text-green-800">
                    محتوى محسن جاهز
                  </h4>
                </div>
                <Button
                  onClick={handleApplyEnhancedContent}
                  variant="primary"
                  size="sm"
                  className="w-full"
                  type="button"
                >
                  تطبيق المحتوى المحسن
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseCard>
  );
};

export default AIAssistant; 