import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Block rendering until auth verification finishes
  if (loading) {
    return <LoadingSpinner fullScreen message="Checking authentication..." />;
  }

  // If not authenticated, redirect directly to /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}
