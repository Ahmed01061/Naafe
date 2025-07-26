import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';

const defaultImage = 'https://via.placeholder.com/300x300?text=No+Image';

type Category = {
  _id?: string;
  name: string;
  image?: string;
  description?: string;
  tags?: string[];
  serviceCount?: number;
  rating?: number;
  icon?: string; // Added icon field
};

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data.categories)) {
          setCategories(data.data.categories.slice(0, 6));
        } else {
          setError('فشل تحميل الفئات');
        }
      })
      .catch(() => setError('فشل تحميل الفئات'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 sm:py-24 bg-warm-cream font-arabic text-text-primary" id="categories">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-deep-teal">الفئات المميزة</h2>
          <p className="text-lg text-text-secondary mt-2">استكشف الخدمات الشائعة.</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
              <p className="text-red-600 text-lg mb-2">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-red-600 hover:text-red-700 underline text-sm"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mb-12">
          {categories.map((category, index) => (
            <Link 
              to={`/search?category=${category._id}`}
              key={category._id || index}
              className="card bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-lg overflow-hidden group cursor-pointer transform hover:scale-105 hover:-translate-y-1"
              onMouseEnter={() => setHoveredCategory(index)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fade-in-up 0.6s ease-out backwards'
              }}
            >
              <div className="w-full aspect-square relative overflow-hidden">
                <img
                  src={category.icon || defaultImage}
                  alt={category.name}
                  className="w-full h-full object-cover rounded-t-lg group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => { (e.target as HTMLImageElement).src = defaultImage; }}
                  loading="lazy"
                />
                {/* Overlay with description */}
                {hoveredCategory === index && (
                  <div 
                    className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 animate-fade-in"
                    style={{backdropFilter: 'blur(2px)'}}
                  >
                    <p className="text-white text-sm text-center leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-3 text-center">
                <h3 className="font-bold text-deep-teal group-hover:text-bright-orange transition-colors">
                  {category.name}
                </h3>
                {category.serviceCount && (
                  <p className="text-sm text-text-secondary mt-1">
                    {category.serviceCount} خدمة
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
        )}
        {/* Add animations */}
        <style>{`
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
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
        `}</style>
        {/* View All Categories Button */}
        <div className="text-center">
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 px-8 py-3 bg-deep-teal text-white rounded-full hover:bg-deep-teal/90 transition-colors duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <TrendingUp className="w-5 h-5" />
            استكشف جميع الفئات
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        {/* Category Statistics */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-deep-teal mb-2">50+</div>
            <div className="text-text-secondary">فئة خدمية</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-deep-teal mb-2">5K+</div>
            <div className="text-text-secondary">خدمة نشطة</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-deep-teal mb-2">98%</div>
            <div className="text-text-secondary">رضا العملاء</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories; 