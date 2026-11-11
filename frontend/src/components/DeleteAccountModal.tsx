import { InlinePending } from './LoadingState';
import React, { useState, useEffect } from 'react';
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
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(value => value - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);

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
    if (isSubmitting || cooldown > 0) return;
    setIsSending(true);
    setError('');
    setIsSubmitting(true);
    try {
      await sendOTP(email, 'delete-account');
      setOtpSent(true);
      setCooldown(60);
    } catch (err: any) {
      if (err?.error?.code === 'OTP_DELIVERY_UNCERTAIN') { setOtpSent(true); setCooldown(60); }
      setError(err?.detail || err?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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
    <div className={styles.overlay} onClick={isSubmitting ? undefined : resetAndClose} role="dialog" aria-modal="true" aria-label="Xóa tài khoản">
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Xóa tài khoản vĩnh viễn</h2>
        <p className={styles.description}>
          Mọi dữ liệu danh sách theo dõi và lịch sử của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục.
        </p>

        {hasPassword && (
          <div className={styles.modeSwitch}>
            <button
              type="button"
              disabled={isSubmitting} className={mode === 'password' ? styles.modeActive : styles.modeBtn}
              onClick={() => { setMode('password'); setError(''); }}
            >
              Mật khẩu
            </button>
            <button
              type="button"
              disabled={isSubmitting} className={mode === 'otp' ? styles.modeActive : styles.modeBtn}
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
                disabled={isSubmitting} autoFocus
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
                  disabled={isSubmitting} autoFocus
                />
                <button
                  type="button"
                  className={styles.sendOtpBtn}
                  onClick={handleSendOtp}
                  disabled={isSubmitting || cooldown > 0}
                >
                  {isSending ? <InlinePending message="Đang gửi mã..." /> : cooldown > 0 ? `Gửi lại (${cooldown}s)` : otpSent ? 'Gửi lại' : 'Gửi mã'}
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
              {isSubmitting && !isSending ? <InlinePending message="Đang xóa tài khoản..." /> : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
