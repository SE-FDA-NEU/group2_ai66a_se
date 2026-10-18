import React, { useEffect, useState } from 'react';
import { AlertTriangle, Star } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { removeProductFromWatchlist, getWatchlist, WatchlistProduct } from '../api/watchlistApi';
import styles from './ProductDetailPage.module.css';
import { formatVnd } from '../utils/currency';
import { PriceHistoryChart } from '../components/PriceHistoryChart';

type DetailLocationState = { product?: WatchlistProduct };

export const ProductDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const routeProduct = (location.state as DetailLocationState | null)?.product;
  const matchingRouteProduct = routeProduct && String(routeProduct.id) === id ? routeProduct : undefined;

  const [product, setProduct] = useState<WatchlistProduct | undefined>(matchingRouteProduct);
  const [isLoading, setIsLoading] = useState(!matchingRouteProduct);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    if (matchingRouteProduct) {
      setProduct(matchingRouteProduct);
      setLoadError(null);
      setIsLoading(false);
      return () => {
        isCurrentRequest = false;
      };
    }

    setProduct(undefined);
    setLoadError(null);
    setIsLoading(true);

    const fetchProduct = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await getWatchlist();
        if (!isCurrentRequest) return;
        const foundProduct = response.products?.find((item) => String(item.id) === id);
        setProduct(foundProduct);
      } catch (error: any) {
        if (!isCurrentRequest) return;
        console.error('Failed to fetch product details', error);
        if (error?.status === 401 || error?.error_code === 'UNAUTHORIZED' || error === 'Unauthorized') {
          navigate('/login', { replace: true });
          return;
        }
        setLoadError(error?.detail || error?.message || 'Không thể tải thông tin sản phẩm.');
      } finally {
        if (isCurrentRequest) setIsLoading(false);
      }
    };

    void fetchProduct();
    return () => {
      isCurrentRequest = false;
    };
  }, [id, matchingRouteProduct, navigate, retryCount]);

  const handleUnfollow = async () => {
    if (!product || !window.confirm('Bạn có chắc chắn muốn ngừng theo dõi sản phẩm này?')) return;

    setIsRemoving(true);
    try {
      await removeProductFromWatchlist(product.id);
      navigate('/watchlist', { replace: true });
    } catch (error: any) {
      alert('Lỗi khi ngừng theo dõi: ' + (error?.detail || error?.message || 'Vui lòng thử lại'));
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer} role="status" aria-live="polite">
          <div className={styles.spinner} aria-hidden="true" />
          <span>Đang tải thông tin sản phẩm...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.pageContainer}>
        <section className={styles.stateCard} role="alert">
          <h1 className={styles.stateTitle}>Không tải được sản phẩm</h1>
          <p>{loadError}</p>
          <div className={styles.stateActions}>
            <button className={styles.btnPrimary} onClick={() => setRetryCount((count) => count + 1)}>
              Thử lại
            </button>
            <button className={styles.btnSecondary} onClick={() => navigate('/watchlist')}>
              Quay lại danh sách
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.pageContainer}>
        <section className={styles.stateCard}>
          <h1 className={styles.stateTitle}>Không tìm thấy sản phẩm</h1>
          <p>Sản phẩm này không có trong danh sách theo dõi của bạn.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/watchlist')}>
            Quay lại danh sách
          </button>
        </section>
      </div>
    );
  }

  const hasFakeDiscount = product.fake_discount;

  return (
    <div className={styles.pageContainer}>
      <button className={styles.backLink} onClick={() => navigate('/watchlist')}>
        ← Quay lại danh sách
      </button>

      <section className={styles.productCard} aria-labelledby="product-title">
        <div className={styles.imageContainer}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className={styles.productImage} />
          ) : (
            <div className={styles.imagePlaceholder} role="img" aria-label="Không có ảnh sản phẩm">
              Chưa có ảnh
            </div>
          )}
        </div>

        <div className={styles.productInfo}>
          <div className={styles.brand}>{product.brand || 'Chưa có thương hiệu'}</div>
          <h1 className={styles.title} id="product-title">{product.name}</h1>

          <div className={styles.priceSection}>
            <span className={styles.currentPrice}>{formatVnd(product.current_price, product.currency)}</span>
            {product.original_price != null && product.original_price > product.current_price && (
              <span className={styles.originalPrice}>
                Giá gốc {formatVnd(product.original_price, product.currency)}
              </span>
            )}
          </div>

          {hasFakeDiscount && (
            <div className={styles.warningBanner} role="status">
              <AlertTriangle size={17} aria-hidden="true" />
              <span>
                Có dấu hiệu khuyến mãi ảo
                {product.fake_discount_percent != null && ` · ${Number(product.fake_discount_percent).toFixed(0)}% cao hơn giá thường`}
              </span>
            </div>
          )}

          <dl className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Cửa hàng</dt>
              <dd className={styles.metaValue}>{product.shop_name || 'Không xác định'}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Đánh giá sản phẩm</dt>
              <dd className={styles.metaValue}>
                {product.product_rating != null ? (
                  <>
                    <Star size={15} fill="currentColor" aria-hidden="true" />
                    {Number(product.product_rating).toFixed(1)} / 5
                    <span className={styles.metaSecondary}>({product.review_count.toLocaleString('vi-VN')} lượt)</span>
                  </>
                ) : 'Chưa có đánh giá'}
              </dd>
            </div>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Khoảng giá đã ghi nhận</dt>
              <dd className={styles.metaValue}>
                {product.price_low != null && product.price_high != null
                  ? `${formatVnd(product.price_low, product.currency)} – ${formatVnd(product.price_high, product.currency)}`
                  : 'Chưa có dữ liệu'}
              </dd>
            </div>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Giá mục tiêu cảnh báo</dt>
              <dd className={styles.metaValue}>
                {product.target_price != null ? formatVnd(product.target_price, product.currency) : 'Chưa đặt'}
              </dd>
            </div>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Nhãn giá</dt>
              <dd className={styles.metaValue}>{product.price_label || 'Chưa đủ dữ liệu đánh giá'}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Tình trạng</dt>
              <dd className={styles.metaValue}>{product.in_stock ? 'Còn hàng' : 'Hết hàng'}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Sàn thương mại</dt>
              <dd className={styles.metaValue}>{product.marketplace}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt className={styles.metaLabel}>Theo dõi giá tốt</dt>
              <dd className={styles.metaValue}>{product.buy_when_good ? 'Đang bật' : 'Đang tắt'}</dd>
            </div>
          </dl>

          <div className={styles.actions}>
            <button
              className={styles.btnUnfollow}
              onClick={handleUnfollow}
              disabled={isRemoving}
              aria-busy={isRemoving}
            >
              {isRemoving ? 'Đang ngừng theo dõi...' : 'Ngừng theo dõi'}
            </button>
            <a href={product.url} target="_blank" rel="noreferrer" className={styles.btnPrimary}>
              Xem trên {product.marketplace || 'cửa hàng'}
            </a>
          </div>
        </div>
      </section>

      <section className={styles.chartSection} aria-label="Lịch sử giá">
        <PriceHistoryChart productId={product.id} currency={product.currency} />
      </section>
    </div>
  );
};

export default ProductDetailPage;
