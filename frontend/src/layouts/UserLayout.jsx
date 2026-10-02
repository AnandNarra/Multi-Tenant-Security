import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import UserSidebar from '../components/user/UserSidebar';
import UserNavbar from '../components/user/UserNavbar';

const UserLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <UserNavbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Sidebar Navigation */}
      <UserSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
