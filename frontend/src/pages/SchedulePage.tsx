import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Filter, Download, Plus, Edit, Trash } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BaseCard from '../components/ui/BaseCard';
import Button from '../components/ui/Button';
import ScheduleCalendar from '../components/ui/ScheduleCalendar';
import useSchedule from '../hooks/useSchedule';
import Modal from '../admin/components/UI/Modal';

interface ScheduleItem {
  id: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed';
  serviceTitle: string;
  seekerName: string;
  location: string;
}

const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { schedule, loading, error, refetch } = useSchedule(user?.id);
  
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);

  // Filter schedule based on selected status
  const filteredSchedule = selectedStatus === 'all' 
    ? schedule 
    : schedule.filter(item => item.status === selectedStatus);

  const handleItemClick = (item: ScheduleItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleItemDelete = async (itemId: string) => {
    // TODO: Implement delete functionality with backend API
    console.log('Delete item:', itemId);
    await refetch();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export schedule');
  };

  const statusOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'pending', label: 'في الانتظار' },
    { value: 'confirmed', label: 'مؤكد' },
    { value: 'completed', label: 'مكتمل' }
  ];

  if (!user || !user.roles.includes('provider')) {
    return (
      <div className="min-h-screen flex flex-col bg-warm-cream">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-deep-teal text-lg text-center">
            يجب أن تكون مقدم خدمات للوصول إلى صفحة الجدول.<br />
            <Button variant="primary" className="mt-4" onClick={() => window.history.back()}>
              العودة
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-warm-cream">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-8 w-8 text-deep-teal" />
              <h1 className="text-3xl font-bold text-deep-teal">جدول مواعيدي</h1>
            </div>
            <p className="text-text-secondary">
              إدارة مواعيدك وتتبع الخدمات المقدمة
            </p>
          </div>

          {/* Controls */}
          <BaseCard className="mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-deep-teal" />
                  <span className="text-sm font-medium text-deep-teal">تصفية:</span>
                </div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-deep-teal focus:border-deep-teal"
                  aria-label="تصفية حسب الحالة"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  تصدير
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  إضافة موعد
                </Button>
              </div>
            </div>
          </BaseCard>

          {/* Schedule Calendar */}
          <BaseCard>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deep-teal"></div>
                <span className="mr-3 text-deep-teal">جاري تحميل الجدول...</span>
              </div>
            )}

            {error && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <ScheduleCalendar
                schedule={filteredSchedule}
                mode="editable"
                onItemClick={handleItemClick}
                onItemDelete={handleItemDelete}
                className="w-full"
              />
            )}
          </BaseCard>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <BaseCard className="text-center">
              <div className="text-2xl font-bold text-deep-teal mb-2">
                {schedule.filter(item => item.status === 'pending').length}
              </div>
              <div className="text-sm text-text-secondary">في الانتظار</div>
            </BaseCard>
            
            <BaseCard className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {schedule.filter(item => item.status === 'confirmed').length}
              </div>
              <div className="text-sm text-text-secondary">مؤكد</div>
            </BaseCard>
            
            <BaseCard className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {schedule.filter(item => item.status === 'completed').length}
              </div>
              <div className="text-sm text-text-secondary">مكتمل</div>
            </BaseCard>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        title={selectedItem ? "تعديل الموعد" : "إضافة موعد جديد"}
        size="md"
      >
        <div className="space-y-4">
          {selectedItem ? (
            <div>
              <p className="text-sm text-text-secondary mb-4">
                تعديل تفاصيل الموعد المحدد
              </p>
              {/* TODO: Add edit form */}
              <div className="text-center text-text-secondary">
                نموذج التعديل سيتم إضافته لاحقاً
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-text-secondary mb-4">
                إضافة موعد جديد إلى جدولك
              </p>
              {/* TODO: Add new appointment form */}
              <div className="text-center text-text-secondary">
                نموذج الإضافة سيتم إضافته لاحقاً
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setSelectedItem(null);
              }}
            >
              إلغاء
            </Button>
            <Button variant="primary">
              حفظ
            </Button>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
};

export default SchedulePage; 