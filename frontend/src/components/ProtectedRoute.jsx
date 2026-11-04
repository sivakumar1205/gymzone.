import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, authReady } = useStore();
  const location = useLocation();

  if (!authReady) return <p className="route-loading">Checking your account…</p>;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location }} />;
  if (adminOnly && currentUser.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default ProtectedRoute;
