import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, Settings, Star } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { removeProductFromWatchlist, getWatchlist, WatchlistProduct } from '../api/watchlistApi';
import styles from './ProductDetailPage.module.css';
import { formatVnd } from '../utils/currency';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { ProductSettingsModal } from '../components/ProductSettingsModal';
import { ShopTrustBadge } from '../components/ShopTrustBadge';
import { computeShopTrustLabel } from '../utils/trustLabel';
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
    if (product) return;

    const fetchProduct = async () => {
      if (!id) return;
      try {
        const res = await getWatchlist();
        const found = res?.products?.find((p) => String(p.id) === id);
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
  }, [id, navigate]);

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

  const trustLabel = computeShopTrustLabel(
    product.shop_rating ?? product.product_rating,
    product.shop_review_count ?? product.review_count,
    product.shop_trust_label
  );

  const recentReviews = (product.reviews || product.top_reviews || []).slice(0, 5);
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
          <div className={styles.brand} data-testid="product-brand">{product.brand || product.marketplace || 'Amazon'}</div>
          <h1 className={styles.title} data-testid="product-name">{product.name}</h1>

          <div className={styles.shopRow} data-testid="shop-details">
            <span className={styles.shopLabel}>Cửa hàng:</span>
            <span className={styles.shopName} data-testid="shop-name">{product.shop_name || 'Không xác định'}</span>
            {trustLabel && <ShopTrustBadge label={trustLabel} size="medium" />}
          </div>
          
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
              <div className={styles.shopMetaBlock}>
                <span className={styles.metaValue}>{product.shop_name || 'Không xác định'}</span>
                {trustLabel && <ShopTrustBadge label={trustLabel} size="small" />}
              </div>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Đánh giá</span>
              <div className={styles.ratingInfo} data-testid="product-rating-meta">
                {product.product_rating ? (
                  <>
                    <span className={styles.ratingStars} data-testid="product-avg-rating">
                      <Star size={15} fill="currentColor" aria-hidden="true" />
                      <strong>{Number(product.product_rating).toFixed(1)}</strong>
                    </span>
                    <span className={styles.ratingCount} data-testid="product-total-ratings">
                      ({(product.review_count ?? 0).toLocaleString('en-US')} đánh giá)
                    </span>
                  </>
                ) : (
                  <span className={styles.metaValue}>Chưa có đánh giá</span>
                )}
              </div>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Giá thấp nhất (lịch sử):</span>
              <span className={styles.metaValue}>
                {product.price_low ? formatVnd(product.price_low, product.currency) : 'Chưa có dữ liệu'}
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
                      <span>{product.price_label || 'Not enough data to assess'}</span>
                    </>
                  )}
                </span>
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
        <PriceHistoryChart
          productId={product.id}
          currency={product.currency}
          targetPrice={product.target_price}
        />
      </div>

      {/* Customer Reviews Section (5 most recent reviews) */}
      <div className={styles.reviewsSection} data-testid="customer-reviews-section">
        <div className={styles.reviewsHeader}>
          <h2 className={styles.reviewsSectionTitle}>Đánh giá từ khách hàng</h2>
          {product.product_rating && (
            <div className={styles.reviewsSummary} data-testid="reviews-summary">
              <div className={styles.avgRatingBox}>
                <Star size={18} fill="currentColor" className={styles.starIconYellow} aria-hidden="true" />
                <span className={styles.avgRatingScore} data-testid="reviews-average-rating">
                  {Number(product.product_rating).toFixed(1)}
                </span>
                <span className={styles.avgRatingScale}>/ 5.0</span>
              </div>
              <span className={styles.totalRatingsLabel} data-testid="reviews-total-ratings">
                ({(product.review_count ?? 0).toLocaleString('en-US')} lượt đánh giá)
              </span>
            </div>
          )}
        </div>

        {recentReviews.length > 0 ? (
          <div className={styles.reviewsList} data-testid="reviews-list">
            {recentReviews.map((review, idx) => {
              const reviewRating = review.rating != null ? parseFloat(String(review.rating)) : null;
              const reviewerName = review.author || review.reviewer || 'Khách hàng';
              const reviewText = review.text || review.comment || review.body || review.content;
              const reviewDate = review.date || review.created_at;

              return (
                <div key={review.id || idx} className={styles.reviewCard} data-testid="review-card">
                  <div className={styles.reviewCardHeader}>
                    <div className={styles.reviewerMeta}>
                      <div className={styles.reviewerAvatar} aria-hidden="true">
                        {reviewerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.reviewerName}>{reviewerName}</div>
                        {reviewDate && <div className={styles.reviewDate}>{reviewDate}</div>}
                      </div>
                    </div>
                    {reviewRating !== null && (
                      <div className={styles.reviewRatingStars} data-testid="review-rating" aria-label={`${reviewRating} trên 5 sao`}>
                        <Star size={14} fill="currentColor" className={styles.starIconYellow} aria-hidden="true" />
                        <span>{reviewRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  {review.title && <h3 className={styles.reviewTitle}>{review.title}</h3>}
                  {reviewText && <p className={styles.reviewBody}>{reviewText}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyReviews} data-testid="empty-reviews">
            <p>Chưa có đánh giá nào từ khách hàng cho sản phẩm này.</p>
          </div>
        )}
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
