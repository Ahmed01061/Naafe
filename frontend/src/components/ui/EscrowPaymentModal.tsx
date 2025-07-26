import React from 'react';
import Modal from '../../admin/components/UI/Modal';
import Button from './Button';
import { CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import dayjs from 'dayjs';

interface EscrowPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceTitle: string;
  providerName: string;
  amount: number;
  scheduledDate?: string;
  scheduledTime?: string;
  loading?: boolean;
}

const EscrowPaymentModal: React.FC<EscrowPaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  serviceTitle,
  providerName,
  amount,
  scheduledDate,
  scheduledTime,
  loading = false
}) => {
  const formattedDate = scheduledDate ? dayjs(scheduledDate).format('YYYY-MM-DD') : 'غير محدد';
  const formattedTime = scheduledTime || 'غير محدد';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="دفع الضمان للخدمة">
      <div className="space-y-6">
        {/* Service Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-text-primary">تفاصيل الخدمة المتفق عليها</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">الخدمة:</span> {serviceTitle}</p>
            <p><span className="font-medium">مقدم الخدمة:</span> {providerName}</p>
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4 text-deep-teal" />
              <p><span className="font-medium">التاريخ المجدول:</span> {formattedDate}</p>
            </div>
            <p><span className="font-medium">الوقت المجدول:</span> {formattedTime}</p>
          </div>
        </div>

        {/* Amount Display */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            المبلغ المتفق عليه (جنيه مصري)
          </label>
          <div className="relative">
            <div className="p-3 border rounded-md bg-gray-50 flex items-center">
              <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-text-primary font-semibold">{amount} جنيه</span>
            </div>
          </div>
        </div>

        {/* Escrow Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">معلومات مهمة حول الدفع للضمان:</p>
              <ul className="space-y-1 text-sm">
                <li>• سيتم حفظ المبلغ في نظام الضمان حتى إكمال الخدمة</li>
                <li>• بعد إكمال الخدمة، يمكنك تحرير المبلغ لمقدم الخدمة</li>
                <li>• إذا تم إلغاء الخدمة قبل 12 ساعة من الموعد، سيتم استرداد كامل المبلغ</li>
                <li>• إذا تم الإلغاء قبل أقل من 12 ساعة، سيتم استرداد 70% فقط من المبلغ</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'جاري التحميل...' : 'متابعة للدفع'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EscrowPaymentModal; 