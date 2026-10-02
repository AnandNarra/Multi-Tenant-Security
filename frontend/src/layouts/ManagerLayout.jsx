import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ManagerLayout = () => {
  const { user, organization, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/manager/dashboard' },
    { name: 'Campaigns', path: '/manager/campaigns' },
    { name: 'Security Events', path: '/manager/security-events' },
  ];

  const orgName = organization?.name || 'Organization';
  const orgSlug = organization?.slug || 'workspace';
  const userName = user?.name || user?.email?.split('@')[0] || 'Manager';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="font-bold text-base text-slate-900 leading-tight">
            Secure<span className="text-teal-600">Tenant</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">Manager Workspace</p>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? 'Close Menu' : 'Menu'}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex w-full md:w-64 min-h-screen bg-white border-r border-slate-200 flex-col justify-between shrink-0 md:sticky md:top-0 md:h-screen z-20`}
      >
        <div className="p-4 space-y-6">
          {/* Brand Header */}
          <div className="hidden md:block px-1 pt-1">
            <h1 className="font-bold text-lg text-slate-900 leading-tight">
              Secure<span className="text-teal-600">Tenant</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Manager Workspace</p>
          </div>

          {/* Tenant Card */}
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-sm truncate leading-tight">
                {orgName}
              </h2>
              <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                slug: {orgSlug}
              </p>
            </div>
            <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0">
              Manager Scope
            </span>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              NAVIGATION
            </div>

            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`
                }
              >
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Bottom Profile & Sign Out */}
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm leading-tight truncate">
                {userName}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              <span className="inline-block mt-1 bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider">
                MANAGER
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center py-2 px-3 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ManagerLayout;
