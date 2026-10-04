import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { removeProductFromWatchlist, getWatchlist, WatchlistProduct } from '../api/watchlistApi';
import styles from './ProductDetailPage.module.css';
import { formatVnd } from '../utils/currency';

export const ProductDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [product, setProduct] = useState<WatchlistProduct | undefined>(location.state?.product);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(!location.state?.product);

  useEffect(() => {
    const fetchProduct = async () => {
      if (product || !id) return;
      try {
        const res = await getWatchlist();
        const found = res.products?.find((p) => String(p.id) === id);
        if (found) {
          setProduct(found);
        }
      } catch (err) {
        console.error('Failed to fetch watchlist', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id, product]);

  if (isLoading) {
    return <div className={styles.pageContainer}>Đang tải thông tin sản phẩm...</div>;
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
            <a 
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className={styles.btnPrimary}
            >
              Xem trên {product.marketplace || 'cửa hàng'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
