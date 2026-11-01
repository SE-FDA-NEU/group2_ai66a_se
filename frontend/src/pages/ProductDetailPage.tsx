import React, { useState, useEffect } from 'react';
import { Bell, Settings, Star, ShieldCheck, AlertTriangle, ShieldAlert, MessageSquare } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  removeProductFromWatchlist,
  getProductDetail,
  WatchlistProduct,
  CustomerReview,
} from '../api/watchlistApi';
import styles from './ProductDetailPage.module.css';
import { formatVnd } from '../utils/currency';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { ProductSettingsModal } from '../components/ProductSettingsModal';
import { ShopTrustBadge } from '../components/ShopTrustBadge';
import { computeShopTrustLabel, formatPriceLabel } from '../utils/trustLabel';
import { getSafeMarketplaceUrl } from '../utils/marketplace';

// ─── Trust label helpers ────────────────────────────────────────────────────

function TrustLabelBadge({ label }: { label: string }) {
  if (label === 'Trusted') {
    return (
      <span className={`${styles.trustBadge} ${styles.trustTrusted}`} data-testid="trust-label-trusted">
        <ShieldCheck size={13} aria-hidden="true" /> Trusted
      </span>
    );
  }
  if (label === 'Risky: few ratings') {
    return (
      <span className={`${styles.trustBadge} ${styles.trustRisky}`} data-testid="trust-label-risky">
        <ShieldAlert size={13} aria-hidden="true" /> Risky: few ratings
      </span>
    );
  }
  if (label === 'Needs caution') {
    return (
      <span className={`${styles.trustBadge} ${styles.trustCaution}`} data-testid="trust-label-caution">
        <AlertTriangle size={13} aria-hidden="true" /> Needs caution
      </span>
    );
  }
  return null;
}

// ─── Review helpers ─────────────────────────────────────────────────────────

function reviewText(r: CustomerReview): string {
  return r.text ?? r.comment ?? r.body ?? r.content ?? '';
}

function reviewAuthor(r: CustomerReview): string {
  return r.author ?? r.reviewer ?? 'Ẩn danh';
}

function reviewDate(r: CustomerReview): string {
  const raw = r.date ?? r.created_at ?? '';
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return raw;
  }
}

