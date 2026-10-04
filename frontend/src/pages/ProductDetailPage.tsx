import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { removeProductFromWatchlist, WatchlistProduct } from '../api/watchlistApi';
import styles from './ProductDetailPage.module.css';
import { formatVnd } from '../utils/currency';

export const ProductDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const product = location.state?.product as WatchlistProduct | undefined;
  const [isRemoving, setIsRemoving] = useState(false);

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
          <div className={styles.brand}>{product.shop_name || 'Amazon'}</div>
          <h1 className={styles.title}>{product.name}</h1>
          
          <div className={styles.priceSection}>
            <span className={styles.currentPrice}>{formatVnd(product.current_price, product.currency)}</span>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Cửa hàng</span>
              <span className={styles.metaValue}>{product.shop_name || 'Không xác định'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Đánh giá</span>
              <span className={styles.metaValue}>
                {product.product_rating ? `${product.product_rating} ⭐` : 'Chưa có đánh giá'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Giá thấp nhất (lịch sử)</span>
              <span className={styles.metaValue}>
                {product.price_low ? `${formatVnd(product.price_low, product.currency)}` : 'Chưa có dữ liệu'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Nhãn giá hiện tại</span>
              <span className={styles.metaValue}>{product.price_label || 'Bình thường'}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.btnUnfollow} 
              onClick={handleUnfollow}
              disabled={isRemoving}
            >
              {isRemoving ? 'Đang ngừng theo dõi...' : 'Ngừng theo dõi (Unfollow)'}
            </button>
            <button 
              onClick={() => alert("Đang chuyển hướng tới Amazon...")}
              className={styles.btnPrimary}
            >
              Xem trên cửa hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
