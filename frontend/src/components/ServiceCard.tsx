
import React from 'react';
import { MapPin, Star } from 'lucide-react';
import BaseCard from './ui/BaseCard';
import Button from './ui/Button';
import PremiumBadge from './ui/PremiumBadge';
import { translateCategory } from '../utils/helpers';
import { ServiceProvider } from '../types';

interface ServiceCardProps {
  provider: ServiceProvider;
  onViewDetails: (providerId: string) => void;
  featured?: boolean;
}

// Helper to format time as 12-hour with Arabic AM/PM
function formatTimeArabic12hr(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const hour12 = ((h % 12) || 12);
  const ampm = h < 12 ? 'ص' : 'م';
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const ServiceCard = ({ provider, onViewDetails, featured }: ServiceCardProps) => {
  // Format member since
  let memberSinceText = '';
  if (provider.memberSince) {
    try {
      const date = new Date(provider.memberSince);
      memberSinceText = `عضو منذ: ${date.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}`;
    } catch {}
  }
  // Compact budget format
  let budgetText = '';
  if (provider.budgetMin && provider.budgetMax && provider.budgetMin !== provider.budgetMax) {
    budgetText = `يبدأ من ${provider.budgetMin} جنيه إلى ${provider.budgetMax} جنيه`;
  } else if (provider.budgetMin) {
    budgetText = `يبدأ من ${provider.budgetMin} جنيه`;
  }
  // Format skills
  const skillsText = provider.skills && provider.skills.length > 0
    ? provider.skills.join('، ')
    : '';
  return (
    <BaseCard className={`
      h-full flex flex-col hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1
      relative
      ${featured
        ? 'border-4 border-yellow-500 bg-gradient-to-br from-yellow-100 via-orange-50 to-yellow-200 shadow-2xl overflow-hidden'
        : provider.isPremium
          ? 'border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 shadow-xl hover:shadow-2xl overflow-hidden'
          : 'border border-gray-200 hover:border-soft-teal/30'
      }
      ${provider.isTopRated ? 'ring-2 ring-teal-300' : ''}
    `}>
      {/* Featured Tag - Top Right */}
      {featured && (
        <span className="absolute right-4 top-4 z-30 text-xs font-bold bg-yellow-400 text-white px-3 py-1 rounded-full shadow-lg border-2 border-yellow-600">
          مميز
        </span>
      )}
      {/* Category Badge - Top Left Absolute */}
      <span className="absolute left-4 top-4 z-20 text-base font-bold bg-soft-teal/30 text-deep-teal px-4 py-1 rounded-lg whitespace-nowrap" style={{ fontSize: '1.1rem' }}>
        {translateCategory(provider.category)}
      </span>
      {/* Premium Background Effect */}
      {(provider.isPremium || featured) && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 pointer-events-none"></div>
      )}
      <div className="relative z-10 p-5 flex flex-col h-full">
        {/* Header Section - Avatar and Name */}
        <div className="flex items-start gap-4 mb-2">
          {/* Avatar Container */}
          <div className="flex-shrink-0 relative">
            <img
              src={provider.imageUrl || '/default-avatar.png'}
              alt={`${provider.name} profile`}
              className={`w-20 h-20 rounded-full object-cover border-2 ${
                (provider.isPremium || featured) ? 'border-yellow-400' : 'border-gray-200'
              }`}
            />
            {(provider.isPremium || featured) && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <PremiumBadge size="md" />
              </div>
            )}
            {provider.isVerified && (
              <div className="absolute -top-2 right-0">
                <span className="inline-block bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow">موثوق</span>
              </div>
            )}
          </div>
          {/* Provider Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-deep-teal truncate leading-tight mb-1">
              {typeof provider.name === 'object' && provider.name !== null && 'first' in provider.name && 'last' in provider.name
                ? `${(provider.name as { first: string; last: string }).first} ${(provider.name as { first: string; last: string }).last}`
                : provider.name}
            </h3>
            {/* Address */}
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span className="text-base text-text-secondary truncate font-semibold">
                {provider.location || 'غير محدد'}
              </span>
            </div>
            {/* Member Since */}
            {memberSinceText && (
              <div className="text-xs text-text-secondary mt-1">{memberSinceText}</div>
            )}
          </div>
        </div>
        {/* Service Title */}
        {provider.title && (
          <div className="mb-2">
            <span className="block text-lg font-bold text-[#2D5D4F] leading-tight">{provider.title}</span>
          </div>
        )}
        {/* Budget - Full width, bold, never truncated */}
        {budgetText && (
          <div className="mb-2">
            <span className="block text-lg font-extrabold text-green-700" style={{ direction: 'rtl' }}>{budgetText}</span>
          </div>
        )}
        {/* Skills */}
        {skillsText && (
          <div className="text-base text-[#50958A] mt-1 font-bold">المهارات: {skillsText}</div>
        )}
        {/* Availability */}
        {provider.workingDays && provider.workingDays.length > 0 && (
          <div className="text-base text-[#50958A] mt-1 font-bold">
            <span>مواعيد التوفر: </span>
            {provider.workingDays.map((day: string, idx: number) => (
              <span key={day}>{idx > 0 ? '، ' : ''}{
                {
                  sunday: 'الأحد',
                  monday: 'الاثنين',
                  tuesday: 'الثلاثاء',
                  wednesday: 'الأربعاء',
                  thursday: 'الخميس',
                  friday: 'الجمعة',
                  saturday: 'السبت'
                }[day] || day
              }</span>
            ))}
            {provider.startTime && provider.endTime && (
              <span> (
                {formatTimeArabic12hr(provider.startTime)} - {formatTimeArabic12hr(provider.endTime)}
              )</span>
            )}
          </div>
        )}
        {/* Description - Flexible Height with Line Clamp */}
        <div className="flex-1 mb-2 mt-2">
          <p className="text-base text-text-primary line-clamp-3 leading-relaxed">
            {provider.description || 'لا يوجد وصف متاح لهذا المقدم.'}
          </p>
        </div>
        {/* Stats Row - Completed Jobs, Rating */}
        <div className="grid grid-cols-2 gap-2 mb-2 text-center">
          <div className="bg-gray-50 rounded-lg p-1">
            <div className="text-sm font-bold text-deep-teal">{provider.completedJobs}</div>
            <div className="text-xs text-text-secondary">مهمة</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-1">
            <div className="text-sm font-bold text-bright-orange flex items-center justify-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {typeof provider.rating === 'number' && !isNaN(provider.rating) ? provider.rating.toFixed(1) : 'غير متوفر'}
            </div>
            <div className="text-xs text-text-secondary">تقييم</div>
          </div>
        </div>
        {/* Action Section - Fixed Height */}
        <div className="mt-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => onViewDetails(provider.id)}
            className="w-full"
          >
            عرض التفاصيل
          </Button>
        </div>
      </div>
    </BaseCard>
  );
};

export default ServiceCard; 