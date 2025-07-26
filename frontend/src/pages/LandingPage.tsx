import Header from '../components/Header';
import Footer from '../components/Footer';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import Categories from '../components/landing/Categories';
import Testimonials from '../components/landing/Testimonials';
import BecomeAPro from '../components/landing/BecomeAPro';
import ScrollToTopButton from '../components/landing/ScrollToTopButton';
import FeaturedProviders from '../components/FeaturedProviders';
import AdPlacement from '../components/ui/AdPlacement';

const LandingPage = () => {
  return (
    <div className="relative flex min-h-screen flex-col bg-warm-cream text-text-primary font-arabic">
      <Header />
      <main className="flex-1">
        <Hero />
        
        {/* Top Banner Ad */}
        <div className="container mx-auto px-4 py-6">
          <AdPlacement location="homepage" type="top" />
        </div>
        
        <FeaturedProviders />
        <HowItWorks />
        <Categories />
        <Testimonials />
        <BecomeAPro />
        
        {/* Bottom Banner Ad */}
        <div className="container mx-auto px-4 py-6">
          <AdPlacement location="homepage" type="bottom" />
        </div>
      </main>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

export default LandingPage; 