import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  List, 
  LogOut,
  Layers,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, className }) => {
  const { logout } = useAuth();
  const navItems = [
    { path: '/admin', icon: Home, label: 'لوحة التحكم' },
    { path: '/admin/users', icon: Users, label: 'المستخدمين' },
    { path: '/admin/identity-verifications', icon: Shield, label: 'التحقق من الهوية' },
    { path: '/admin/categories', icon: List, label: 'الفئات' },
    { path: '/admin/upgrade-requests', icon: List, label: 'طلبات الترقية' },
    { path: '/admin/complaints', icon: AlertTriangle, label: 'البلاغات' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 z-50 h-screen w-64 bg-deep-teal text-warm-cream transform transition-transform duration-300 ease-in-out lg:transform-none lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${className || ''}`}
      >
        <div className="flex h-full flex-col p-6 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 flex-shrink-0">
            <Layers className="h-8 w-8 text-warm-cream" />
            <h1 className="text-2xl font-bold text-warm-cream">Naafe'</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    {...(item.path === '/admin' ? { end: true } : {})}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-soft-teal/60 ${
                        isActive ? 'bg-soft-teal/80 text-orange-400 font-bold shadow' : 'text-warm-cream'
                      }`
                    }
                    onClick={onClose}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={`h-5 w-5 ${isActive ? 'text-orange-400' : 'text-warm-cream'}`} />
                        <span className="font-medium">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
              {/* Home Button styled as sidebar nav */}
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-soft-teal/60 ${
                      isActive ? 'bg-soft-teal/80 text-orange-400 font-bold shadow' : 'text-warm-cream'
                    }`
                  }
                  onClick={onClose}
                >
                  {({ isActive }) => (
                    <>
                      <Home className={`h-5 w-5 ${isActive ? 'text-orange-400' : 'text-warm-cream'}`} />
                      <span className="font-medium">العودة إلى الصفحة الرئيسية</span>
                    </>
                  )}
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* Logout */}
          <div className="mt-auto flex-shrink-0">
            <button 
              onClick={async () => {
                try {
                  await logout();
                } catch (error) {
                  console.error('Logout failed:', error);
                }
              }}
              className="flex w-full items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-soft-teal"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;