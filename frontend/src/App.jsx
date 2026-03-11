import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.js';
import Layout from './components/Layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import GalleryPage from './pages/GalleryPage.jsx';
import TimelinePage from './pages/TimelinePage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<GalleryPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
