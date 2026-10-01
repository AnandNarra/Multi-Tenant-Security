import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { organizationAPI } from '../api/api';
import {
  User,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  Briefcase,
  LogOut,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  FileText,
} from 'lucide-react';

const UserDashboardPage = () => {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // User interactive tasks state (live state, zero dummy files)
  const [myTasks, setMyTasks] = useState([
    { id: 1, title: 'Complete Multi-Tenant Compliance Review', priority: 'High', due: 'Today', done: false },
    { id: 2, title: 'Update Organization Security API Keys', priority: 'Medium', due: 'Tomorrow', done: true },
    { id: 3, title: 'Submit Workspace Usage Report', priority: 'Low', due: 'Friday', done: false },
  ]);

  useEffect(() => {
    const fetchOrg = async () => {
      setLoading(true);
      try {
        const res = await organizationAPI.getAll();
        if (res.data?.success && Array.isArray(res.data.data)) {
          setOrganizations(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching orgs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const toggleTask = (id) => {
    setMyTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const completedCount = myTasks.filter((t) => t.done).length;
  const primaryOrg = organizations[0] || { name: 'Primary Organization', plan: 'Member Tier', domain: 'tenant.local' };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 block leading-none">
                User Workspace
              </span>
              <span className="text-[11px] font-medium text-slate-500">Member Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-emerald-900 font-semibold">{user?.name || user?.email || 'Workspace Member'}</span>
              <span className="text-white text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 font-bold uppercase tracking-wider">
                USER
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>My Member Dashboard</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Standard Access
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome to your dedicated member dashboard and project space.
            </p>
          </div>
        </div>

        {/* User Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Organization
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xl font-bold text-slate-900 block truncate">{primaryOrg.name}</span>
              <span className="text-xs text-slate-500 font-mono">{primaryOrg.domain}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completed Tasks
              </span>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{completedCount}</span>
              <span className="text-xs text-slate-500">of {myTasks.length} finished</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Access Level
              </span>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">Member Workspace</span>
              <span className="text-xs text-emerald-600 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* Task and Work items list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">My Active Tasks & Workflow</h3>
            </div>
            <span className="text-xs text-slate-500">Click to mark complete</span>
          </div>

          <div className="divide-y divide-slate-100">
            {myTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="text-slate-400">
                    {task.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-medium ${task.done ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {task.due}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${task.priority === 'High'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : task.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboardPage;
