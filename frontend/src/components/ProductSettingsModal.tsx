import React, { useState, useEffect } from 'react';
import { AlertCircle, Bell, Moon, Settings, Tag, X, Zap } from 'lucide-react';
import { updateTargetPrice, WatchlistProduct } from '../api/watchlistApi';
import { formatVnd, parseVndInput } from '../utils/currency';
import styles from './ProductSettingsModal.module.css';
import apiClient from '../api/config';
import { showToast } from '../utils/toast';

interface ProductSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: WatchlistProduct;
  onTargetPriceUpdated: (updatedProduct: WatchlistProduct) => void;
}

export const ProductSettingsModal: React.FC<ProductSettingsModalProps> = ({
  isOpen,
  onClose,
  product,
  onTargetPriceUpdated,
}) => {
  const currentPriceVnd = Math.round(Number(product.current_price));
  const currentPriceFormatted = formatVnd(product.current_price, product.currency);

  const initialTargetVnd = product.target_price != null
    ? String(Math.round(Number(product.target_price)))
    : '';

  const [targetPriceInput, setTargetPriceInput] = useState<string>(initialTargetVnd);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Account-wide notification preferences.
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [quietWindow, setQuietWindow] = useState({ quiet_start: '23:00', quiet_end: '07:00', timezone: 'Asia/Ho_Chi_Minh' });

  useEffect(() => {
    if (isOpen) {
      const initVnd = product.target_price != null
        ? String(Math.round(Number(product.target_price)))
        : '';
      setTargetPriceInput(initVnd);
      setValidationError(null);
    }
  }, [isOpen, product.target_price, product.currency]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setSettingsLoaded(false);
    void apiClient.get('/notifications/settings').then((response) => {
      const body = response as unknown as { data: { email_enabled: boolean; quiet_hours_enabled: boolean; quiet_start?: string | null; quiet_end?: string | null; timezone?: string } };
      if (active && body.data) {
        setEmailEnabled(body.data.email_enabled);
        setQuietHoursEnabled(body.data.quiet_hours_enabled);
        setQuietWindow({ quiet_start: body.data.quiet_start || '23:00', quiet_end: body.data.quiet_end || '07:00', timezone: body.data.timezone || 'Asia/Ho_Chi_Minh' });
        setSettingsLoaded(true);
      }
    }).catch(() => { if (active) showToast('error', 'Không thể tải cài đặt thông báo. Vui lòng thử lại.'); });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time client-side validation against BR1
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setTargetPriceInput(rawVal);

    const trimmed = rawVal.trim();
    if (!trimmed) {
      setValidationError('Vui lòng nhập mức giá mục tiêu mong muốn.');
      return;
    }

    const num = parseVndInput(trimmed);
    if (num === null || num <= 0) {
      setValidationError('Giá mục tiêu phải lớn hơn 0.');
      return;
    }

    if (num >= currentPriceVnd) {
      setValidationError(`Giá mục tiêu phải thấp hơn giá hiện tại (${currentPriceFormatted})`);
      return;
    }

    setValidationError(null);
  };

  const handleSaveTargetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = targetPriceInput.trim();
    if (!trimmed) {
      setValidationError('Vui lòng nhập giá mục tiêu.');
      return;
    }

    const num = parseVndInput(trimmed);
    if (num === null || num <= 0) {
      setValidationError('Giá mục tiêu phải lớn hơn 0.');
      return;
    }

    if (num >= currentPriceVnd) {
      setValidationError(`Giá mục tiêu phải thấp hơn giá hiện tại (${currentPriceFormatted})`);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const updatedProduct = await updateTargetPrice(product.id, num);
      onTargetPriceUpdated(updatedProduct);
      onClose();
    } catch (err: any) {
      console.error('Update target price error:', err);
      const detail = err?.detail || err?.message || '';
      if (detail.toLowerCase().includes('lower than') || detail.toLowerCase().includes('thấp hơn')) {
        setValidationError(`Giá mục tiêu phải thấp hơn giá hiện tại (${currentPriceFormatted})`);
      } else {
        setValidationError(detail || 'Không thể lưu giá mục tiêu. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!settingsLoaded || savingSettings) return;
    setSavingSettings(true);
    try {
      await apiClient.patch('/notifications/settings', {
        email_enabled: emailEnabled,
        quiet_hours_enabled: quietHoursEnabled,
        ...quietWindow,
      });
    } catch (error) {
      console.error('Không thể lưu cài đặt thông báo:', error);
    } finally { setSavingSettings(false); }
  };

  const isFormValid =
    targetPriceInput.trim() !== '' &&
    validationError === null &&
    Number(targetPriceInput.trim()) < currentPriceVnd &&
    Number(targetPriceInput.trim()) > 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.titleArea}>
            <Settings size={20} className={styles.titleIcon} aria-hidden="true" />
            <h2 className={styles.modalTitle}>Cài đặt sản phẩm & Cảnh báo</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng cài đặt">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Section 1: Target Price Form (US02) */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Tag size={16} color="var(--primary-color)" aria-hidden="true" />
              Thiết lập giá mục tiêu (Target Price)
            </h3>
            <p className={styles.sectionDesc}>
              Hệ thống sẽ tự động quét giá định kỳ mỗi 5 phút và gửi cảnh báo ngay khi giá sản phẩm chạm hoặc thấp hơn mức này (BR1, BR4).
            </p>

            <div className={styles.priceInfoBox}>
              <div className={styles.priceInfoItem}>
                <span className={styles.priceInfoLabel}>Giá hiện tại</span>
                <span className={styles.priceInfoValue}>
                  {currentPriceFormatted}
                </span>
              </div>
              <div className={styles.priceInfoItem} style={{ textAlign: 'right' }}>
                <span className={styles.priceInfoLabel}>Mục tiêu hiện tại</span>
                <span className={styles.priceInfoValue}>
                  {product.target_price != null ? formatVnd(product.target_price, product.currency) : 'Chưa đặt'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveTargetPrice} className={styles.formGroup} style={{ marginTop: 10 }}>
              <label htmlFor="targetPriceInput" className={styles.formLabel}>
                Mức giá mục tiêu mới (VND) *
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="targetPriceInput"
                  type="text"
                  inputMode="numeric"
                  placeholder={`Ví dụ: ${Math.round(currentPriceVnd * 0.9)}`}
                  className={`${styles.formInput} ${validationError ? styles.formInputError : ''}`}
                  value={targetPriceInput}
                  onChange={handlePriceChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={validationError ? 'targetPriceError' : undefined}
                />
              </div>

              {targetPriceInput.trim() !== '' && parseVndInput(targetPriceInput) !== null && !validationError && (
                <div style={{ fontSize: '12px', color: 'var(--primary-color)', marginTop: '4px', fontWeight: 500 }}>
                  ≈ {formatVnd(parseVndInput(targetPriceInput)!)}
                </div>
              )}

              {validationError && (
                <div id="targetPriceError" className={styles.errorMessage} role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{validationError}</span>
                </div>
              )}


              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="submit"
                  className={styles.btnSave}
                  disabled={!isFormValid || isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className={styles.spinner} aria-hidden="true" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    'Lưu giá mục tiêu'
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Section 2: Notification Settings (Placeholder chuẩn bị cho US10) */}
          <section className={styles.section} style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            <h3 className={styles.sectionTitle}>
              <Bell size={16} color="var(--primary-color)" aria-hidden="true" />
              Tùy chọn nhận thông báo
            </h3>
            <p className={styles.sectionDesc}>
              Cấu hình các kênh và khung giờ nhận thông báo khi có biến động giá.
            </p>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingTitle}>Thông báo qua Email</span>
                <span className={styles.settingSubtitle}>Gửi email cảnh báo giá giảm vào hòm thư đăng ký</span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingTitle}>
                  <Moon size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                  Giờ yên tĩnh
                </span>
                <span className={styles.settingSubtitle}>Tạm hoãn gửi email từ {quietWindow.quiet_start.slice(0, 5)} đến {quietWindow.quiet_end.slice(0, 5)}</span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingTitle}>
                  <Zap size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                  Cảnh báo đợt giảm giá lớn (sắp có)
                </span>
                <span className={styles.settingSubtitle}>Nhận thông báo trước 48 giờ khi sắp có ngày hội sale</span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={false} disabled
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>


            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className={styles.btnCancel}
                style={{ fontSize: '0.825rem' }}
                onClick={handleSaveNotifications}
                disabled={savingSettings || !settingsLoaded}
              >
                Lưu cấu hình thông báo
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSettingsModal;

