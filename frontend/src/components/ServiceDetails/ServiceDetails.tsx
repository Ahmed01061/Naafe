import React from 'react';
import { MapPin, Calendar, DollarSign, Clock, Tag, User, CheckCircle } from 'lucide-react';
import Badge from '../ui/Badge';

interface ServiceUser {
  name?: { first?: string; last?: string } | string;
  roles?: string[];
  isVerified?: boolean;
}

interface ServiceDetailsProps {
  service: {
    title?: string;
    description?: string;
    status?: string;
    category?: string;
    budget?: { min?: number; max?: number };
    timeline?: string;
    location?: { city?: string; government?: string; address?: string };
    postedDate?: string;
    createdAt?: string;
    postedBy?: ServiceUser;
    seeker?: ServiceUser;
    additionalDetails?: string;
    tags?: string[];
    workingDays?: string[];
    startTime?: string;
    endTime?: string;
  };
}

const ServiceDetails: React.FC<ServiceDetailsProps> = ({ service }) => {
  console.log('ServiceDetails render:', service);
  console.log('Service postedBy:', service?.postedBy);
  console.log('Service seeker:', service?.seeker);
  
  if (!service) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير متوفر';
    try {
      return new Date(dateString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'غير متوفر';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { label: 'مفتوح', className: 'bg-green-100 text-green-800' },
      'assigned': { label: 'تم التعيين', className: 'bg-blue-100 text-blue-800' },
      'in_progress': { label: 'قيد التنفيذ', className: 'bg-yellow-100 text-yellow-800' },
      'completed': { label: 'مكتمل', className: 'bg-gray-100 text-gray-800' },
      'cancelled': { label: 'ملغي', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Safe property access
  const title = service.title || 'عنوان غير محدد';
  const description = service.description || 'لا يوجد وصف متاح';
  const status = service.status || 'open';
  const category = service.category || 'غير محدد';
  const budget = service.budget || {};
  const timeline = service.timeline;
  const location = service.location || {};
  const postedDate = service.postedDate || service.createdAt;
  const postedBy = service.postedBy || {};
  const additionalDetails = service.additionalDetails;
  const tags = service.tags || [];

  // Debug all fields to ensure no objects are being rendered
  console.log('Service fields:', {
    title: typeof title,
    description: typeof description,
    status: typeof status,
    category: typeof category,
    budget: typeof budget,
    timeline: typeof timeline,
    location: typeof location,
    postedDate: typeof postedDate,
    postedBy: typeof postedBy,
    additionalDetails: typeof additionalDetails,
    tags: typeof tags
  });

  // Ensure all fields are strings or numbers, not objects
  const safeTitle = typeof title === 'string' ? title : 'عنوان غير محدد';
  const safeDescription = typeof description === 'string' ? description : 'لا يوجد وصف متاح';
  const safeStatus = typeof status === 'string' ? status : 'open';
  const safeCategory = typeof category === 'string' ? category : 'غير محدد';
  const safeTimeline = typeof timeline === 'string' ? timeline : undefined;
  const safeAdditionalDetails = typeof additionalDetails === 'string' ? additionalDetails : undefined;

  // Safe name extraction for postedBy
  const getPostedByName = (postedBy: ServiceUser | undefined) => {
    if (!postedBy || !postedBy.name) return 'مستخدم غير معروف';
    
    if (typeof postedBy.name === 'object') {
      const firstName = postedBy.name.first || '';
      const lastName = postedBy.name.last || '';
      return `${firstName} ${lastName}`.trim() || 'مستخدم غير معروف';
    }
    
    return postedBy.name || 'مستخدم غير معروف';
  };

  const postedByName = getPostedByName(postedBy);

  // Safe name extraction for seeker (if it exists in service data)
  const getSeekerName = (seeker: ServiceUser | undefined) => {
    if (!seeker || !seeker.name) return 'مستخدم غير معروف';
    
    if (typeof seeker.name === 'object') {
      const firstName = seeker.name.first || '';
      const lastName = seeker.name.last || '';
      return `${firstName} ${lastName}`.trim() || 'مستخدم غير معروف';
    }
    
    return seeker.name || 'مستخدم غير معروف';
  };

  // Check if we have seeker data and use it as fallback for postedBy
  const finalPostedByName = postedByName === 'مستخدم غير معروف' && service.seeker 
    ? getSeekerName(service.seeker) 
    : postedByName;

  // Helper: check if user is verified
  const isVerified = (user: ServiceUser | undefined) => {
    if (!user) return false;
    return !!user.isVerified;
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-lg p-6 text-right border border-deep-teal/10">
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2 text-deep-teal leading-tight">{safeTitle}</h1>
          {safeStatus && (
            <div className="mb-3">
              {getStatusBadge(safeStatus)}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-text-primary leading-relaxed text-lg">{safeDescription}</p>
      </div>

      {/* Key Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Category */}
        <div className="flex items-center gap-3 p-3 bg-warm-cream rounded-lg">
          <Tag className="h-5 w-5 text-deep-teal flex-shrink-0" />
          <div>
            <div className="text-sm text-deep-teal/70">الفئة</div>
            <div className="font-semibold text-deep-teal">{safeCategory}</div>
          </div>
        </div>

        {/* Budget */}
        <div className="flex items-center gap-3 p-3 bg-warm-cream rounded-lg">
          <DollarSign className="h-5 w-5 text-deep-teal flex-shrink-0" />
          <div>
            <div className="text-sm text-deep-teal/70">الميزانية</div>
            <div className="font-semibold text-deep-teal">
              {budget.min ? budget.min.toLocaleString('ar-EG') : 'غير محدد'} - {budget.max ? budget.max.toLocaleString('ar-EG') : 'غير محدد'} جنيه
            </div>
          </div>
        </div>

        {/* Timeline */}
        {safeTimeline && (
          <div className="flex items-center gap-3 p-3 bg-warm-cream rounded-lg">
            <Clock className="h-5 w-5 text-deep-teal flex-shrink-0" />
            <div>
              <div className="text-sm text-deep-teal/70">المدة المتوقعة</div>
              <div className="font-semibold text-deep-teal">{safeTimeline}</div>
            </div>
          </div>
        )}

        {/* Location */}
        {location && (location.city || location.government) && (
          <div className="flex items-center gap-3 p-3 bg-warm-cream rounded-lg">
            <MapPin className="h-5 w-5 text-deep-teal flex-shrink-0" />
            <div>
              <div className="text-sm text-deep-teal/70">الموقع</div>
              <div className="font-semibold text-deep-teal">
                {location.city || ''} {location.government || ''}
              </div>
              {location.address && (
                <div className="text-sm text-deep-teal/70">{location.address}</div>
              )}
            </div>
          </div>
        )}

        {/* Posted Date */}
        {postedDate && (
          <div className="flex items-center gap-3 p-3 bg-warm-cream rounded-lg">
            <Calendar className="h-5 w-5 text-deep-teal flex-shrink-0" />
            <div>
              <div className="text-sm text-deep-teal/70">تاريخ النشر</div>
              <div className="font-semibold text-deep-teal">{formatDate(postedDate)}</div>
            </div>
          </div>
        )}

        {/* Posted By */}
        {postedBy && postedBy.name && (
          <div className="flex items-center gap-3 p-3 bg-warm-cream rounded-lg">
            <User className="h-5 w-5 text-deep-teal flex-shrink-0" />
            <div>
              <div className="text-sm text-deep-teal/70">نشر بواسطة</div>
              <div className="font-semibold text-deep-teal flex items-center gap-2">
                {finalPostedByName}
                {isVerified(postedBy) && (
                  <Badge variant="status" size="sm" className="inline-flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500 inline" />
                    <span>موثّق</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Working Days & Time Range */}
        {(service.workingDays && service.workingDays.length > 0) && (
          <div className="flex items-center gap-3 p-3 bg-warm-cream rounded-lg">
            <Clock className="h-5 w-5 text-deep-teal flex-shrink-0" />
            <div>
              <div className="text-sm text-deep-teal/70">مواعيد التوفر</div>
              <div className="font-semibold text-deep-teal">
                {service.workingDays.map((day: string, idx: number) => (
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
                {service.startTime && service.endTime && (
                  <span> ({service.startTime} - {service.endTime})</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Details */}
      {safeAdditionalDetails && (
        <div className="mb-4 p-4 bg-deep-teal/5 rounded-lg border border-deep-teal/10">
          <h3 className="font-semibold text-deep-teal mb-2">تفاصيل إضافية</h3>
          <p className="text-text-primary">{safeAdditionalDetails}</p>
        </div>
      )}

      {/* Tags/Skills */}
      {tags && tags.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-deep-teal mb-2">المهارات المطلوبة</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: string, index: number) => (
              <Badge key={index} variant="category" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetails;