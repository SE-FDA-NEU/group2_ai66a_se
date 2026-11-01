import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import OTPPage from './pages/OTPPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { Layout } from './components/Layout';
import { WatchlistPage } from './pages/WatchlistPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { NotificationCenter } from './components/NotificationCenter';
import { isTokenValid } from './utils/auth';

const FallbackRoute = () => {
  const { isLoggedIn, token } = useAuth();
  return isLoggedIn && isTokenValid(token) ? (
    <Navigate to="/watchlist" replace />
  ) : (
    <Navigate to="/login" replace />
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationCenter />
        <Routes>
          {/* Public / Auth routes (Only for unauthenticated users) */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/otp" element={<PublicRoute><OTPPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {/* Dashboard / App routes (Only for authenticated users) */}
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <Layout>
                  <WatchlistPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
          {/* Tương thích ngược: tự động chuyển hướng /settings sang /profile */}
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          <Route
            path="/detail/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProductDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback route: Chuyển về login nếu chưa đăng nhập, hoặc watchlist nếu đã đăng nhập */}
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
