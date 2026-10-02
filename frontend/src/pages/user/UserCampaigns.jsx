import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCampaigns } from '../../api/campaignApi';
import CampaignStatusBadge from '../../components/user/CampaignStatusBadge';

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const ITEMS_PER_PAGE = 10;

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const UserCampaigns = () => {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  const fetchCampaignList = useCallback(
    async (isManual = false, pageOverride) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

      try {
        const params = {
          page: targetPage,
          limit: ITEMS_PER_PAGE,
        };
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await getCampaigns(params);
        let list = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && typeof res === 'object') {
          if (Array.isArray(res.data?.campaigns)) {
            list = res.data.campaigns;
            if (res.data.pagination) setPagination(res.data.pagination);
          } else if (Array.isArray(res.campaigns)) {
            list = res.campaigns;
            if (res.pagination) setPagination(res.pagination);
          } else if (Array.isArray(res.data)) {
            list = res.data;
            if (res.pagination) setPagination(res.pagination);
          }
        }
        setCampaigns(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Fetch user campaigns error:', err);
        setCampaigns([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, statusFilter, searchQuery]
  );

  useEffect(() => {
    fetchCampaignList(false, 1);
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaignList(false, currentPage);
  }, [currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCampaignList(false, 1);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const totalResults = pagination.total || campaigns.length;
  const startResult = totalResults === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, totalResults);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              My Campaigns
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Assigned Scope
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            View campaigns assigned to you.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCampaignList(true)}
            disabled={refreshing || loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
            title="Refresh campaigns"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex gap-2">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campaigns Table View */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700">No campaigns assigned</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try adjusting your search or status filter options.'
                        : 'Your organization has not assigned any campaigns to you yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <button
                        onClick={() => navigate(`/user/campaigns/${camp.id}`)}
                        className="hover:text-indigo-600 font-semibold text-left cursor-pointer"
                      >
                        {camp.name}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <CampaignStatusBadge status={camp.status} />
                    </td>

                    <td
                      className="py-3.5 px-4 text-slate-600 max-w-xs truncate"
                      title={camp.description}
                    >
                      {camp.description || (
                        <span className="text-slate-400 italic">No description</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(camp.updatedAt || camp.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/user/campaigns/${camp.id}`)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{startResult}</span> to{' '}
            <span className="font-semibold text-slate-700">{endResult}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalResults}</span> campaigns
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="font-medium text-slate-700 px-1">
              Page {currentPage} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= (pagination.totalPages || 1) || loading}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCampaigns;
