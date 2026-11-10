import React from 'react';
import { AlertTriangle, ExternalLink, Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductRow.module.css';
import { formatVnd } from '../utils/currency';
import { getSafeMarketplaceUrl } from '../utils/marketplace';
import { WatchlistProduct } from '../api/watchlistApi';
import { ShopTrustBadge } from './ShopTrustBadge';
import { computeShopTrustLabel, formatPriceLabel } from '../utils/trustLabel';

export interface ProductRowProps {
  id: string;
  image?: string;
  name: string;
  currentPrice: number;
  currency: string;
  targetPrice?: number | null;
  priceLow?: number;
  priceHigh?: number;
  starRating?: number;
  priceLabel?: string;
  isFakeDiscount?: boolean;
  notEnoughData?: boolean;
  onRemove: (id: string) => void | Promise<void>;
  isRemoving?: boolean;
  originalProduct?: WatchlistProduct;
  shopName?: string;
  shopTrustLabel?: string | null;
  shopRating?: number | null;
  shopReviewCount?: number | null;
}

export const ProductRow: React.FC<ProductRowProps> = ({
  id,
  image,
  name,
  currentPrice,
  currency,
  targetPrice,
  priceLow,
  priceHigh,
  starRating,
  priceLabel,
  isFakeDiscount,
  notEnoughData,
  onRemove,
  isRemoving = false,
  originalProduct,
  shopName,
  shopTrustLabel,
  shopRating,
  shopReviewCount,
}) => {
  const navigate = useNavigate();
  const marketplaceUrl = getSafeMarketplaceUrl(originalProduct?.url);

  const productName = name?.trim() || 'Sản phẩm chưa có tên';
  const resolvedShopName = shopName?.trim() || originalProduct?.shop_name?.trim();
  const displayedPriceLabel = isFakeDiscount
    ? 'Khuyến mãi ảo'
    : formatPriceLabel(notEnoughData ? null : priceLabel?.trim());
  const priceBadgeStyle = isFakeDiscount
    ? styles.badgeWarning
    : displayedPriceLabel === 'Giá tốt' ? styles.badgePrimary : styles.badgeNeutral;
  const trustLabel = computeShopTrustLabel(
    shopRating ?? originalProduct?.shop_rating ?? starRating,
    shopReviewCount ?? originalProduct?.shop_review_count ?? originalProduct?.review_count,
    shopTrustLabel ?? originalProduct?.shop_trust_label
  );

  const handleRowClick = () => {
    if (originalProduct) {
      navigate(`/detail/${id}`, { state: { product: originalProduct } });
      return;
    }
    
    const productData = {
      id: Number(id),
      name,
      image_url: image || '',
      current_price: currentPrice,
      price_low: priceLow,
      price_high: priceHigh,
      target_price: targetPrice,
      product_rating: starRating,
      price_label: priceLabel || '',
      is_fake_discount: isFakeDiscount || false,
      currency: currency || 'USD',
      marketplace: 'Amazon',
      url: '#'
    };
    navigate(`/detail/${id}`, { state: { product: productData } });
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn không cho sự kiện click lan ra row (không navigate)
    onRemove(id);
  };

  return (
    <div
      className={styles.rowContainer}
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleRowClick();
        }
      }}
    >
      {/* Cột 1: Sản phẩm (Ảnh + Tên + Cửa hàng) */}
      <div className={styles.productCol}>
        <div className={styles.imageContainer}>
          {image ? (
            <img src={image} alt="" className={styles.productImage} loading="lazy" />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
        </div>
        <div className={styles.productMetaWrapper}>
          <h3 className={styles.productName}>{productName}</h3>
          {(resolvedShopName || trustLabel) && (
            <div className={styles.shopMetaRow}>
              {resolvedShopName && <span className={styles.shopNameText}>{resolvedShopName}</span>}
              {trustLabel && <ShopTrustBadge className={styles.shopTrustBadge} label={trustLabel} size="small" />}
            </div>
          )}
        </div>
      </div>

      {/* Cột 2: Giá hiện tại */}
      <div className={styles.summaryCell}>
        <span className={styles.mobileLabel}>Giá hiện tại</span>
        <div className={styles.priceDetails}>
          <span className={styles.currentPrice}>{formatVnd(currentPrice, currency)}</span>
          {targetPrice != null && (
            <span className={styles.targetPrice}>
              Cảnh báo tại {formatVnd(targetPrice, currency)}
            </span>
          )}
        </div>
      </div>

      {/* Cột 3: Khoảng giá */}
      <div className={styles.summaryCell}>
        <span className={styles.mobileLabel}>Khoảng giá</span>
        {priceLow && priceHigh ? (
          <span className={styles.priceRange}>
            {formatVnd(priceLow, currency)} - {formatVnd(priceHigh, currency)}
          </span>
        ) : (
          <span className={styles.emptyText}>Chưa có khoảng giá</span>
        )}
      </div>

      {/* Cột 4: Đánh giá */}
      <div className={styles.summaryCell}>
        <span className={styles.mobileLabel}>Đánh giá</span>
        {starRating ? (
          <div className={styles.rating}>
            <Star className={styles.starIcon} size={14} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
            <span className={styles.ratingNumber}>{starRating}</span>
          </div>
        ) : (
          <span className={styles.emptyText}>-</span>
        )}
      </div>

      {/* Cột 5: Nhãn giá */}
      <div className={styles.summaryCell}>
        <span className={styles.mobileLabel}>Nhãn giá</span>
        <span className={`${styles.badge} ${priceBadgeStyle}`}>
          {isFakeDiscount && <AlertTriangle size={13} aria-hidden="true" />}
          <span>{displayedPriceLabel}</span>
        </span>
      </div>

      {/* Cột 6: Thao tác */}
      <div className={styles.actionCol}>
        {marketplaceUrl && (
          <a
            className={`${styles.actionButton} ${styles.marketplaceLink}`}
            href={marketplaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink size={14} aria-hidden="true" />
            Xem nơi bán
          </a>
        )}
        <button
          type="button"
          className={`${styles.actionButton} ${styles.removeButton}`}
          onClick={handleRemoveClick}
          disabled={isRemoving}
          aria-busy={isRemoving}
          aria-label="Ngừng theo dõi sản phẩm"
          title="Ngừng theo dõi sản phẩm"
        >
          <Trash2 size={14} aria-hidden="true" />
          {isRemoving ? 'Đang xử lý...' : 'Ngừng theo dõi'}
        </button>
      </div>
    </div>
  );
};
