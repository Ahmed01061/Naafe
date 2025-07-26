import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Helper: check if user is provider
  const isProvider = user && user.roles.includes('provider');
  
  const handleProviderAction = () => {
    if (!user) {
      navigate('/register');
    } else if (isProvider) {
      navigate('/post-service');
    } else {
      // Open upgrade modal - this will be handled by the Header component
      // We'll use a custom event to trigger the modal
      window.dispatchEvent(new CustomEvent('openUpgradeModal'));
    }
  };

  return (
    <section className="relative text-white text-center py-20 md:py-48 px-4 font-arabic overflow-hidden">
      {/* Parallax background */}
      <div
        className="absolute inset-0 bg-cover bg-center transform transition-transform duration-[1.5s] ease-out will-change-transform"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,128,128,0.5) 0%, rgba(0,64,64,0.9) 100%), url('/images/hero-section.png')",
          filter: 'blur(0px)',
          transform: 'scale(1.1)'
        }}
        aria-hidden="true"
      />
      {/* Mobile blur overlay with improved performance */}
      <div 
        className="absolute inset-0 md:hidden bg-black/20 backdrop-blur-[2px]" 
        style={{willChange: 'backdrop-filter'}} 
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-3xl mx-auto animate-fade-in">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 drop-shadow-lg" style={{textShadow: '0 2px 8px rgba(0,0,0,0.25)'}}>
          سوق خدماتك المحلي في مصر
        </h1>
        <div className="text-base sm:text-lg md:text-xl text-gray-200 mb-2 max-w-2xl mx-auto drop-shadow" style={{textShadow: '0 1px 4px rgba(0,0,0,0.18)'}}>
          <span className="inline-block bg-black/20 rounded-full px-4 py-1 font-semibold animate-fade-in-slow">خدمات منزلية، تعليمية، وأكثر!</span>
        </div>
        <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow" style={{textShadow: '0 1px 4px rgba(0,0,0,0.18)'}}>
          نافع تربطك بمحترفين مهرة لكل شيء من إصلاح المنازل إلى العناية الشخصية. ابحث عن مساعدة موثوقة اليوم.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 items-center w-full animate-fade-in-slow">
          <button
            className="min-w-[180px] cursor-pointer rounded-full h-14 px-8 flex items-center justify-center bg-white text-naafe-teal border-2 border-naafe-teal text-lg font-bold shadow-lg hover:bg-gray-100 hover:border-naafe-teal/80 transform hover:scale-105 active:scale-95 transition-all gap-2 focus:outline-none focus:ring-2 focus:ring-naafe-teal"
            onClick={() => navigate('/search')}
            aria-label="ابحث عن محترف"
          >
            <Search className="w-5 h-5" style={{ color: '#2d5d4f' }} aria-hidden="true" />
            <span className="truncate text-[#2d5d4f]">ابحث عن محترف</span>
          </button>
          <button
            className="min-w-[180px] cursor-pointer rounded-full h-14 px-8 flex items-center justify-center bg-[#ff5722] text-white text-lg font-bold shadow-lg hover:bg-[#e64a19] transform hover:scale-105 active:scale-95 transition-all gap-2 focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
            onClick={handleProviderAction}
            aria-label={isProvider ? "اعرض خدماتك" : "كن محترفًا"}
          >
            <UserPlus className="w-5 h-5 text-white" aria-hidden="true" />
            <span className="truncate">{isProvider ? "اعرض خدماتك" : "كن محترفًا"}</span>
          </button>
        </div>
      </div>
      {/* Scroll indicator with improved animation */}
      <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-20 flex flex-col items-center animate-bounce-slow">
        <span className="text-white/80 text-xs mb-1">مرر للأسفل</span>
        <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {/* Enhanced animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in { animation: fade-in 1s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-slow { animation: fade-in 1.6s cubic-bezier(.4,0,.2,1) both; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </section>
  );
};

export default Hero; 