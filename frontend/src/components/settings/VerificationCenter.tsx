import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SettingsSection from './SettingsSection';
import SettingsCard from './SettingsCard';
import FormInput from '../ui/FormInput';
import { useAuth } from '../../contexts/AuthContext';

const steps = [
  'معلومات البطاقة الشخصية',
  'صورة شخصية (سيلفي)',
  'فيش وتشبيه (اختياري)',
  'مراجعة وإرسال',
];

const VerificationCenter: React.FC = () => {
  const { accessToken } = useAuth();
  // Remove isProvider check, allow all users

  const [step, setStep] = useState(0);
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [criminalRecord, setCriminalRecord] = useState<string | null>(null);
  const [criminalRecordDate, setCriminalRecordDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'not_submitted'>('not_submitted');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showStepper, setShowStepper] = useState(false);

  // Fetch verification status on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/verification/status', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          // User has a verification record
          setStatus(data.data.status || 'not_submitted');
          setExplanation(data.data.explanation || '');
        } else if (res.status === 400 && data.error?.message === 'No verification found') {
          // User has no verification record yet - this is normal for new users
          setStatus('not_submitted');
          setExplanation('');
        } else {
          // Other error cases
          console.warn('Verification status check failed:', data);
          setStatus('not_submitted');
          setExplanation('');
        }
      } catch (error) {
        // Network or other errors
        console.warn('Verification status check error:', error);
        setStatus('not_submitted');
        setExplanation('');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const handleFileUpload = async (file: File, setter: (url: string) => void) => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const imgbbApiKey = import.meta.env.VITE_IMGBB_API_KEY;
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setter(data.data.url);
      } else {
        setError('فشل رفع الصورة');
      }
    } catch {
      setError('حدث خطأ أثناء رفع الصورة');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        idFrontUrl: idFront,
        idBackUrl: idBack,
        selfieUrl: selfie,
        criminalRecordUrl: criminalRecord,
        criminalRecordIssuedAt: criminalRecordDate || undefined,
      };
      const res = await fetch('/api/verification/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('تم إرسال طلب التحقق بنجاح! سيتم مراجعته من قبل الإدارة.');
        setStatus('pending');
        setShowStepper(false);
      } else {
        setError(data.error?.message || 'حدث خطأ أثناء إرسال الطلب');
      }
    } catch {
      setError('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  // Stepper content
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <FormInput
                type="file"
                label="صورة البطاقة (الوجه الأمامي)"
                accept="image/*"
                onChange={e => e.target.files && handleFileUpload(e.target.files[0], setIdFront)}
                helperText="يجب أن تكون الصورة واضحة، بإضاءة جيدة، وزوم مناسب."
                variant="default"
                size="md"
              />
              {idFront && <img src={idFront} alt="id front" className="mt-2 rounded-lg w-32 border" />}
            </div>
            <div>
              <FormInput
                type="file"
                label="صورة البطاقة (الوجه الخلفي)"
                accept="image/*"
                onChange={e => e.target.files && handleFileUpload(e.target.files[0], setIdBack)}
                helperText="يجب أن تكون الصورة واضحة، بإضاءة جيدة، وزوم مناسب."
                variant="default"
                size="md"
              />
              {idBack && <img src={idBack} alt="id back" className="mt-2 rounded-lg w-32 border" />}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <FormInput
                type="file"
                label="صورة شخصية (سيلفي)"
                accept="image/*"
                onChange={e => e.target.files && handleFileUpload(e.target.files[0], setSelfie)}
                helperText="يجب أن تكون الصورة حديثة وواضحة."
                variant="default"
                size="md"
              />
              {selfie && <img src={selfie} alt="selfie" className="mt-2 rounded-lg w-32 border" />}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <FormInput
                type="file"
                label="فيش وتشبيه (اختياري)"
                accept="image/*"
                onChange={e => e.target.files && handleFileUpload(e.target.files[0], setCriminalRecord)}
                helperText="يجب أن يكون صادراً خلال آخر 3 أشهر."
                variant="default"
                size="md"
              />
              {criminalRecord && <img src={criminalRecord} alt="criminal record" className="mt-2 rounded-lg w-32 border" />}
              <FormInput
                type="date"
                label="تاريخ الإصدار"
                value={criminalRecordDate}
                onChange={e => setCriminalRecordDate(e.target.value)}
                helperText="يجب أن يكون صادراً خلال آخر 3 أشهر."
                variant="default"
                size="md"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-text-primary text-lg">مراجعة البيانات:</span>
              <div className="flex gap-4">
                <div>
                  <span className="block text-xs text-deep-teal font-semibold">بطاقة أمامية</span>
                  {idFront && <img src={idFront} alt="id front" className="rounded-lg w-20 border" />}
                </div>
                <div>
                  <span className="block text-xs text-deep-teal font-semibold">بطاقة خلفية</span>
                  {idBack && <img src={idBack} alt="id back" className="rounded-lg w-20 border" />}
                </div>
                <div>
                  <span className="block text-xs text-deep-teal font-semibold">سيلفي</span>
                  {selfie && <img src={selfie} alt="selfie" className="rounded-lg w-20 border" />}
                </div>
                <div>
                  <span className="block text-xs text-deep-teal font-semibold">فيش وتشبيه</span>
                  {criminalRecord && <img src={criminalRecord} alt="criminal record" className="rounded-lg w-20 border" />}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={loading || !idFront || !idBack || !selfie} className="bg-deep-teal text-white">إرسال الطلب</Button>
              <Button variant="secondary" onClick={() => setStep(0)}>تعديل</Button>
            </div>
            {error && <div className="text-red-500 mt-2">{error}</div>}
            {success && <div className="text-green-600 mt-2">{success}</div>}
          </div>
        );
      default:
        return null;
    }
  };

  // Status badge
  const statusBadge = () => {
    switch (status) {
      case 'pending':
        return <Badge variant="status">قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="status">تم التحقق</Badge>;
      case 'rejected':
        return <Badge variant="urgency">مرفوض - {explanation}</Badge>;
      default:
        return <Badge variant="category">لم يتم التقديم</Badge>;
    }
  };

  return (
    <SettingsSection
      title="مركز التحقق"
      description="التحقق من هويتك لفتح الميزات الإضافية وزيادة الثقة"
      icon={Shield}
    >
      <SettingsCard title="التحقق من الهوية">
        <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-deep-teal/5 to-bright-orange/5 border border-deep-teal/10">
          <div className="flex items-center gap-4">
            <div className="bg-deep-teal p-4 rounded-full text-white">
              <CheckCircle size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-text-primary text-lg">التحقق من الهوية</h4>
              <p className="text-text-secondary mt-1">التحقق من هويتك لفتح الميزات الإضافية وبناء الثقة مع المستخدمين الآخرين.</p>
              <div className="mt-2">{statusBadge()}</div>
            </div>
          </div>
          {status !== 'pending' && status !== 'approved' && (
            <Button className="bg-bright-orange text-white font-semibold py-3 px-6 rounded-xl hover:bg-bright-orange/90 transform hover:scale-105 transition-all duration-300 shadow-lg" onClick={() => setShowStepper(true)}>
              تحقق الآن
            </Button>
          )}
        </div>
        {/* Stepper Modal */}
        {showStepper && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative" dir="rtl">
              <button className="absolute left-4 top-4 text-gray-400 hover:text-red-500" onClick={() => setShowStepper(false)}>
                ×
              </button>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="text-deep-teal" size={20} />
                  <span className="font-bold text-deep-teal">التحقق من الهوية</span>
                </div>
                <div className="flex gap-2 mb-4">
                  {steps.map((s, i) => (
                    <div key={i} className={`flex-1 h-2 rounded-full ${i <= step ? 'bg-deep-teal' : 'bg-gray-200'}`}></div>
                  ))}
                </div>
                <div className="text-text-primary font-semibold mb-2">{steps[step]}</div>
              </div>
              {renderStep()}
              <div className="flex justify-between mt-8">
                <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>السابق</Button>
                {step < steps.length - 1 && (
                  <Button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={loading}>التالي</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  );
};

export default VerificationCenter; 