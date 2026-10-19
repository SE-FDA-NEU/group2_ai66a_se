import React from 'react';
import { AlertTriangle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductRow.module.css';
import { formatVnd } from '../utils/currency';
import { WatchlistProduct } from '../api/watchlistApi';
import { ShopTrustBadge } from './ShopTrustBadge';
import { computeShopTrustLabel } from '../utils/trustLabel';

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

  const resolvedShopName = shopName || originalProduct?.shop_name;
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
      product_rating: starRating,
      price_label: priceLabel || '',
      is_fake_discount: isFakeDiscount || false,
      currency: 'VND',
      marketplace: 'Mock Market',
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
        if (e.key === 'Enter' || e.key === ' ') {
          handleRowClick();
        }
      }}
    >
      {/* Cột 1: Sản phẩm (Ảnh + Tên + Cửa hàng) */}
      <div className={styles.productCol}>
        <div className={styles.imageContainer}>
          {image ? (
            <img src={image} alt={name} className={styles.productImage} loading="lazy" />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
        </div>
        <div className={styles.productMetaWrapper}>
          <h3 className={styles.productName} title={name}>{name}</h3>
          {(resolvedShopName || trustLabel) && (
            <div className={styles.shopMetaRow}>
              {resolvedShopName && <span className={styles.shopNameText}>{resolvedShopName}</span>}
              {trustLabel && <ShopTrustBadge label={trustLabel} size="small" />}
            </div>
          )}
        </div>
      </div>

      {/* Cột 2: Giá hiện tại */}
      <div className={styles.colCenter}>
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
      <div className={styles.colCenter}>
        {priceLow && priceHigh ? (
          <span className={styles.priceRange}>
            {formatVnd(priceLow, currency)} - {formatVnd(priceHigh, currency)}
          </span>
        ) : (
          <span className={styles.emptyText}>Chưa đủ dữ liệu</span>
        )}
      </div>

      {/* Cột 4: Đánh giá */}
      <div className={styles.colCenter}>
        {starRating ? (
          <div className={styles.rating}>
            <Star className={styles.starIcon} size={14} fill="currentColor" aria-hidden="true" />
            <span className={styles.ratingNumber}>{starRating}</span>
          </div>
        ) : (
          <span className={styles.emptyText}>-</span>
        )}
      </div>

      {/* Cột 5: Nhãn giá & Shop Trust */}
      <div className={styles.badgesCol}>
        {trustLabel && (
          <ShopTrustBadge label={trustLabel} size="small" />
        )}
        {notEnoughData && (
          <span className={`${styles.badge} ${styles.badgeWarning}`}>
            <AlertTriangle size={13} aria-hidden="true" /> {priceLabel || 'Not enough data to assess'}
          </span>
        )}
        {!notEnoughData && priceLabel && (
          <span className={`${styles.badge} ${priceLabel === 'Good price' ? styles.badgePrimary : styles.badgeNeutral}`}>
            {priceLabel}
          </span>
        )}
        {isFakeDiscount && (
          <span className={`${styles.badge} ${styles.badgeWarning}`}><AlertTriangle size={13} aria-hidden="true" /> Khuyến mãi ảo</span>
        )}
      </div>

      {/* Cột 6: Thao tác */}
      <div className={styles.actionCol}>
        <button
          className={styles.removeButton}
          onClick={handleRemoveClick}
          disabled={isRemoving}
          aria-busy={isRemoving}
          aria-label="Ngừng theo dõi sản phẩm"
          title="Ngừng theo dõi sản phẩm"
        >
          {isRemoving ? 'Đang xử lý...' : 'Ngừng theo dõi'}
        </button>
      </div>
    </div>
  );
};
