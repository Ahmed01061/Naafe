import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Settings, HelpCircle, LogOut, ChevronDown, CreditCard, Megaphone } from 'lucide-react';
import { User as UserType } from '../../types';
import { cn } from '../../utils/helpers';

interface UserDropdownProps {
  user: UserType;
  onLogout: () => Promise<void>;
  className?: string;
}

const UserDropdown = ({ user, onLogout, className = '' }: UserDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    await onLogout();
    setIsOpen(false);
  };

  const getUserInitials = (name: string | { first?: string; last?: string }) => {
    if (typeof name === 'string') {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (typeof name === 'object' && name) {
      return `${name.first?.charAt(0) || ''}${name.last?.charAt(0) || ''}`.toUpperCase();
    }
    return '';
  };

  const getUserFullName = (name: string | { first?: string; last?: string }) => {
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name) {
      return `${name.first || ''} ${name.last || ''}`.trim();
    }
    return '';
  };

  const menuItems = [
    {
      icon: User,
      label: 'الملف الشخصي',
      href: '/profile',
      onClick: () => setIsOpen(false)
    },
    {
      icon: Settings,
      label: 'الإعدادات',
      href: '/settings',
      onClick: () => setIsOpen(false)
    },
    {
      icon: HelpCircle,
      label: 'مركز المساعدة',
      href: '/help',
      onClick: () => setIsOpen(false)
    },
    // New Transactions menu item
    {
      icon: CreditCard,
      label: 'معاملاتي',
      href: '/transactions',
      onClick: () => setIsOpen(false)
    },
    // Ad Management menu item
    {
      icon: Megaphone,
      label: 'إدارة الإعلانات',
      href: '/ads',
      onClick: () => setIsOpen(false)
    },
    {
      icon: LogOut,
      label: 'تسجيل الخروج',
      href: '#',
      onClick: handleLogout,
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50'
    }
  ];

  // Add Admin Dashboard link if user is admin
  if (user.roles.includes('admin')) {
    menuItems.unshift({
      icon: User,
      label: 'لوحة تحكم المشرف',
      href: '/admin',
      onClick: () => setIsOpen(false),
    });
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-bright-orange/10 transition-colors focus:outline-none focus:ring-2 focus:ring-deep-teal/50"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="true"
        aria-label="قائمة المستخدم"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-deep-teal flex items-center justify-center">
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={`${getUserFullName(user.name)} profile`}
              className="w-full h-full object-cover"
            />
          ) : user.avatar ? (
            <img 
              src={user.avatar} 
              alt={`${getUserFullName(user.name)} profile`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-medium">
              {getUserInitials(user.name)}
            </span>
          )}
        </div>
        <ChevronDown 
          className={cn(
            'h-4 w-4 text-text-secondary transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-deep-teal flex items-center justify-center">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={`${getUserFullName(user.name)} profile`}
                    className="w-full h-full object-cover"
                  />
                ) : user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={`${getUserFullName(user.name)} profile`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-medium">
                    {getUserInitials(user.name)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {getUserFullName(user.name)}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  to={item.href}
                  onClick={item.onClick}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:text-deep-teal hover:bg-bright-orange/5 transition-colors',
                    item.className
                  )}
                >
                  <Icon className="h-4 w-4 text-deep-teal" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown; 