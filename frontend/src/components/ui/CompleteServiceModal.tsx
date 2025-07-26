import React from 'react';
import Modal from '../../admin/components/UI/Modal';
import Button from './Button';
import { CheckCircle, CreditCard, AlertTriangle } from 'lucide-react';

interface CompleteServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceTitle: string;
  providerName: string;
  amount: number;
  loading?: boolean;
}

const CompleteServiceModal: React.FC<CompleteServiceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  serviceTitle,
  providerName,
  amount,
  loading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تأكيد إكمال الخدمة">
      <div className="space-y-6">
        {/* Service Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-text-primary">تفاصيل الخدمة</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">الخدمة:</span> {serviceTitle}</p>
            <p><span className="font-medium">مقدم الخدمة:</span> {providerName}</p>
            <p><span className="font-medium">المبلغ المحجوز:</span> {amount} جنيه</p>
          </div>
        </div>

        {/* Completion Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">تنبيه هام:</p>
              <ul className="space-y-1 text-sm">
                <li>• تأكيد إكمال الخدمة يعني أن الخدمة قد تم تقديمها بشكل مرضي</li>
                <li>• بعد التأكيد، سيتم تحرير المبلغ المحجوز إلى مقدم الخدمة</li>
                <li>• لا يمكن التراجع عن هذه العملية بعد التأكيد</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Fund Release Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">تحرير الأموال:</p>
              <p>بتأكيدك على إكمال الخدمة، أنت توافق على تحرير مبلغ {amount} جنيه لمقدم الخدمة {providerName}.</p>
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
            {loading ? 'جاري التحميل...' : 'تأكيد إكمال الخدمة وتحرير المبلغ'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CompleteServiceModal; 