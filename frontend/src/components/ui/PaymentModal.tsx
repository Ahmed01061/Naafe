import React, { useState, useEffect } from 'react';
import Modal from '../../admin/components/UI/Modal';
import Button from './Button';
import FormInput from './FormInput';
import { CreditCard, AlertCircle, CheckCircle, Shield, Clock } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  serviceTitle: string;
  providerName: string;
  negotiatedPrice?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  loading?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  serviceTitle,
  providerName,
  negotiatedPrice,
  scheduledDate,
  scheduledTime,
  loading = false
}) => {
  const [amount, setAmount] = useState('');

  // Set negotiated price when modal opens and price is available
  useEffect(() => {
    if (isOpen && negotiatedPrice) {
      setAmount(negotiatedPrice.toString());
    }
  }, [isOpen, negotiatedPrice]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value);
    }
  };

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || numAmount <= 0) {
      return;
    }

    if (numAmount < 1) {
      return;
    }

    onConfirm(numAmount);
  };

  const handleClose = () => {
    onClose();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    return new Date(dateStr).toLocaleDateString('ar-EG');
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'غير محدد';
    
    // Handle if time is in HH:mm format
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'م' : 'ص';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
    
    return timeStr;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="دفع ضمان الخدمة">
      <div className="space-y-6">
        {/* Escrow Banner */}
        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-primary mb-1">نظام الدفع الآمن (Escrow)</h3>
              <p className="text-sm text-text-secondary">سيتم حجز المبلغ في نظام الضمان حتى اكتمال الخدمة بشكل مرضي لك.</p>
            </div>
          </div>
        </div>

        {/* Service Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-text-primary">تفاصيل الخدمة المتفق عليها</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">الخدمة:</span> {serviceTitle}</p>
            <p><span className="font-medium">مقدم الخدمة:</span> {providerName}</p>
            <p><span className="font-medium">السعر المتفق عليه:</span> {negotiatedPrice ? `${negotiatedPrice} جنيه` : 'لم يتم الاتفاق على سعر محدد'}</p>
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">التاريخ:</span> {formatDate(scheduledDate)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">الوقت:</span> {formatTime(scheduledTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            المبلغ المراد دفعه (جنيه مصري)
          </label>
          <div className="relative">
            <FormInput
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="أدخل المبلغ"
              required
              className="pl-8"
              disabled={loading || !!negotiatedPrice}
            />
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm text-text-secondary mt-1">
            * سيتم تحويل المبلغ إلى الدولار الأمريكي عند الدفع
          </p>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">سياسة الإلغاء:</p>
              <ul className="space-y-1 text-amber-800">
                <li>• إلغاء قبل 12 ساعة من موعد الخدمة: استرداد 100% من المبلغ</li>
                <li>• إلغاء خلال أقل من 12 ساعة: استرداد 70% فقط من المبلغ</li>
                <li>• سيتم تحويل المبلغ تلقائياً لمقدم الخدمة بعد اكتمال الخدمة ورضاك عنها</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Information Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ملاحظات حول الدفع:</p>
              <ul className="space-y-1 text-sm">
                <li>• سيتم توجيهك إلى صفحة دفع آمنة من Stripe</li>
                <li>• يمكنك استخدام بطاقة ائتمان أو بطاقة الخصم المباشر</li>
                <li>• سيتم الاحتفاظ بالمبلغ في نظام الضمان حتى تأكيدك لاكتمال الخدمة</li>
                <li>• يمكنك إلغاء الخدمة في أي وقت وفقاً لسياسة الإلغاء</li>
              </ul>
            </div>
          </div>
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
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || !amount}
            className="flex-1"
          >
            {loading ? 'جاري التحميل...' : 'دفع الضمان'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal; 