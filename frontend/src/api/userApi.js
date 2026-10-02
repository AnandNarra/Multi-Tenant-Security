import api from './api.js';

export const getUserDashboard = async () => {
  const response = await api.get('/user/dashboard');
  return response.data;
};

export default {
  getUserDashboard,
};
