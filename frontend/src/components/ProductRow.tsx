import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductRow.module.css';

export interface ProductRowProps {
  id: string;
  image?: string;
  name: string;
  currentPrice: number;
  priceLow?: number;
  priceHigh?: number;
  starRating?: number;
  priceLabel?: string;
  isFakeDiscount?: boolean;
  notEnoughData?: boolean;
  onRemove: (id: string) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

export const ProductRow: React.FC<ProductRowProps> = ({
  id,
  image,
  name,
  currentPrice,
  priceLow,
  priceHigh,
  starRating,
  priceLabel,
  isFakeDiscount,
  notEnoughData,
  onRemove
}) => {
  const navigate = useNavigate();

  const handleRowClick = () => {
    navigate(`/detail/${id}`);
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
        <span className={styles.currentPrice}>{formatPrice(currentPrice)}</span>
      </div>

      {/* Cột 3: Khoảng giá */}
      <div className={styles.colCenter}>
        {(priceLow !== undefined && priceHigh !== undefined) ? (
          <span className={styles.priceRange}>
            {formatPrice(priceLow)} - {formatPrice(priceHigh)}
          </span>
        ) : (
          <span className={styles.emptyDash}>-</span>
        )}
      </div>

      {/* Cột 4: Đánh giá */}
      <div className={styles.colCenter}>
        {starRating !== undefined ? (
          <div className={styles.rating}>
            <span className={styles.starIcon}>★</span>
            <span>{starRating.toFixed(1)}</span>
          </div>
        ) : (
          <span className={styles.emptyDash}>-</span>
        )}
      </div>

      {/* Cột 5: Nhãn giá & Khuyến mãi */}
      <div className={styles.badgesCol}>
        {notEnoughData ? (
          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
            Chưa đủ dữ liệu để đánh giá
          </span>
        ) : priceLabel ? (
          <span className={`${styles.badge} ${styles.badgePrimary}`}>
            {priceLabel}
          </span>
        ) : null}

        {isFakeDiscount && (
          <span className={`${styles.badge} ${styles.badgeWarning}`}>
            Giảm giá giả
          </span>
        )}
      </div>

      {/* Cột 6: Thao tác */}
      <div className={styles.actionCol}>
        <button
          className={styles.removeButton}
          onClick={handleRemoveClick}
          aria-label="Xóa khỏi danh sách"
          title="Xóa"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};
