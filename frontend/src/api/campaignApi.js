import api from './api.js';

export const getCampaigns = async (params) => {
  const response = await api.get('/campaigns', { params });
  return response.data;
};

export const getCampaignById = async (id) => {
  const response = await api.get(`/campaigns/${id}`);
  return response.data;
};

export const createCampaign = async (data) => {
  const response = await api.post('/campaigns', data);
  return response.data;
};

export const updateCampaign = async (id, data) => {
  const response = await api.patch(`/campaigns/${id}`, data);
  return response.data;
};

export const assignUser = async (campaignId, userId) => {
  const response = await api.post(`/campaigns/${campaignId}/users`, { userId });
  return response.data;
};

export const removeUser = async (campaignId, userId) => {
  const response = await api.delete(`/campaigns/${campaignId}/users/${userId}`);
  return response.data;
};

export default {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  assignUser,
  removeUser,
};
