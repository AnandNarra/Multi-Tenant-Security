import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
};

export const organizationAPI = {
  getAll: () => api.get('/organizations'),
  getById: (id) => api.get(`/organizations/${id}`),
  create: (orgData) => api.post('/organizations', orgData),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  create: (userData) => api.post('/createUser', userData),
  createInUsers: (userData) => api.post('/users', userData),
};

export const campaignAPI = {
  getAll: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (campaignData) => api.post('/campaigns', campaignData),
  update: (id, campaignData) => api.patch(`/campaigns/${id}`, campaignData),
  delete: (id) => api.delete(`/campaigns/${id}`),
  assignUser: (campaignId, userId) => api.post(`/campaigns/${campaignId}/users`, { userId }),
  removeUser: (campaignId, userId) => api.delete(`/campaigns/${campaignId}/users/${userId}`),
};

export const securityEventAPI = {
  getAll: (params) => api.get('/security-events', { params }),
  getById: (id) => api.get(`/security-events/${id}`),
  create: (eventData) => api.post('/security-events', eventData),
  updateStatus: (id, status) => api.patch(`/security-events/${id}/status`, { status }),
};

export const auditLogAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getById: (id) => api.get(`/audit-logs/${id}`),
};

export default api;

