import React, { useState } from 'react';
import { addProductToWatchlist, WatchlistProduct } from '../api/watchlistApi';
import { convertFromVnd, USD_TO_VND_RATE } from '../utils/currency';
import styles from '../pages/WatchlistPage.module.css';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProduct: WatchlistProduct) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [buyWhenGood, setBuyWhenGood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setUrl('');
    setTargetPrice('');
    setBuyWhenGood(false);
    setAddError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setAddError('Vui lòng nhập đường dẫn (URL) sản phẩm.');
      return;
    }

    const parsedTargetPrice = targetPrice.trim() ? Number(targetPrice) : null;
    if (parsedTargetPrice !== null && (!Number.isFinite(parsedTargetPrice) || parsedTargetPrice <= 0)) {
      setAddError('Giá mục tiêu phải lớn hơn 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setAddError(null);
      const newProd = await addProductToWatchlist({
        url: url.trim(),
        target_price: parsedTargetPrice !== null
          ? convertFromVnd(parsedTargetPrice, 'USD')
          : null,
        buy_when_good: buyWhenGood,
      });

      onSuccess(newProd);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Add product error:', err);
      setAddError(err.message || err.detail || 'Không thể thêm sản phẩm. Vui lòng kiểm tra đường dẫn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Thêm sản phẩm cần theo dõi</h2>

        {addError && <div className={styles.errorMessage} role="alert">{addError}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Đường dẫn sản phẩm (Amazon URL) *</label>
            <input
              type="url"
              required
              placeholder="https://www.amazon.com/dp/..."
              className={styles.formInput}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Giá mục tiêu cảnh báo (VND, tùy chọn; 1 USD ≈ {USD_TO_VND_RATE.toLocaleString('vi-VN')} VND)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Ví dụ: 1500000"
              className={styles.formInput}
              value={targetPrice}
              disabled={buyWhenGood}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>

          <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="buyWhenGood"
              checked={buyWhenGood}
              onChange={(e) => {
                setBuyWhenGood(e.target.checked);
                if (e.target.checked) setTargetPrice('');
              }}
            />
            <label htmlFor="buyWhenGood" className={styles.formLabel} style={{ margin: 0, cursor: 'pointer' }}>
              Mua khi giá tốt (thay cho giá mục tiêu)
            </label>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Đang thêm...' : 'Thêm vào danh sách'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

