import React, { useState } from 'react';
import { Calendar, Clock, User, MapPin, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ScheduleItem {
  id: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed';
  serviceTitle: string;
  seekerName: string;
  location: string;
}

interface ScheduleCalendarProps {
  schedule: ScheduleItem[];
  mode: 'readonly' | 'editable';
  onItemClick?: (item: ScheduleItem) => void;
  onItemDelete?: (itemId: string) => void;
  className?: string;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedule,
  mode = 'readonly',
  onItemClick,
  onItemDelete,
  className = ''
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 6 }); // Saturday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'completed':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getItemsForDate = (date: Date) => {
    return schedule.filter(item => isSameDay(parseISO(item.date), date));
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={handlePreviousWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="الأسبوع السابق"
        >
          <Calendar className="h-5 w-5 text-deep-teal" />
        </button>
        
        <h3 className="text-lg font-semibold text-deep-teal">
          {format(weekStart, 'MMMM yyyy', { locale: ar })}
        </h3>
        
        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="الأسبوع التالي"
        >
          <Calendar className="h-5 w-5 text-deep-teal" />
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 p-4">
        {weekDays.map((day, index) => {
          const dayItems = getItemsForDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border rounded-lg ${
                isToday ? 'bg-deep-teal/10 border-deep-teal' : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Day Header */}
              <div className="text-center mb-2">
                <div className={`text-sm font-medium ${
                  isToday ? 'text-deep-teal' : 'text-gray-600'
                }`}>
                  {format(day, 'EEE', { locale: ar })}
                </div>
                <div className={`text-lg font-bold ${
                  isToday ? 'text-deep-teal' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Schedule Items */}
              <div className="space-y-1">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                      getStatusColor(item.status)
                    } ${mode === 'editable' ? 'hover:bg-opacity-80' : ''}`}
                    onClick={() => onItemClick?.(item)}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {getStatusIcon(item.status)}
                      <span className="font-medium truncate">{item.timeSlot}</span>
                    </div>
                    <div className="truncate font-medium">{item.serviceTitle}</div>
                    <div className="flex items-center gap-1 text-xs opacity-75">
                      <User className="h-3 w-3" />
                      <span className="truncate">{item.seekerName}</span>
                    </div>
                    {mode === 'editable' && onItemDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemDelete(item.id);
                        }}
                        className="mt-1 text-red-600 hover:text-red-800 text-xs"
                        aria-label="حذف"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>مؤكد</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span>في الانتظار</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span>مكتمل</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar; 