function StarRow({ rating }: { rating?: number | string | null }) {
  const n = Number(rating) || 0;
  return (
    <span className={styles.reviewStars} aria-label={`${n} sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} fill={i <= n ? 'currentColor' : 'none'} aria-hidden="true" />
      ))}
    </span>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export const ProductDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const routeProduct = (location.state as DetailLocationState | null)?.product;
  const matchingRouteProduct = routeProduct && String(routeProduct.id) === id ? routeProduct : undefined;

  // Start with state passed via navigation (instant render), then refresh from API
  const [product, setProduct] = useState<WatchlistProduct | undefined>(location.state?.product);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(!matchingRouteProduct);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
        // Always fetch full detail (includes trust label + reviews)
        const detail = await getProductDetail(Number(id));
        setProduct(detail);
      } catch (err: any) {
        console.error('Failed to fetch product detail', err);
        if (err?.status === 401 || err?.error_code === 'UNAUTHORIZED' || err === 'Unauthorized') {
          navigate('/login', { replace: true });
          return;
        }
        // If we already have product from state, keep it; otherwise show error
      } finally {
        if (isCurrentRequest) setIsLoading(false);
      }
    };

    void fetchProduct();
    return () => {
      isCurrentRequest = false;
    };
  }, [id, matchingRouteProduct, navigate, retryCount]);

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

  const reviews: CustomerReview[] = product.top_reviews ?? product.reviews ?? [];

  return (
    <div className={styles.pageContainer}>
      <button className={styles.backLink} onClick={() => navigate('/watchlist')}>
        ← Quay lại danh sách
      </button>

      <div className={styles.productCard}>
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
          {/* Brand + Shop name */}
          <div className={styles.brand}>
            {product.brand && <span>{product.brand}</span>}
            {product.brand && product.shop_name && <span className={styles.brandSep}>·</span>}
            {product.shop_name && <span>{product.shop_name}</span>}
            {!product.brand && !product.shop_name && <span>{product.marketplace}</span>}
          </div>

          <h1 className={styles.title}>{product.name}</h1>

          {/* Trust label */}
          {product.shop_trust_label && (
            <div className={styles.trustRow} data-testid="shop-trust-label">
              <TrustLabelBadge label={product.shop_trust_label} />
              {product.shop_rating != null && (
                <span className={styles.shopRatingText}>
                  Cửa hàng: <Star size={12} fill="currentColor" aria-hidden="true" className={styles.shopStar} />
                  {' '}{product.shop_rating}
                  {product.shop_review_count != null && (
                    <span className={styles.shopReviewCount}> ({product.shop_review_count.toLocaleString()} đánh giá)</span>
                  )}
                </span>
              )}
            </div>
          )}
          
          <div className={styles.priceSection}>
            <span className={styles.currentPrice}>{formatVnd(product.current_price, product.currency)}</span>
            {product.original_price != null && product.original_price > product.current_price && (
              <span className={styles.originalPrice}>
                Giá gốc {formatVnd(product.original_price, product.currency)}
              </span>
            )}
            {product.target_price != null && (
              <span className={styles.alertBadge} data-testid="alert-status-badge">
                <Bell size={13} aria-hidden="true" /> Cảnh báo tại {formatVnd(product.target_price, product.currency)}
              </span>
            )}
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Cửa hàng</span>
              <div className={styles.shopMetaBlock}>
                <span className={styles.metaValue}>{product.shop_name || 'Không xác định'}</span>
                {trustLabel && <ShopTrustBadge label={trustLabel} size="small" />}
              </div>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Đánh giá sản phẩm</span>
              <span className={styles.metaValue}>
                {product.product_rating ? (
                  <>
                    <Star size={15} fill="currentColor" aria-hidden="true" className={styles.shopStar} />
                    {' '}{product.product_rating}
                    {product.review_count > 0 && (
                      <span className={styles.shopReviewCount}> ({product.review_count.toLocaleString()} đánh giá)</span>
                    )}
                  </>
                ) : 'Chưa có đánh giá'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Giá thấp nhất (lịch sử):</span>
              <span className={styles.metaValue}>
                {product.price_low ? formatVnd(product.price_low, product.currency) : 'Chưa có dữ liệu'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Giá cao nhất (lịch sử):</span>
              <span className={styles.metaValue}>
                {product.price_high != null ? formatVnd(product.price_high, product.currency) : 'Chưa có dữ liệu'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Giá mục tiêu cảnh báo:</span>
              <span className={styles.metaValue}>
                {product.target_price != null
                  ? formatVnd(product.target_price, product.currency)
                  : 'Chưa đặt'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Nhãn giá hiện tại:</span>
              <span className={styles.metaValue}>
                <span className={`${styles.badge} ${
                  product.price_label === 'Good price'
                    ? styles.badgeSuccess
                    : product.price_label === 'Expensive' || product.fake_discount
                    ? styles.badgeWarning
                    : styles.badgeNeutral
                }`}>
                  {product.fake_discount ? (
                    <>
                      <AlertTriangle size={13} aria-hidden="true" />
                      <span>Giảm giá ảo {product.fake_discount_percent ? `(${product.fake_discount_percent}% trên giá thường)` : ''}</span>
                    </>
                  ) : (
                    <>
                      {product.price_label !== 'Good price' && product.price_label !== 'Normal' && (
                        <AlertTriangle size={13} aria-hidden="true" />
                      )}
                      <span>{formatPriceLabel(product.price_label)}</span>
                    </>
                  )}
                </span>
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Tình trạng:</span>
              <span className={styles.metaValue}>{product.in_stock ? 'Còn hàng' : 'Hết hàng'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Theo dõi giá tốt:</span>
              <span className={styles.metaValue}>{product.buy_when_good ? 'Đang bật' : 'Đang tắt'}</span>
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
        <PriceHistoryChart
          productId={product.id}
          currency={product.currency}
          targetPrice={product.target_price}
        />
      </div>

      {/* Customer Reviews Section */}
      {reviews.length > 0 && (
        <section className={styles.reviewsSection} data-testid="reviews-section">
          <h2 className={styles.reviewsTitle}>
            <MessageSquare size={18} aria-hidden="true" />
            Đánh giá gần nhất từ khách hàng
          </h2>
          <div className={styles.reviewsList}>
            {reviews.map((review, idx) => (
              <div
                key={review.id ?? idx}
                className={styles.reviewCard}
                data-testid={`review-card-${idx}`}
              >
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewMeta}>
                    <span className={styles.reviewAuthor}>{reviewAuthor(review)}</span>
                    {review.rating != null && <StarRow rating={review.rating} />}
                  </div>
                  {reviewDate(review) && (
                    <span className={styles.reviewDate}>{reviewDate(review)}</span>
                  )}
                </div>
                {review.title && <p className={styles.reviewTitle}>{review.title}</p>}
                {reviewText(review) && <p className={styles.reviewBody}>{reviewText(review)}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

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
