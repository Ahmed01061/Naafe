import React, { useEffect, useState } from 'react';
import ServiceCard from './ServiceCard';
import BaseCard from './ui/BaseCard';
import { ServiceProvider } from '../types';

const FeaturedProviders: React.FC = () => {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/providers/featured')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data.providers)) {
          setProviders(data.data.providers);
        } else {
          setError('فشل تحميل مقدمي الخدمات المميزين');
        }
      })
      .catch(() => setError('فشل تحميل مقدمي الخدمات المميزين'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 bg-gradient-to-b from-yellow-50 to-orange-50 font-arabic text-text-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-yellow-700">مقدمو الخدمات المميزون</h2>
          <p className="text-lg text-text-secondary mt-2">أفضل المحترفين الموثوقين على منصتنا</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, idx) => (
              <BaseCard key={idx} className="animate-pulse h-64" />
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
        ) : providers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <ServiceCard key={provider._id || provider.id} provider={{ ...provider, featured: true }} onViewDetails={() => window.location.href = `/provider/${provider._id || provider.id}`} featured />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-lg text-yellow-700">لا يوجد مقدمو خدمات مميزون حالياً</div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProviders; 