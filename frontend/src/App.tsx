import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import OTPPage from './pages/OTPPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { Layout } from './components/Layout';
import { WatchlistPage } from './pages/WatchlistPage';
import ProfilePage from './pages/ProfilePage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { NotificationCenter } from './components/NotificationCenter';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {import.meta.env.DEV && new URLSearchParams(window.location.search).has('mockNotification') && (
          <NotificationCenter mockOnly />
        )}
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
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
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

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
