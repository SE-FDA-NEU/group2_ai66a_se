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
      const rawMsg = err.detail || err.message || '';
      if (rawMsg.toLowerCase().includes('lower than the current price')) {
        const match = rawMsg.match(/lower than the current price\s+([\d.,]+)\s*([A-Za-z]+)?/i);
        if (match) {
          const rawPrice = parseFloat(match[1].replace(/,/g, ''));
          const cur = match[2] || 'USD';
          const vnd = cur.toUpperCase() === 'USD' ? Math.round(rawPrice * USD_TO_VND_RATE) : Math.round(rawPrice);
          setAddError(
            `Target must be lower than the current price ${vnd.toLocaleString('vi-VN')} ₫ (${rawPrice} ${cur}). Vui lòng nhập mức giá nhỏ hơn.`
          );
        } else {
          setAddError(rawMsg);
        }
      } else {
        setAddError(rawMsg || 'Không thể thêm sản phẩm. Vui lòng kiểm tra đường dẫn hoặc thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={isSubmitting ? undefined : handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Thêm sản phẩm cần theo dõi</h2>

        {isSubmitting && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              marginBottom: '14px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              color: '#1d4ed8',
              fontSize: '13px',
              fontWeight: 500,
            }}
            role="status"
          >
            <div
              style={{
                width: 16,
                height: 16,
                border: '2px solid #1d4ed8',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }}
            />
            <span>Đang lấy thông tin sản phẩm từ sàn thương mại điện tử... Vui lòng chờ trong giây lát.</span>
          </div>
        )}

        {addError && (
          <div className={styles.errorMessage} role="alert" style={{ marginBottom: 14 }}>
            <strong>Lỗi: </strong>
            <span>{addError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Đường dẫn sản phẩm (Amazon URL) *</label>
            <input
              type="url"
              required
              disabled={isSubmitting}
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
              placeholder="Ví dụ: 500000"
              className={styles.formInput}
              value={targetPrice}
              disabled={buyWhenGood || isSubmitting}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
            {targetPrice.trim() !== '' && Number(targetPrice) > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--primary-color)', marginTop: '4px', fontWeight: 600 }}>
                ≈ {Number(targetPrice).toLocaleString('vi-VN')} ₫ (khoảng ${(Number(targetPrice) / USD_TO_VND_RATE).toFixed(2)} USD)
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #6b7280)', marginTop: '4px', lineHeight: 1.4 }}>
              💡 <em>Lưu ý: Giá mục tiêu phải thấp hơn giá bán hiện tại. Bạn có thể để trống để đặt sau khi theo dõi, hoặc tick chọn "Mua khi giá tốt".</em>
            </div>
          </div>

          <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="buyWhenGood"
              checked={buyWhenGood}
              disabled={isSubmitting}
              onChange={(e) => {
                setBuyWhenGood(e.target.checked);
                if (e.target.checked) setTargetPrice('');
              }}
            />
            <label htmlFor="buyWhenGood" className={styles.formLabel} style={{ margin: 0, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
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
              {isSubmitting ? 'Đang thêm sản phẩm...' : 'Thêm vào danh sách'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

