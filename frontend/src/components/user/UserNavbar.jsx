import React from 'react';
import { useAuth } from '../../context/AuthContext';

const UserNavbar = ({ mobileOpen, setMobileOpen }) => {
  const { user } = useAuth();
  const userName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div>
        <h1 className="font-bold text-base text-slate-900 leading-tight">
          Secure<span className="text-indigo-600">Tenant</span>
        </h1>
        <p className="text-[10px] text-slate-400 font-medium">User Workspace</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg truncate max-w-[120px]">
          {userName}
        </span>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {mobileOpen ? 'Close Menu' : 'Menu'}
        </button>
      </div>
    </header>
  );
};

export default UserNavbar;
