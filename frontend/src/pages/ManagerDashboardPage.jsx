import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { organizationAPI } from '../api/api';
import CampaignsManager from '../components/CampaignsManager';
import EventsManager from '../components/EventsManager';
import {
  Users,
  Building2,
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
  Search,
  LogOut,
  UserCheck,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

const ManagerDashboardPage = () => {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [searchQuery, setSearchQuery] = useState('');

  // Manager interactive workflow state (all live state, no dummy data file)
  const [approvalRequests, setApprovalRequests] = useState([
    { id: 'REQ-101', title: 'Q4 Budget Allocation', department: 'Engineering', requester: 'Sarah Miller', status: 'PENDING' },
    { id: 'REQ-102', title: 'New Cloud Resource Provisioning', department: 'DevOps', requester: 'Alex Chen', status: 'PENDING' },
    { id: 'REQ-103', title: 'Contractor Access Grant', department: 'Security', requester: 'David Kim', status: 'APPROVED' },
  ]);

  const [teamMembers, setTeamMembers] = useState([
    { id: 'MEM-1', name: 'Emily Watson', role: 'Lead Architect', email: 'emily@org.internal', status: 'Active', tasks: 4 },
    { id: 'MEM-2', name: 'Marcus Vance', role: 'Frontend Engineer', email: 'marcus@org.internal', status: 'Active', tasks: 6 },
    { id: 'MEM-3', name: 'Sophia Reed', role: 'Product Designer', email: 'sophia@org.internal', status: 'In Review', tasks: 2 },
  ]);

  useEffect(() => {
    const fetchOrgData = async () => {
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
    fetchOrgData();
  }, []);

  const handleApprove = (id) => {
    setApprovalRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'APPROVED' } : req))
    );
  };

  const handleReject = (id) => {
    setApprovalRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'REJECTED' } : req))
    );
  };

  const pendingCount = approvalRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 block leading-none">
                Manager Workspace
              </span>
              <span className="text-[11px] font-medium text-slate-500">Team Operations & Campaigns</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
              <span className="text-teal-900 font-semibold">{user?.name || user?.email || 'Manager User'}</span>
              <span className="text-white text-[10px] px-2 py-0.5 rounded-md bg-teal-600 font-bold uppercase tracking-wider">
                MANAGER
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
              <span>Operations & Team Control</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                Manager View
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Oversee campaigns, departmental operations, security events, and approval workflows.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-3 border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'campaigns'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'events'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Security Events</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'team'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Roster & Workload</span>
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'approvals'
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <span>Approval Pipeline</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'campaigns' ? (
          <CampaignsManager />
        ) : activeTab === 'events' ? (
          <EventsManager />
        ) : activeTab === 'team' ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Department Members</h3>
              <span className="text-xs text-slate-500 font-mono">Manager Scope: Operations</span>
            </div>
            <div className="divide-y divide-slate-100">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-base">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 text-sm">{member.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>{member.tasks} Active Tasks</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      {member.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Action Requests</h3>
              <span className="text-xs text-slate-500 font-mono">Manager Approval Required</span>
            </div>
            <div className="divide-y divide-slate-100">
              {approvalRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 text-sm">{req.title}</h4>
                        <span className="text-xs font-mono text-slate-400">({req.id})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Requested by <strong className="text-slate-700">{req.requester}</strong> &bull; Dept: {req.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-sm cursor-pointer"
                        >
                          Approve Request
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold ${req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManagerDashboardPage;
