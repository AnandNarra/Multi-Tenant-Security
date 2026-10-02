import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCampaignById } from '../../api/campaignApi';
import CampaignStatusBadge from '../../components/user/CampaignStatusBadge';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const UserCampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);

  const fetchDetails = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setErrorStatus(null);

      try {
        const res = await getCampaignById(id);
        if (res?.success && res.data?.campaign) {
          setCampaign(res.data.campaign);
        } else if (res?.campaign) {
          setCampaign(res.campaign);
        } else if (res?.data) {
          setCampaign(res.data);
        } else {
          setErrorStatus(404);
        }
      } catch (err) {
        console.error('Fetch user campaign details error:', err);
        const status = err.response?.status || 500;
        setErrorStatus(status);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id, fetchDetails]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-5 bg-slate-200 rounded w-36 animate-pulse" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs animate-pulse space-y-4">
          <div className="h-7 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // 404 Not Found State
  if (errorStatus === 404 || !campaign) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Link
          to="/user/campaigns"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors inline-block"
        >
          &larr; Back to My Campaigns
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">Campaign not found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            This campaign is no longer available or does not exist.
          </p>
          <div className="mt-5">
            <Link
              to="/user/campaigns"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors inline-block"
            >
              Return to My Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generic Error State
  if (errorStatus) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Link
          to="/user/campaigns"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors inline-block"
        >
          &larr; Back to My Campaigns
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">Unable to load campaign</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            There was an issue retrieving this campaign. Please try again later.
          </p>
          <div className="mt-5">
            <button
              onClick={() => fetchDetails(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignedUsers = Array.isArray(campaign.assignedUsers) ? campaign.assignedUsers : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Top Controls */}
      <div className="flex items-center justify-between">
        <Link
          to="/user/campaigns"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          &larr; Back to My Campaigns
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDetails(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Campaign Details Hero Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Campaign Information
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {campaign.name}
            </h1>
          </div>
          <CampaignStatusBadge status={campaign.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block mb-1">Description</span>
            <p className="text-slate-700 leading-relaxed">
              {campaign.description || (
                <span className="italic text-slate-400">No description provided</span>
              )}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div>
              <span className="text-slate-400 font-semibold block">Created Date</span>
              <span className="text-slate-700 font-medium">
                {formatDate(campaign.createdAt)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Last Updated</span>
              <span className="text-slate-700 font-medium">
                {formatDate(campaign.updatedAt || campaign.createdAt)}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div>
              <span className="text-slate-400 font-semibold block">Assigned Team Members</span>
              <span className="text-xl font-bold text-slate-900">{assignedUsers.length}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Campaign ID</span>
              <span className="font-mono text-slate-600 text-[10px] break-all">
                {campaign.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Users Section (Read-only) */}
      {assignedUsers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Assigned Team Members</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Team members allocated to this security campaign.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {u.name || 'Member'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {u.role || 'USER'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCampaignDetails;
