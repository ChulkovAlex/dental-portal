import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-page">
        <p className="text-sm text-page/70">Проверяем доступ...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
};

export default ProtectedRoute;
