import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductRow.module.css';
import { formatVnd } from '../utils/currency';

export interface ProductRowProps {
  id: string;
  image?: string;
  name: string;
  currentPrice: number;
  currency: string;
  priceLow?: number;
  priceHigh?: number;
  starRating?: number;
  priceLabel?: string;
  isFakeDiscount?: boolean;
  notEnoughData?: boolean;
  onRemove: (id: string) => void;
  originalProduct?: any;
}

export const ProductRow: React.FC<ProductRowProps> = ({
  id,
  image,
  name,
  currentPrice,
  currency,
  priceLow,
  priceHigh,
  starRating,
  priceLabel,
  isFakeDiscount,
  notEnoughData,
  onRemove,
  originalProduct
}) => {
  const navigate = useNavigate();

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
      {/* Cột 1: Sản phẩm (Ảnh + Tên) */}
      <div className={styles.productCol}>
        <div className={styles.imageContainer}>
          {image ? (
            <img src={image} alt={name} className={styles.productImage} loading="lazy" />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
        </div>
        <h3 className={styles.productName} title={name}>{name}</h3>
      </div>

      {/* Cột 2: Giá hiện tại */}
      <div className={styles.colCenter}>
        <span className={styles.currentPrice}>{formatVnd(currentPrice, currency)}</span>
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
            ⭐ <span className={styles.ratingNumber}>{starRating}</span>
          </div>
        ) : (
          <span className={styles.emptyText}>-</span>
        )}
      </div>

      {/* Cột 5: Nhãn giá */}
      <div className={styles.colCenter}>
        <div className={styles.labels}>
          {notEnoughData && (
            <span className={`${styles.badge} ${styles.badgeWarning}`}>Chưa đủ dữ liệu</span>
          )}
          {!notEnoughData && priceLabel && (
            <span className={`${styles.badge} ${priceLabel === 'Giá tốt' ? styles.badgeSuccess : styles.badgeDefault}`}>
              {priceLabel}
            </span>
          )}
          {isFakeDiscount && (
            <span className={`${styles.badge} ${styles.badgeDanger}`}>Khuyến mãi ảo</span>
          )}
        </div>
      </div>

      {/* Cột 6: Thao tác */}
      <div className={styles.colCenter}>
        <button
          className={styles.removeBtn}
          onClick={handleRemoveClick}
          aria-label="Xóa khỏi danh sách"
          title="Xóa khỏi danh sách"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};
