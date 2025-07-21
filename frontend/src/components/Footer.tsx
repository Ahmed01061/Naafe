

import Button from './ui/Button';

const Footer = () => {
  const footerSections = [
    {
      title: 'الفئات',
      links: [
        { label: 'إصلاح المنزل', href: '#' },
        { label: 'التنظيف', href: '#' },
        { label: 'الدراسة', href: '#' },
        { label: 'المزيد...', href: '#' },
      ],
    },
    {
      title: 'حول',
      links: [
        { label: 'من نحن', href: '#' },
        { label: 'الوظائف', href: '#' },
        { label: 'الصحافة', href: '#' },
      ],
    },
    {
      title: 'الدعم',
      links: [
        { label: 'مركز المساعدة', href: '/help' },
        { label: 'اتصل بنا', href: '#' },
        { label: 'الثقة والأمان', href: '#' },
      ],
    },
    {
      title: 'المجتمع',
      links: [
        { label: 'المدونة', href: '#' },
        { label: 'المنتدى', href: '#' },
        { label: 'الفعاليات', href: '#' },
      ],
    },
  ];

  return (
    <footer className="footer bg-deep-teal text-white p-10">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-2xl font-bold mb-4">
              <img 
                src="/images/logo-no-bg.png" 
                alt="شعار نافع" 
                className="h-12 w-auto brightness-0 invert"
              />
              <span>نافع</span>
            </div>
            <p className="text-sm text-accent"></p>
            <p className="text-sm text-light-cream">
              نربطك بالخدمات المحلية الموثوقة.
            </p>
          </div>
          
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="flex flex-col gap-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href} 
                      className="text-sm text-light-cream hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="divider"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-light-cream">© 2025 نافع. جميع الحقوق محفوظة.</p>
          <div className="mt-4 sm:mt-0 flex gap-4">
            <Button
              variant="link"
              size="sm"
              className="text-light-cream hover:text-white transition-colors"
            >
              الشروط
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-light-cream hover:text-white transition-colors"
            >
              الخصوصية
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;