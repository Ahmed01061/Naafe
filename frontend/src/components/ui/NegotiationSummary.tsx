import React, { useState, useRef, useEffect } from 'react';
import { NegotiationState, NegotiationTerms } from '../../contexts/OfferContext';
import { ServiceRequest } from '../../types';
import type { Offer } from '../../contexts/OfferContext';
import UnifiedInput from '../ui/FormInput';
import { DatePicker, TimePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import arEG from 'antd/locale/ar_EG';
import { CheckCircle2, XCircle, AlertCircle, Clock, CalendarDays, Tag, FileText, Palette, Shield } from 'lucide-react';

interface NegotiationSummaryProps {
  negotiation: NegotiationState;
  isProvider: boolean;
  isSeeker: boolean;
  jobRequest: ServiceRequest;
  offer: Offer;
  onEditSave?: (terms: NegotiationTerms) => void;
  onConfirm?: () => void;
  onReset?: () => void;
  isConfirming?: boolean;
  paymentCompleted?: boolean;
  serviceCompleted?: boolean;
}

const NegotiationSummary: React.FC<NegotiationSummaryProps> = ({
  negotiation,
  isProvider,
  isSeeker,
  offer,
  onEditSave,
  onConfirm,
  onReset,
  isConfirming,
  paymentCompleted = false,
  serviceCompleted = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTerms, setEditTerms] = useState<NegotiationTerms>({ ...negotiation?.currentTerms || {} });
  const confirmSectionRef = useRef<HTMLDivElement>(null);
  
  // Ensure the confirmation section is in view when needed
  useEffect(() => {
    // If there's a confirmation section and the user can take action
    if (confirmSectionRef.current && negotiation && 
        ((isSeeker && !negotiation.confirmationStatus.seeker) || 
         (isProvider && !negotiation.confirmationStatus.provider))) {
      // Ensure it's visible
      confirmSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [negotiation?.confirmationStatus, isSeeker, isProvider]);

  // Defensive: Warn if offer is missing or empty
  if (!offer || Object.keys(offer).length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-800">
        ⚠️ لم يتم العثور على بيانات العرض الخاصة بمقدم الخدمة. يرجى التأكد من تحميل البيانات بشكل صحيح.
      </div>
    );
  }

  if (!negotiation || !negotiation.currentTerms || !negotiation.confirmationStatus) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-deep-teal/10 text-center text-text-secondary">
        <div className="text-amber-500 flex justify-center mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>
        لا توجد بيانات تفاوض متاحة بعد. ابدأ التفاوض مع الطرف الآخر.
      </div>
    );
  }
  const { currentTerms, confirmationStatus, canAcceptOffer, lastUpdatedBy } = negotiation;

  const handleEditClick = () => {
    setEditTerms({ ...currentTerms });
    setIsEditing(true);
    if (onReset) onReset(); // Reset confirmations on edit
  };

  const handleSave = () => {
    if (onEditSave) onEditSave(editTerms);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTerms({ ...currentTerms });
  };

  const renderNegotiationStatus = () => {
    if (serviceCompleted) {
      return (
        <div className="bg-green-100 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-600 w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800">تم اكتمال الخدمة</p>
              <p className="text-sm text-green-700">تم تحرير المبلغ لمقدم الخدمة</p>
            </div>
          </div>
        </div>
      );
    } else if (paymentCompleted) {
      return (
        <div className="bg-blue-100 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600 w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-blue-800">الخدمة قيد التنفيذ</p>
              <p className="text-sm text-blue-700">تم إيداع الضمان وبدء تنفيذ الخدمة</p>
            </div>
          </div>
        </div>
      );
    } else if (canAcceptOffer) {
      return (
        <div className="bg-green-100 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-600 w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800">تم الاتفاق على جميع الشروط</p>
              <p className="text-sm text-green-700">يمكنك الآن قبول العرض والمتابعة للدفع</p>
            </div>
          </div>
        </div>
      );
    } else if (confirmationStatus.seeker || confirmationStatus.provider) {
      return (
        <div className="bg-amber-100 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="text-amber-600 w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-800">بانتظار الموافقة</p>
              <p className="text-sm text-amber-700">بانتظار تأكيد الطرف الآخر على شروط التفاوض</p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-blue-600 w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-blue-800">التفاوض جاري</p>
              <p className="text-sm text-blue-700">تناقش معك جميع تفاصيل الخدمة واتفق على جميع الشروط</p>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-deep-teal/10 mb-4 overflow-hidden">
      {/* Status Bar */}
      {renderNegotiationStatus()}

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-deep-teal">تفاصيل التفاوض</h3>
          {!isEditing && !canAcceptOffer && !paymentCompleted && !serviceCompleted && (
            <button 
              className="bg-warm-cream text-deep-teal px-3 py-1.5 rounded font-medium text-sm hover:bg-deep-teal/10 transition-colors" 
              onClick={handleEditClick}
            >
              تعديل الشروط
            </button>
          )}
        </div>
        
        <div className="space-y-3.5 text-right">
          {/* Original Offer Details - Always shown as reference */}
          <div className="bg-gray-50 p-3 rounded-lg mb-2">
            <h4 className="font-medium text-deep-teal mb-2">العرض الأصلي من مقدم الخدمة</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">السعر المقترح</p>
                  <p className="text-text-secondary">{offer?.price ? `${offer.price} جنيه` : 'غير محدد'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">التواريخ المتاحة</p>
                  <p className="text-text-secondary overflow-hidden text-ellipsis">
                    {(offer?.availableDates ?? []).length > 0 
                      ? (offer.availableDates ?? []).map((d: string, i: number, arr: string[]) => 
                        <span key={i}>{dayjs(d).format('YYYY-MM-DD')}{i < arr.length - 1 ? '، ' : ''}</span>) 
                      : 'غير محدد'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Negotiation Terms Section */}
          <div className="border border-gray-100 rounded-lg p-4">
            <h4 className="font-medium text-deep-teal mb-3">الشروط المتفق عليها</h4>
            
            {/* Editable fields: price agreed, date/time agreed, materials, scope */}
            {isEditing ? (
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-text-secondary text-sm">السعر المتفق عليه</label>
                  <UnifiedInput
                    type="number"
                    value={editTerms.price ?? ''}
                    onChange={e => setEditTerms((t: NegotiationTerms) => ({ ...t, price: Number(e.target.value) }))}
                    placeholder="أدخل السعر النهائي"
                    size="sm"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-text-secondary text-sm">التاريخ المتفق عليه</label>
                  <ConfigProvider locale={arEG}>
                    <DatePicker
                      format="YYYY-MM-DD"
                      value={editTerms.date ? dayjs(editTerms.date) : null}
                      onChange={val => setEditTerms((t: NegotiationTerms) => ({ ...t, date: val ? val.toISOString() : '' }))}
                      className="w-full"
                      placeholder="اختر التاريخ"
                      style={{ direction: 'rtl' }}
                      classNames={{ popup: { root: "custom-datepicker-dropdown" } }}
                      disabledDate={current => current && current < dayjs().startOf('day')}
                    />
                  </ConfigProvider>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-text-secondary text-sm">الوقت المتفق عليه</label>
                  <ConfigProvider locale={arEG}>
                    <TimePicker
                      use12Hours
                      showSecond={false}
                      format={(value) => {
                        if (!value) return '';
                        const hour = value.hour();
                        const minute = value.minute();
                        const period = hour < 12 ? 'ص' : 'م';
                        const hour12 = hour % 12 || 12;
                        return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
                      }}
                      value={editTerms.time ? dayjs(editTerms.time, 'HH:mm') : null}
                      onChange={val => setEditTerms((t: NegotiationTerms) => ({ ...t, time: val ? val.format('HH:mm') : '' }))}
                      className="w-full"
                      placeholder="اختر الوقت"
                      style={{ direction: 'rtl' }}
                      classNames={{ popup: { root: "custom-datepicker-dropdown" } }}
                    />
                  </ConfigProvider>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-text-secondary text-sm">الخامات المطلوبة</label>
                  <UnifiedInput
                    type="text"
                    value={editTerms.materials ?? ''}
                    onChange={e => setEditTerms((t: NegotiationTerms) => ({ ...t, materials: e.target.value }))}
                    placeholder="أدخل المواد المطلوبة"
                    size="sm"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-text-secondary text-sm">نطاق العمل</label>
                  <UnifiedInput
                    type="text"
                    value={editTerms.scope ?? ''}
                    onChange={e => setEditTerms((t: NegotiationTerms) => ({ ...t, scope: e.target.value }))}
                    placeholder="حدد نطاق العمل المطلوب"
                    size="sm"
                  />
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button 
                    type="submit" 
                    className="bg-deep-teal text-white px-4 py-2 rounded flex-1 hover:bg-deep-teal/90 transition-colors"
                  >
                    حفظ
                  </button>
                  <button 
                    type="button" 
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded flex-1 hover:bg-gray-200 transition-colors" 
                    onClick={handleCancel}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-deep-teal mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-secondary text-sm">السعر المتفق عليه</p>
                    <p className="text-text-primary">
                      {currentTerms.price 
                        ? `${currentTerms.price} جنيه` 
                        : <span className="text-amber-500 text-sm">لم يتم تحديده بعد</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 text-deep-teal mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-secondary text-sm">التاريخ المتفق عليه</p>
                    <p className="text-text-primary">
                      {currentTerms.date 
                        ? dayjs(currentTerms.date).format('YYYY-MM-DD') 
                        : <span className="text-amber-500 text-sm">لم يتم تحديده بعد</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-deep-teal mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-secondary text-sm">الوقت المتفق عليه</p>
                    <p className="text-text-primary">
                      {currentTerms.time 
                        ? dayjs(currentTerms.time, 'HH:mm').format('hh:mm A').replace('AM', 'ص').replace('PM', 'م') 
                        : <span className="text-amber-500 text-sm">لم يتم تحديده بعد</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Palette className="w-4 h-4 text-deep-teal mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-secondary text-sm">الخامات المطلوبة</p>
                    <p className="text-text-primary">
                      {currentTerms.materials 
                        ? currentTerms.materials 
                        : <span className="text-amber-500 text-sm">لم يتم تحديدها بعد</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-deep-teal mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-secondary text-sm">نطاق العمل</p>
                    <p className="text-text-primary">
                      {currentTerms.scope 
                        ? currentTerms.scope 
                        : <span className="text-amber-500 text-sm">لم يتم تحديده بعد</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Confirmation Status and Actions - Only show if payment not completed */}
          {!paymentCompleted && !serviceCompleted && (
            <div className="rounded-lg border border-gray-100 p-4" ref={confirmSectionRef}>
              <h4 className="font-medium text-deep-teal mb-3">حالة التأكيد</h4>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${confirmationStatus.seeker ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {confirmationStatus.seeker ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={confirmationStatus.seeker ? 'text-green-800' : 'text-gray-500'}>المشترك أكد</span>
                </div>
                
                <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${confirmationStatus.provider ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {confirmationStatus.provider ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={confirmationStatus.provider ? 'text-green-800' : 'text-gray-500'}>المزود أكد</span>
                </div>
              </div>
              
              {/* Action Buttons - Using fixed positioning for mobile */}
              <div className={`space-y-2 mt-4 ${((isSeeker && !confirmationStatus.seeker) || (isProvider && !confirmationStatus.provider)) ? "pb-2" : ""}`}>
                {/* Show confirm button for current user if not confirmed */}
                {((isSeeker && !confirmationStatus.seeker) || (isProvider && !confirmationStatus.provider)) && (
                  <button 
                    className="bg-green-600 text-white w-full py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 z-10"
                    onClick={onConfirm} 
                    disabled={isConfirming}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    تأكيد الموافقة على الشروط
                  </button>
                )}
                
                {/* Reset button if either confirmed */}
                {(confirmationStatus.seeker || confirmationStatus.provider) && (
                  <button 
                    className="border border-red-500 text-red-500 w-full py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    onClick={onReset}
                  >
                    <XCircle className="w-4 h-4" />
                    إعادة تعيين التأكيدات
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="text-xs text-text-secondary mt-4 text-center">
            آخر تعديل: {lastUpdatedBy || 'غير معروف'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationSummary; 