import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check if user's role matches
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = role ? role.toUpperCase() : 'USER';
    const isAllowed = allowedRoles.map((r) => r.toUpperCase()).includes(userRole);

    if (!isAllowed) {
      // Redirect to their respective authorized role dashboard
      if (userRole === 'ADMIN') {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (userRole === 'MANAGER') {
        return <Navigate to="/manager/dashboard" replace />;
      } else {
        return <Navigate to="/user/dashboard" replace />;
      }
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
