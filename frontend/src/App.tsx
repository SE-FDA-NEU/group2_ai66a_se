import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WatchlistPage } from './pages/WatchlistPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Default route redirect to watchlist */}
          <Route path="/" element={<Navigate to="/watchlist" replace />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          {/* Placeholder cho trang chi tiết */}
          <Route path="/detail/:id" element={<div style={{ padding: 40 }}>Trang chi tiết sản phẩm</div>} />
          {/* Các trang khác có thể thêm sau */}
          <Route path="*" element={<Navigate to="/watchlist" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
