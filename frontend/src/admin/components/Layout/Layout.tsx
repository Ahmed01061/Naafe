import { useAuth } from '../../../contexts/AuthContext';
import { Outlet } from 'react-router-dom';
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastProvider } from '../../contexts/ToastContext';

const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading while user data is being fetched
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-2xl text-deep-teal">جاري تحميل لوحة التحكم...</div>;
  }

  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <ToastProvider>
      <div className="h-screen bg-warm-cream flex flex-col">
        <Header onMenuClick={toggleSidebar} title="Admin Dashboard" />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default AdminLayout;