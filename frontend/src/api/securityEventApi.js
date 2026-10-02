import api from './api.js';

export const getSecurityEvents = async (params) => {
  const response = await api.get('/security-events', { params });
  return response.data;
};

export const getSecurityEventById = async (id) => {
  const response = await api.get(`/security-events/${id}`);
  return response.data;
};

export const createSecurityEvent = async (data) => {
  const response = await api.post('/security-events', data);
  return response.data;
};

export const updateSecurityEventStatus = async (id, status) => {
  const response = await api.patch(`/security-events/${id}/status`, { status });
  return response.data;
};

export default {
  getSecurityEvents,
  getSecurityEventById,
  createSecurityEvent,
  updateSecurityEventStatus,
};
