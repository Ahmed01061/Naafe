import React from 'react';
import { ExternalLink, Calendar } from 'lucide-react';
import Modal from '../../admin/components/UI/Modal';
import ScheduleCalendar from './ScheduleCalendar';
import useSchedule from '../../hooks/useSchedule';
import Button from './Button';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId?: string;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  providerId
}) => {
  const { schedule, loading, error } = useSchedule(providerId);

  const handleOpenFullSchedule = () => {
    window.open('/schedule', '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="جدول مواعيدك"
      size="xl"
    >
      <div className="space-y-4">
        {/* Header with link to full schedule */}
        <div className="flex items-center justify-between p-4 bg-deep-teal/5 rounded-lg border border-deep-teal/20">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-deep-teal" />
            <span className="text-sm text-deep-teal font-medium">
              عرض سريع لجدول مواعيدك
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenFullSchedule}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            فتح الجدول الكامل
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deep-teal"></div>
            <span className="mr-3 text-deep-teal">جاري تحميل الجدول...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Schedule Calendar */}
        {!loading && !error && (
          <ScheduleCalendar
            schedule={schedule}
            mode="readonly"
            className="w-full"
          />
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={onClose}
          >
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ScheduleModal; 