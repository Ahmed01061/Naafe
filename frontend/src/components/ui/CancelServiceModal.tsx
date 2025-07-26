import React, { useState } from 'react';
import Modal from '../../admin/components/UI/Modal';
import Button from './Button';
import FormTextarea from './FormTextarea';
import { AlertTriangle, X, Info } from 'lucide-react';

interface CancelServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  serviceTitle: string;
  providerName: string;
  serviceDatetime?: string; // ISO date string
  loading?: boolean;
}

const CancelServiceModal: React.FC<CancelServiceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  serviceTitle,
  providerName,
  serviceDatetime,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Calculate if service is less than 12 hours away
  const isNearService = (): boolean => {
    if (!serviceDatetime) return false;
    
    const serviceDate = new Date(serviceDatetime);
    const now = new Date();
    const diffHours = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return diffHours < 12;
  };
  
  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('يرجى إدخال سبب الإلغاء');
      return;
    }
    onConfirm(reason.trim());
  };

  // Reset form when modal closes
  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  const nearServiceWarning = isNearService();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="طلب إلغاء الخدمة">
      <div className="space-y-6">
        {/* Service Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <X className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-text-primary">معلومات الخدمة</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">الخدمة:</span> {serviceTitle}</p>
            <p><span className="font-medium">مقدم الخدمة:</span> {providerName}</p>
            {serviceDatetime && (
              <p>
                <span className="font-medium">تاريخ ووقت الخدمة:</span>{' '}
                {new Date(serviceDatetime).toLocaleString('ar-EG')}
              </p>
            )}
          </div>
        </div>

        {/* Cancellation Warning */}
        <div className={`${nearServiceWarning ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 ${nearServiceWarning ? 'text-red-600' : 'text-yellow-600'} mt-0.5 flex-shrink-0`} />
            <div className={`text-sm ${nearServiceWarning ? 'text-red-800' : 'text-yellow-800'}`}>
              <p className="font-medium mb-1">سياسة الإلغاء:</p>
              {nearServiceWarning ? (
                <p className="font-bold">تنبيه: الخدمة مجدولة خلال أقل من 12 ساعة! سيتم رد 70% فقط من المبلغ المدفوع.</p>
              ) : (
                <p>بما أن الخدمة مجدولة بعد أكثر من 12 ساعة، سيتم رد 100% من المبلغ المدفوع.</p>
              )}
              <ul className="space-y-1 text-sm mt-2">
                <li>• إلغاء قبل 12 ساعة أو أكثر من موعد الخدمة: استرداد 100%</li>
                <li>• إلغاء قبل أقل من 12 ساعة من موعد الخدمة: استرداد 70% فقط</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            سبب طلب الإلغاء <span className="text-red-500">*</span>
          </label>
          <FormTextarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder="يرجى ذكر سبب طلب إلغاء الخدمة..."
            rows={3}
            disabled={loading}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          <p className="text-sm text-text-secondary mt-1">
            <Info className="inline w-3 h-3 mr-1" />
            سيتم مراجعة طلب الإلغاء وإبلاغك بالنتيجة
          </p>
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'جاري المعالجة...' : 'تأكيد طلب الإلغاء'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelServiceModal; 