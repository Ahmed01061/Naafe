import React from 'react';
import AdPlacement from './ui/AdPlacement';
import Header from './Header';
import Footer from './Footer';

const AdSystemTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-warm-cream">
      <Header />
      <main className="pt-20 pb-8">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-deep-teal mb-4">
              اختبار نظام الإعلانات
            </h1>
            <p className="text-text-secondary">
              هذه الصفحة تعرض جميع أنواع الإعلانات في المنصة
            </p>
          </div>

          {/* Homepage Ads */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-deep-teal mb-4">إعلانات الصفحة الرئيسية</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر العلوي</h3>
                <AdPlacement location="homepage" type="top" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر السفلي</h3>
                <AdPlacement location="homepage" type="bottom" />
              </div>
            </div>
          </section>

          {/* Categories Ads */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-deep-teal mb-4">إعلانات صفحة الفئات</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر العلوي</h3>
                <AdPlacement location="categories" type="top" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">إعلان داخلي</h3>
                <AdPlacement location="categories" type="interstitial" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر السفلي</h3>
                <AdPlacement location="categories" type="bottom" />
              </div>
            </div>
          </section>

          {/* Search Ads */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-deep-teal mb-4">إعلانات صفحة البحث</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر العلوي</h3>
                <AdPlacement location="search" type="top" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">إعلان داخلي</h3>
                <AdPlacement location="search" type="interstitial" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر السفلي</h3>
                <AdPlacement location="search" type="bottom" />
              </div>
            </div>
          </section>

          {/* Mobile Responsive Test */}
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-deep-teal mb-4">اختبار التجاوب مع الهواتف</h2>
            <p className="text-text-secondary mb-4">
              جرب تغيير حجم النافذة لرؤية كيف تظهر الإعلانات على الأجهزة المختلفة
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر العلوي (الموبايل)</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <AdPlacement location="homepage" type="top" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-3">البانر السفلي (الموبايل)</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <AdPlacement location="homepage" type="bottom" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdSystemTest; 