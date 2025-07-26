import React, { useState } from 'react';
import Modal from '../../admin/components/UI/Modal';
import Button from './Button';
import FormTextarea from './FormTextarea';
import FormSelect from './FormSelect';
import { AlertTriangle } from 'lucide-react';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (problemType: string, description: string) => void;
  providerName: string;
  serviceTitle: string;
  loading?: boolean;
}

const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  providerName,
  serviceTitle,
  loading = false
}) => {
  const [problemType, setProblemType] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ problemType?: string; description?: string }>({});

  const problemTypes = [
    { value: 'late', label: 'تأخر في الموعد' },
    { value: 'no_show', label: 'لم يحضر مقدم الخدمة' },
    { value: 'incomplete_work', label: 'لم يكمل العمل المطلوب' },
    { value: 'poor_quality', label: 'جودة العمل سيئة' },
    { value: 'rude_behavior', label: 'سلوك غير لائق' },
    { value: 'price_dispute', label: 'خلاف على السعر' },
    { value: 'other', label: 'مشكلة أخرى' }
  ];

  const handleSubmit = () => {
    const newErrors: { problemType?: string; description?: string } = {};
    
    if (!problemType) {
      newErrors.problemType = 'يرجى اختيار نوع المشكلة';
    }
    if (!description.trim()) {
      newErrors.description = 'يرجى كتابة تفاصيل المشكلة';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onSubmit(problemType, description);
  };

  const handleClose = () => {
    setProblemType('');
    setDescription('');
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="الإبلاغ عن مشكلة">
      <div className="space-y-6">
        {/* Service Information */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">تفاصيل الخدمة</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">الخدمة:</span> {serviceTitle}</p>
            <p><span className="font-medium">مقدم الخدمة:</span> {providerName}</p>
          </div>
        </div>

        {/* Problem Type */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-primary">
            نوع المشكلة
          </label>
          <FormSelect
            value={problemType}
            onChange={(e) => setProblemType(e.target.value)}
            disabled={loading}
            className="w-full"
            options={problemTypes}
            placeholder="اختر نوع المشكلة"
          />
          {errors.problemType && (
            <p className="text-sm text-red-600">{errors.problemType}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-primary">
            تفاصيل المشكلة
          </label>
          <FormTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="اشرح المشكلة بالتفصيل..."
            className="resize-none"
            rows={4}
            maxLength={1000}
            disabled={loading}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-text-secondary">
              {description.length}/1000
            </p>
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">معلومات مهمة:</h4>
          <ul className="text-sm text-blue-700 space-y-1 text-right">
            <li>• سيتم مراجعة البلاغ من قبل فريق الدعم الفني</li>
            <li>• يرجى تقديم أدلة أو صور إن أمكن</li>
            <li>• سنتواصل معك في أقرب وقت ممكن</li>
            <li>• البلاغات الكاذبة قد تؤدي إلى تعليق الحساب</li>
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
            إلغاء
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={loading || !problemType || !description.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                جاري الإرسال...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 ml-2" />
                إرسال البلاغ
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportProblemModal; 