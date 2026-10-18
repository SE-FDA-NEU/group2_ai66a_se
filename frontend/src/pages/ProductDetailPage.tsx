import React, { useState, useEffect } from 'react';
import { Bell, Settings, Star } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { removeProductFromWatchlist, getWatchlist, WatchlistProduct } from '../api/watchlistApi';
import styles from './ProductDetailPage.module.css';
import { formatVnd } from '../utils/currency';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { ProductSettingsModal } from '../components/ProductSettingsModal';
import { getSafeMarketplaceUrl } from '../utils/marketplace';

export const ProductDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [product, setProduct] = useState<WatchlistProduct | undefined>(location.state?.product);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(!location.state?.product);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (product || !id) return;
      try {
        const res = await getWatchlist();
        const found = res.products?.find((p) => String(p.id) === id);
        if (found) {
          setProduct(found);
        }
      } catch (err: any) {
        console.error('Failed to fetch watchlist', err);
        if (err?.status === 401 || err?.error_code === 'UNAUTHORIZED' || err === 'Unauthorized') {
          navigate('/login', { replace: true });
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id, product]);

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} aria-hidden="true" />
          <span>Đang tải thông tin sản phẩm...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.productCard}>
          <p>Không tìm thấy thông tin sản phẩm. Vui lòng quay lại danh sách theo dõi.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/watchlist')}>Quay lại</button>
        </div>
      </div>
    );
  }

  const handleUnfollow = async () => {
    if (window.confirm('Bạn có chắc chắn muốn ngừng theo dõi sản phẩm này?')) {
      setIsRemoving(true);
      try {
        await removeProductFromWatchlist(product.id);
        navigate('/watchlist', { replace: true });
      } catch (err: any) {
        alert('Lỗi khi ngừng theo dõi: ' + (err?.detail || err?.message || 'Vui lòng thử lại'));
        setIsRemoving(false);
      }
    }
  };

  const marketplaceUrl = getSafeMarketplaceUrl(product.url);

  return (
    <div className={styles.pageContainer}>
      <button className={styles.backLink} onClick={() => navigate('/watchlist')}>
        ← Quay lại danh sách
      </button>

      <div className={styles.productCard}>
        <div className={styles.imageContainer}>
          <img src={product.image_url} alt={product.name} className={styles.productImage} />
        </div>
        
        <div className={styles.productInfo}>
          <div className={styles.brand}>{product.brand || product.marketplace || 'Amazon'}</div>
          <h1 className={styles.title}>{product.name}</h1>
          
          <div className={styles.priceSection}>
            <span className={styles.currentPrice}>{formatVnd(product.current_price, product.currency)}</span>
            {product.target_price != null && (
              <span className={styles.alertBadge} data-testid="alert-status-badge">
                <Bell size={13} aria-hidden="true" /> Alert at {formatVnd(product.target_price, product.currency)}
              </span>
            )}
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Cửa hàng</span>
              <span className={styles.metaValue}>{product.shop_name || 'Không xác định'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Đánh giá</span>
              <span className={styles.metaValue}>
                {product.product_rating ? <><Star size={15} fill="currentColor" aria-hidden="true" /> {product.product_rating}</> : 'Chưa có đánh giá'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Giá thấp nhất (lịch sử)</span>
              <span className={styles.metaValue}>
                {product.price_low ? `${formatVnd(product.price_low, product.currency)}` : 'Chưa có dữ liệu'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Giá mục tiêu cảnh báo</span>
              <span className={styles.metaValue}>
                {product.target_price != null
                  ? formatVnd(product.target_price, product.currency)
                  : 'Chưa đặt'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Nhãn giá hiện tại</span>
              <span className={styles.metaValue}>
                {product.price_label || 'Not enough data to assess'}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSettings}
              onClick={() => setIsSettingsModalOpen(true)}
              title="Cài đặt sản phẩm & giá mục tiêu"
              aria-label="Cài đặt sản phẩm"
              data-testid="btn-product-settings"
            >
              <Settings size={16} aria-hidden="true" />
              <span>Cài đặt</span>
            </button>
            <button 
              className={styles.btnUnfollow} 
              onClick={handleUnfollow}
              disabled={isRemoving}
              aria-busy={isRemoving}
            >
              {isRemoving ? 'Đang ngừng theo dõi...' : 'Ngừng theo dõi (Unfollow)'}
            </button>
            {marketplaceUrl && (
              <a
                href={marketplaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                Xem trên {product.marketplace || 'cửa hàng'}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={styles.chartSection}>
        <PriceHistoryChart productId={product.id} currency={product.currency} />
      </div>

      {/* Pop-up Modal Cài đặt theo dõi sản phẩm (US02) */}
      <ProductSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        product={product}
        onTargetPriceUpdated={(updatedProduct) => setProduct(updatedProduct)}
      />
    </div>
  );
};

export default ProductDetailPage;
