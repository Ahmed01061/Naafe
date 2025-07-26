import React from 'react';

const steps = [
  {
    icon: (
      <svg fill="currentColor" className="w-9 h-9" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
      </svg>
    ),
    title: "1. ابحث عن محترف",
    description: "ابحث حسب الخدمة والموقع للعثور على المحترف المناسب لعملك.",
    details: "استخدم فلاتر متقدمة للبحث حسب الموقع، السعر، التقييم، والخدمات المطلوبة. تصفح الملفات الشخصية والمراجعات لاختيار الأفضل.",
    testimonial: "وجدت سباك ممتاز في دقائق! البحث كان سهل جداً."
  },
  {
    icon: (
      <svg fill="currentColor" className="w-9 h-9" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z" />
      </svg>
    ),
    title: "2. ناقش احتياجاتك",
    description: "تواصل مباشرة مع المحترفين لشرح متطلباتك واستلام عرض سعر.",
    details: "تواصل مباشرة عبر الرسائل أو المكالمات. شارك الصور والتفاصيل، واحصل على عروض أسعار مفصلة مع الجدول الزمني.",
    testimonial: "التواصل كان سلس ومريح. حصلت على 3 عروض ممتازة!"
  },
  {
    icon: (
      <svg fill="currentColor" className="w-9 h-9" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216v96H40ZM40,200V168H216v32Z" />
      </svg>
    ),
    title: "3. ادفع بأمان",
    description: "استخدم نظام الدفع الآمن للحصول على الخدمة.",
    details: "نظام دفع آمن ومضمون. الدفع يتم فقط بعد اكتمال الخدمة وموافقتك. ضمان استرداد كامل في حالة عدم الرضا.",
    testimonial: "الدفع كان سهل وآمن، وحصلت على إيصال فوري!"
  }
];

const HowItWorks: React.FC = () => {

  return (
    <section className="py-16 sm:py-24 bg-white font-arabic text-text-primary" id="how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">كيف يعمل</h2>
          <p className="text-lg text-text-secondary mt-2">خطوات بسيطة لإنجاز الأمور.</p>
        </div>
        
        {/* Progress Bar */}
        <div className="relative mb-12">
          {/* Single horizontal line behind all steps */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-deep-teal/50 z-0" style={{ transform: 'translateY(-50%)' }} />
          <div className="flex justify-between items-center relative z-10">
            {steps.map((_, index) => (
              <div key={index} className="flex flex-col items-center w-1/3">
                <div 
                  className="w-12 h-12 bg-deep-teal text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg transform hover:scale-110 transition-all duration-300"
                  style={{
                    animationDelay: `${index * 200}ms`,
                    animation: 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) backwards'
                  }}
                >
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-deep-teal rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              style={{
                animationDelay: `${index * 200 + 300}ms`,
                animation: 'fade-in-up 0.6s ease-out backwards'
              }}
            >
              <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 mx-auto">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-3">{step.title}</h3>
              <p className="text-white text-center mb-4">{step.description}</p>
              <div className="bg-warm-cream rounded-lg p-4">
                <p className="text-sm text-text-primary leading-relaxed">{step.details}</p>
                {step.testimonial && (
                  <div className="mt-3 pt-3 border-t border-deep-teal">
                    <p className="text-sm text-deep-teal italic">
                      "{step.testimonial}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add animations */}
        <style>{`
          @keyframes bounce-in {
            from {
              opacity: 0;
              transform: scale(0.3);
            }
            50% {
              transform: scale(1.1);
            }
            70% {
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        
        {/* Success Statistics */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-deep-teal mb-2">10K+</div>
              <div className="text-text-secondary">خدمة مكتملة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-deep-teal mb-2">5K+</div>
              <div className="text-text-secondary">محترف موثوق</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-deep-teal mb-2">98%</div>
              <div className="text-text-secondary">رضا العملاء</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-deep-teal mb-2">24/7</div>
              <div className="text-text-secondary">دعم متواصل</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks; 