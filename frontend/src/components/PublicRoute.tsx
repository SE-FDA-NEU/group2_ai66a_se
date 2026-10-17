import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isTokenValid } from '../utils/auth';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isLoggedIn, token } = useAuth();
  const isAuthenticated = isLoggedIn && isTokenValid(token);

  return isAuthenticated ? <Navigate to="/watchlist" replace /> : <>{children}</>;
};

export default PublicRoute;
