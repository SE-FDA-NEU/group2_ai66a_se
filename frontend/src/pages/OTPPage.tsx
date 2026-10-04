import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOTP, registerUser, login, OTPReason } from '../api/authApi';
import { getUserProfile } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import styles from './OTPPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OTPLocationState {
  email: string;
  nickname: string;
  password: string;
  reason: OTPReason;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

// ─── Main Page ────────────────────────────────────────────────────────────────

const OTPPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveToken } = useAuth();

  const state = location.state as OTPLocationState | null;

  // Guard: if no state, someone navigated here directly — send back to register
  useEffect(() => {
    if (!state?.email) {
      navigate('/register', { replace: true });
    }
  }, [state, navigate]);

  const { email = '', nickname = '', password = '', reason = 'verify-email' } = state ?? {};

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ─── OTP Input Handlers ──────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setApiError(undefined);

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    // Focus the last filled cell or the next empty one
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < OTP_LENGTH) {
      setApiError('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    setIsLoading(true);
    setApiError(undefined);

    try {
      // Step 2: Verify OTP → get verified_token
      const verifyRes = await verifyOTP(email, otpValue, reason);
      const verifiedToken = verifyRes.data?.verified_token;
      if (!verifiedToken) throw new Error('Không nhận được verified_token.');

      // Step 3: Complete registration
      await registerUser({ email, nickname, password }, verifiedToken);

      // Auto-login after successful registration
      const loginRes = await login(email, password);
      saveToken(loginRes.access_token);
      localStorage.setItem("access_token", loginRes.access_token);
      const user = await getUserProfile();
      if (user.data) {
        localStorage.setItem("user_email", user.data.email);
      }

      navigate('/watchlist', { replace: true });
    } catch (err: any) {
      const detail = err?.detail ?? err?.message ?? '';
      if (detail.toLowerCase().includes('otp')) {
        setApiError('Mã OTP không đúng hoặc đã hết hạn.');
      } else if (detail.toLowerCase().includes('already') || detail.toLowerCase().includes('registered')) {
        setApiError('Email này đã được đăng ký. Vui lòng đăng nhập.');
      } else if (detail.toLowerCase().includes('token')) {
        setApiError('Phiên xác thực đã hết hạn. Vui lòng thử lại từ đầu.');
      } else {
        setApiError(detail || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setApiError(undefined);
    try {
      const { sendOTP } = await import('../api/authApi');
      await sendOTP(email, reason);
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      setApiError('Không thể gửi lại OTP. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  const otpComplete = otp.every((d) => d !== '');

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={styles.pageContainer}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <div
            className={styles.logo}
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          >
            Trakora
          </div>
        </div>
      </nav>

      {/* Centered card */}
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.iconWrapper} aria-hidden="true">📬</div>

          <h1 className={styles.title}>Xác minh email</h1>
          <p className={styles.subtitle}>
            Chúng tôi đã gửi mã OTP 6 chữ số đến
          </p>
          <p className={styles.emailHighlight}>{email}</p>

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {/* 6 individual OTP inputs */}
            <div className={styles.otpRow} onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`${styles.otpInput} ${apiError ? styles.otpInputError : ''}`}
                  aria-label={`Chữ số OTP thứ ${i + 1}`}
                  autoComplete="one-time-code"
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* API error */}
            {apiError && (
              <p className={styles.errorMsg} role="alert">⚠ {apiError}</p>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || !otpComplete}
            >
              {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
              {isLoading ? 'Đang xác minh...' : 'Xác nhận'}
            </button>
          </form>

          {/* Resend */}
          <p className={styles.resendRow}>
            Không nhận được mã?{' '}
            {cooldown > 0 ? (
              <span className={styles.cooldownText}>Gửi lại sau {cooldown}s</span>
            ) : (
              <button
                className={styles.resendBtn}
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? 'Đang gửi...' : 'Gửi lại OTP'}
              </button>
            )}
          </p>

          <button
            className={styles.backBtn}
            onClick={() => navigate('/register')}
          >
            ← Quay lại đăng ký
          </button>
        </div>
      </main>
    </div>
  );
};

export default OTPPage;
