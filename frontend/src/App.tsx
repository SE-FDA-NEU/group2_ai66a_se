import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import { Layout } from './components/Layout';
import { WatchlistPage } from './pages/WatchlistPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard Watchlist route (Task 79) */}
        <Route
          path="/watchlist"
          element={
            <Layout>
              <WatchlistPage />
            </Layout>
          }
        />
        <Route
          path="/detail/:id"
          element={
            <Layout>
              <div style={{ padding: 40 }}>Trang chi tiết sản phẩm</div>
            </Layout>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
