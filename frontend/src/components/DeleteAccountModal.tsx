import React, { useState } from 'react';
import { sendOTP, verifyOTP } from '../api/authApi';
import { deleteAccount } from '../api/userApi';
import styles from './DeleteAccountModal.module.css';

interface DeleteAccountModalProps {
  isOpen: boolean;
  email: string;
  hasPassword: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

type Mode = 'password' | 'otp';

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  email,
  hasPassword,
  onClose,
  onDeleted,
}) => {
  const [mode, setMode] = useState<Mode>(hasPassword ? 'password' : 'otp');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetAndClose = () => {
    setPassword('');
    setOtp('');
    setOtpSent(false);
    setError('');
    setMode(hasPassword ? 'password' : 'otp');
    onClose();
  };

  const handleSendOtp = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await sendOTP(email, 'delete-account');
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'password') {
        await deleteAccount({ password });
      } else {
        const res = await verifyOTP(email, otp, 'delete-account');
        await deleteAccount({ verified_token: res.data?.verified_token });
      }
      resetAndClose();
      onDeleted();
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Không thể xóa tài khoản. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting && (mode === 'password' ? password.length > 0 : otp.length === 6);

  return (
    <div className={styles.overlay} onClick={resetAndClose} role="dialog" aria-modal="true" aria-label="Xóa tài khoản">
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Xóa tài khoản vĩnh viễn</h2>
        <p className={styles.description}>
          Mọi dữ liệu danh sách theo dõi và lịch sử của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục.
        </p>

        {hasPassword && (
          <div className={styles.modeSwitch}>
            <button
              type="button"
              className={mode === 'password' ? styles.modeActive : styles.modeBtn}
              onClick={() => { setMode('password'); setError(''); }}
            >
              Mật khẩu
            </button>
            <button
              type="button"
              className={mode === 'otp' ? styles.modeActive : styles.modeBtn}
              onClick={() => { setMode('otp'); setError(''); }}
            >
              OTP qua email
            </button>
          </div>
        )}

        <form onSubmit={handleDelete}>
          {mode === 'password' ? (
            <div className={styles.formGroup}>
              <label htmlFor="deletePassword" className={styles.label}>Nhập mật khẩu để xác nhận</label>
              <input
                id="deletePassword"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu hiện tại"
                autoFocus
              />
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label htmlFor="deleteOtp" className={styles.label}>Mã OTP gửi tới {email}</label>
              <div className={styles.otpRow}>
                <input
                  id="deleteOtp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={styles.input}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 chữ số"
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.sendOtpBtn}
                  onClick={handleSendOtp}
                  disabled={isSubmitting}
                >
                  {otpSent ? 'Gửi lại' : 'Gửi mã'}
                </button>
              </div>
              {otpSent && <span className={styles.hint}>Mã đã được gửi. Vui lòng kiểm tra email.</span>}
            </div>
          )}

          {error && (
            <p className={styles.error} role="alert">{error}</p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={resetAndClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className={styles.confirmBtn} disabled={!canSubmit}>
              {isSubmitting ? 'Đang xử lý...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
