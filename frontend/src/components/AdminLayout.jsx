import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutGrid,
  ShieldCheck,
  AlertCircle,
  Users,
  FileText,
  LogOut,
  Building2,
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, organization, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutGrid },
    { name: 'Campaigns', path: '/admin/campaigns', icon: ShieldCheck },
    { name: 'Security Events', path: '/admin/events', icon: AlertCircle },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
  ];

  const orgName = organization?.name || 'Acme Security';
  const orgSlug = organization?.slug || 'acme-security';
  const userName = user?.name || user?.email?.split('@')[0] || 'Acme Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div className="p-4 space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7] flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Shield className="w-5 h-5 fill-white/20 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">
                Secure<span className="text-[#0284c7]">Tenant</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Admin panel</p>
            </div>
          </div>

          {/* Tenant Card */}
          <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 text-sm truncate leading-tight">
                  {orgName}
                </h2>
                <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                  slug: {orgSlug}
                </p>
              </div>
            </div>
            <span className="bg-[#E6F8F0] text-[#0D9488] border border-[#B2EAD6] text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0">
              Isolated
            </span>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              NAVIGATION
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 text-[#0284c7] border border-sky-200 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile & Sign Out */}
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm leading-tight truncate">
                {userName}
              </div>
              <span className="inline-block mt-0.5 bg-[#F3E8FF] text-[#9333EA] border border-[#E9D5FF] text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider">
                ADMIN
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area: Renders children or routed sub-component via Outlet */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default AdminLayout;
