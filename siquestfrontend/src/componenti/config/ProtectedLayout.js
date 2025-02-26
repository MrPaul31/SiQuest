import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import Menu from '../Menu'; // Import the dynamic menu

const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex">
      {/* Sidebar with the dynamic menu */}
      <Menu />
      {/* Main content area */}
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default ProtectedLayout;