import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [organization, setOrganization] = useState(() => {
    const saved = localStorage.getItem('auth_organization');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  useEffect(() => {
    if (organization) {
      localStorage.setItem('auth_organization', JSON.stringify(organization));
    } else {
      localStorage.removeItem('auth_organization');
    }
  }, [organization]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, organization: orgData, accessToken, token: fallbackToken } = response.data.data;
      const userToken = accessToken || fallbackToken;

      const normalizedUser = {
        ...userData,
        role: (userData.role).toUpperCase(),
      };

      setUser(normalizedUser);
      setOrganization(orgData || null);
      setToken(userToken);

      return { success: true, user: normalizedUser, organization: orgData, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to login';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (registerData) => {
    setLoading(true);
    try {
      const response = await authAPI.register(registerData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.response?.data?.errors && Object.values(error.response.data.errors).join(', ')) ||
        'Failed to register';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout request error:', error);
    } finally {
      setUser(null);
      setOrganization(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_organization');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        role: user?.role?.toUpperCase() || null,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
