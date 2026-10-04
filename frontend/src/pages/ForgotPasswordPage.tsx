import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP, resetPassword } from '../api/authApi';
import styles from './ForgotPasswordPage.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 1 | 2 | 3 | 4;
type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'none';
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (hasUpper && hasLower && hasDigit && hasSpecial) return 'strong';
  if ((hasLower || hasUpper) && hasDigit) return 'medium';
  return 'weak';
}

function getErrorMessage(err: any): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return err?.error?.message ?? err?.detail ?? err?.message ?? '';
}

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Current Step: 1 (Email), 2 (OTP), 3 (New Password), 4 (Success)
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Email
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();

  // Step 2: OTP
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | undefined>();
  const [verifiedToken, setVerifiedToken] = useState<string>('');
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();

  // Global loading & API feedback
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | undefined>();

  // ─── Countdown Timer for OTP Resend ─────────────────────────────────────────

  useEffect(() => {
    if (currentStep !== 2 || cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, cooldown]);

  // Auto-focus first OTP input when arriving at Step 2
  useEffect(() => {
    if (currentStep === 2) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [currentStep]);

  // ─── Step 1: Submit Email (Request OTP) ──────────────────────────────────────

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(undefined);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Địa chỉ email không đúng định dạng.');
      return;
    }
    setEmailError(undefined);

    setIsLoading(true);
    try {
      await sendOTP(trimmed, 'reset-password');

      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError(undefined);
      setCurrentStep(2);
    } catch (err: any) {
      const detail = getErrorMessage(err);
      if (
        detail.toLowerCase().includes('not found') ||
        detail.toLowerCase().includes('tồn tại') ||
        detail.toLowerCase().includes('không tìm thấy')
      ) {
        setApiError('Email này chưa được đăng ký trong hệ thống.');
      } else {
        setApiError(detail || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2: OTP Input Handlers ─────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError(undefined);
    setApiError(undefined);

    // Auto advance
    if (digit && index < OTP_LENGTH - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setOtp(next);
    setOtpError(undefined);
    setApiError(undefined);

    const nextFocus = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputsRef.current[nextFocus]?.focus();
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setApiError(undefined);
    setResendSuccessMsg(undefined);

    try {
      await sendOTP(email, 'reset-password');

      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError(undefined);
      setResendSuccessMsg('Mã OTP mới đã được gửi thành công!');
      otpInputsRef.current[0]?.focus();

      setTimeout(() => {
        setResendSuccessMsg(undefined);
      }, 4000);
    } catch (err: any) {
      const detail = getErrorMessage(err);
      setApiError(detail || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setIsResending(false);
    }
  };

  // Submit OTP (Verify OTP)
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');

    if (code.length < OTP_LENGTH) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã xác thực.');
      return;
    }

    setIsLoading(true);
    setApiError(undefined);

    try {
      const res = await verifyOTP(email, code, 'reset-password');
      const token = res.data?.verified_token;

      if (!token) {
        throw new Error('Không nhận được mã xác nhận hợp lệ từ máy chủ.');
      }

      setVerifiedToken(token);
      setCurrentStep(3);
    } catch (err: any) {
      const detail = getErrorMessage(err);
      if (
        detail.toLowerCase().includes('otp') ||
        detail.toLowerCase().includes('không chính xác') ||
        detail.toLowerCase().includes('hết hạn') ||
        detail.toLowerCase().includes('expired') ||
        detail.toLowerCase().includes('invalid')
      ) {
        setOtpError('Mã OTP không đúng hoặc đã hết hạn.');
        setApiError(detail || 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại.');
      } else {
        setApiError(detail || 'Xác thực OTP thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 3: Submit New Password (Reset Password) ───────────────────────────

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      hasError = true;
    } else {
      setPasswordError(undefined);
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu.');
      hasError = true;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp.');
      hasError = true;
    } else {
      setConfirmPasswordError(undefined);
    }

    if (hasError) return;

    if (!verifiedToken) {
      setApiError('Phiên xác thực đã hết hạn. Vui lòng thực hiện lại từ đầu.');
      return;
    }

    setIsLoading(true);
    setApiError(undefined);

    try {
      await resetPassword(email, newPassword, verifiedToken);
      setCurrentStep(4);
    } catch (err: any) {
      const detail = getErrorMessage(err);
      setApiError(detail || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels: Record<PasswordStrength, string> = {
    none: '',
    weak: 'Yếu',
    medium: 'Trung bình',
    strong: 'Mạnh',
  };

  // ─── Render Progress Stepper ────────────────────────────────────────────────

  const renderStepper = () => {
    if (currentStep === 4) return null;

    const steps = [
      { id: 1, label: 'Nhập email' },
      { id: 2, label: 'Xác thực OTP' },
      { id: 3, label: 'Mật khẩu mới' },
    ];

    const lineWidth = currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%';

    return (
      <div className={styles.stepper} aria-label="Các bước khôi phục mật khẩu">
        <div className={styles.stepLine}>
          <div className={styles.stepLineFill} style={{ width: lineWidth }} />
        </div>

        {steps.map((st) => {
          const isActive = currentStep === st.id;
          const isCompleted = currentStep > st.id;

          return (
            <div
              key={st.id}
              className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${
                isCompleted ? styles.stepCompleted : ''
              }`}
            >
              <div className={styles.stepCircle}>{isCompleted ? '✓' : st.id}</div>
              <span className={styles.stepLabel}>{st.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className={styles.pageContainer}>
      {/* Background Orbs */}
      <div className={styles.bgOrb1} aria-hidden="true" />
      <div className={styles.bgOrb2} aria-hidden="true" />

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
          <div className={styles.navLinks}>
            <button className={styles.navLink} onClick={() => navigate('/')}>
              Trang chủ
            </button>
            <button className={styles.navLink} onClick={() => navigate('/')}>
              Giới thiệu
            </button>
          </div>
        </div>
        <div className={styles.navButtons}>
          <button className={styles.btnLogin} onClick={() => navigate('/login')}>
            Đăng nhập
          </button>
          <button className={styles.btnSignup} onClick={() => navigate('/register')}>
            Đăng ký
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className={styles.main}>
        <div className={styles.card}>
          {renderStepper()}

          {/* ════════════════ STEP 1: ENTER EMAIL ════════════════ */}
          {currentStep === 1 && (
            <div>
              <div className={styles.header}>
                <div className={styles.iconWrapper}>🔑</div>
                <h1 className={styles.title}>Quên mật khẩu?</h1>
                <p className={styles.subtitle}>
                  Đừng lo lắng! Nhập địa chỉ email liên kết với tài khoản của bạn để nhận mã xác
                  thực OTP.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>
                    Địa chỉ email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(undefined);
                      if (apiError) setApiError(undefined);
                    }}
                    className={`${styles.input} ${emailError ? styles.inputError : ''}`}
                    autoComplete="email"
                    autoFocus
                  />
                  {emailError && (
                    <span className={styles.errorText} role="alert">
                      {emailError}
                    </span>
                  )}
                </div>

                {apiError && (
                  <div className={styles.alertBanner} role="alert">
                    ⚠️ {apiError}
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                  {isLoading && <span className={styles.spinner} aria-hidden="true" />}
                  {isLoading ? 'Đang gửi mã OTP...' : 'Tiếp tục'}
                </button>
              </form>

              <div className={styles.backLinkContainer}>
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={() => navigate('/login')}
                >
                  ← Quay lại đăng nhập
                </button>
              </div>
            </div>
          )}

          {/* ════════════════ STEP 2: ENTER OTP ════════════════ */}
          {currentStep === 2 && (
            <div>
              <div className={styles.header}>
                <div className={styles.iconWrapper}>📩</div>
                <h1 className={styles.title}>Xác thực mã OTP</h1>
                <p className={styles.subtitle}>
                  Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến:
                </p>
                <div className={styles.emailHighlightBox}>
                  <span className={styles.emailHighlight}>{email}</span>
                  <button
                    type="button"
                    className={styles.changeEmailBtn}
                    onClick={() => {
                      setCurrentStep(1);
                      setApiError(undefined);
                    }}
                  >
                    Thay đổi
                  </button>
                </div>
              </div>

              <form onSubmit={handleOtpSubmit} className={styles.form} noValidate>
                <div className={styles.otpRow}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      className={`${styles.otpInput} ${
                        otpError ? styles.otpInputError : ''
                      }`}
                      aria-label={`Số OTP thứ ${idx + 1}`}
                      disabled={isLoading}
                    />
                  ))}
                </div>

                {otpError && (
                  <div className={styles.errorText} style={{ justifyContent: 'center' }}>
                    {otpError}
                  </div>
                )}

                {/* Resend OTP Row */}
                <div className={styles.resendSection}>
                  <span>Chưa nhận được mã?</span>
                  {cooldown > 0 ? (
                    <span className={styles.countdownBadge}>Gửi lại sau {cooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.resendBtn}
                      onClick={handleResendOtp}
                      disabled={isResending || isLoading}
                    >
                      {isResending ? 'Đang gửi...' : 'Gửi lại mã'}
                    </button>
                  )}
                </div>

                {resendSuccessMsg && (
                  <div className={styles.toastSuccess}>
                    ✓ {resendSuccessMsg}
                  </div>
                )}

                {apiError && (
                  <div className={styles.alertBanner} role="alert">
                    ⚠️ {apiError}
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isLoading || otp.some((d) => d === '')}
                >
                  {isLoading && <span className={styles.spinner} aria-hidden="true" />}
                  {isLoading ? 'Đang xác thực...' : 'Xác nhận OTP'}
                </button>
              </form>

              <div className={styles.backLinkContainer}>
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={() => setCurrentStep(1)}
                >
                  ← Nhập lại email khác
                </button>
              </div>
            </div>
          )}

          {/* ════════════════ STEP 3: NEW PASSWORD ════════════════ */}
          {currentStep === 3 && (
            <div>
              <div className={styles.header}>
                <div className={styles.iconWrapper}>🔒</div>
                <h1 className={styles.title}>Tạo mật khẩu mới</h1>
                <p className={styles.subtitle}>
                  Vui lòng tạo một mật khẩu mạnh với ít nhất 8 ký tự để bảo vệ tài khoản của bạn.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className={styles.form} noValidate>
                {/* New Password */}
                <div className={styles.field}>
                  <label htmlFor="newPassword" className={styles.label}>
                    Mật khẩu mới
                  </label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Tối thiểu 8 ký tự"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError(undefined);
                      }}
                      className={`${styles.input} ${
                        passwordError ? styles.inputError : ''
                      }`}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.eyeToggle}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {newPassword && (
                    <div
                      className={styles.strengthWrapper}
                      aria-label={`Độ mạnh mật khẩu: ${strengthLabels[passwordStrength]}`}
                    >
                      <div className={styles.strengthBar}>
                        <div
                          className={`${styles.strengthSegment} ${
                            passwordStrength !== 'none' ? styles[`seg_${passwordStrength}`] : ''
                          }`}
                        />
                        <div
                          className={`${styles.strengthSegment} ${
                            passwordStrength === 'medium' || passwordStrength === 'strong'
                              ? styles[`seg_${passwordStrength}`]
                              : ''
                          }`}
                        />
                        <div
                          className={`${styles.strengthSegment} ${
                            passwordStrength === 'strong' ? styles.seg_strong : ''
                          }`}
                        />
                      </div>
                      <span
                        className={`${styles.strengthLabel} ${
                          styles[`label_${passwordStrength}`]
                        }`}
                      >
                        {strengthLabels[passwordStrength]}
                      </span>
                    </div>
                  )}

                  {passwordError && (
                    <span className={styles.errorText} role="alert">
                      {passwordError}
                    </span>
                  )}
                </div>

                {/* Confirm Password */}
                <div className={styles.field}>
                  <label htmlFor="confirmPassword" className={styles.label}>
                    Xác nhận mật khẩu mới
                  </label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError(undefined);
                      }}
                      className={`${styles.input} ${
                        confirmPasswordError ? styles.inputError : ''
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeToggle}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <span className={styles.errorText} role="alert">
                      {confirmPasswordError}
                    </span>
                  )}
                </div>

                {apiError && (
                  <div className={styles.alertBanner} role="alert">
                    ⚠️ {apiError}
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                  {isLoading && <span className={styles.spinner} aria-hidden="true" />}
                  {isLoading ? 'Đang cập nhật mật khẩu...' : 'Đặt lại mật khẩu'}
                </button>
              </form>

              <div className={styles.backLinkContainer}>
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={() => setCurrentStep(2)}
                >
                  ← Quay lại bước OTP
                </button>
              </div>
            </div>
          )}

          {/* ════════════════ STEP 4: SUCCESS ════════════════ */}
          {currentStep === 4 && (
            <div className={styles.successContainer}>
              <div className={styles.successIconBadge}>✓</div>
              <h1 className={styles.title}>Đặt lại mật khẩu thành công!</h1>
              <p className={styles.subtitle} style={{ marginBottom: '1.75rem' }}>
                Mật khẩu của bạn đã được cập nhật an toàn. Bây giờ bạn có thể đăng nhập bằng mật
                khẩu mới.
              </p>

              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => navigate('/login', { replace: true })}
              >
                Đăng nhập ngay
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
