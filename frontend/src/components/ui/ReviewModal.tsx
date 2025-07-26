import React, { useState } from 'react';
import Modal from '../../admin/components/UI/Modal';
import Button from './Button';
import FormTextarea from './FormTextarea';
import { Star, Send } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  providerName: string;
  serviceTitle: string;
  loading?: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  providerName,
  serviceTitle,
  loading = false
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = () => {
    if (rating === 0) {
      alert('يرجى اختيار تقييم');
      return;
    }
    onSubmit(rating, comment);
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    onHover, 
    onLeave,
    interactive = true 
  }: { 
    rating: number; 
    onRatingChange?: (rating: number) => void;
    onHover?: (rating: number) => void;
    onLeave?: () => void;
    interactive?: boolean;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRatingChange?.(star)}
            onMouseEnter={() => interactive && onHover?.(star)}
            onMouseLeave={() => interactive && onLeave?.()}
            disabled={!interactive || loading}
            className={`transition-colors duration-200 ${
              interactive ? 'hover:scale-110' : ''
            }`}
            aria-label={`تقييم ${star} نجوم`}
            title={`تقييم ${star} نجوم`}
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hoveredRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="تقييم مقدم الخدمة">
      <div className="space-y-6">
        {/* Service Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-text-primary mb-2">تفاصيل الخدمة</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">الخدمة:</span> {serviceTitle}</p>
            <p><span className="font-medium">مقدم الخدمة:</span> {providerName}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-primary">
            التقييم العام
          </label>
          <div className="flex flex-col items-center gap-3">
            <StarRating
              rating={rating}
              onRatingChange={setRating}
              onHover={setHoveredRating}
              onLeave={() => setHoveredRating(0)}
            />
            <p className="text-sm text-text-secondary">
              {rating === 0 && 'اختر تقييمك'}
              {rating === 1 && 'سيء جداً'}
              {rating === 2 && 'سيء'}
              {rating === 3 && 'مقبول'}
              {rating === 4 && 'جيد'}
              {rating === 5 && 'ممتاز'}
            </p>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-primary">
            تعليقك (اختياري)
          </label>
          <FormTextarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب تعليقك عن الخدمة..."
            className="resize-none"
            rows={4}
            maxLength={500}
            disabled={loading}
          />
          <p className="text-sm text-text-secondary text-left">
            {comment.length}/500
          </p>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">نصائح للتقييم الجيد:</h4>
          <ul className="text-sm text-blue-700 space-y-1 text-right">
            <li>• اكتب عن جودة العمل المنجز</li>
            <li>• اذكر مدى الالتزام بالمواعيد</li>
            <li>• اكتب عن التعامل والاحترافية</li>
            <li>• تجنب التعليقات المسيئة أو غير المناسبة</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            تخطي
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 ml-2" />
                إرسال التقييم
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReviewModal; 