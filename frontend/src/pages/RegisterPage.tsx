import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, loginWithGoogle } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import styles from './RegisterPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function validateField(
  name: keyof FormValues,
  value: string,
  allValues: FormValues
): string | undefined {
  switch (name) {
    case 'fullName':
      if (!value.trim()) return 'Vui lòng nhập họ và tên.';
      if (value.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
      return undefined;
    case 'email':
      if (!value.trim()) return 'Vui lòng nhập email.';
      if (!EMAIL_REGEX.test(value)) return 'Địa chỉ email không hợp lệ.';
      return undefined;
    case 'password':
      if (!value) return 'Vui lòng nhập mật khẩu.';
      if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
      return undefined;
    case 'confirmPassword':
      if (!value) return 'Vui lòng xác nhận mật khẩu.';
      if (value !== allValues.password) return 'Mật khẩu xác nhận không khớp.';
      return undefined;
    default:
      return undefined;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PasswordStrengthBarProps {
  strength: PasswordStrength;
}

const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({ strength }) => {
  const labels: Record<PasswordStrength, string> = {
    none: '',
    weak: 'Yếu',
    medium: 'Trung bình',
    strong: 'Mạnh',
  };

  return (
    <div className={styles.strengthWrapper} aria-label={`Độ mạnh mật khẩu: ${labels[strength]}`}>
      <div className={styles.strengthBar}>
        <div className={`${styles.strengthSegment} ${strength !== 'none' ? styles[`seg_${strength}`] : ''}`} />
        <div className={`${styles.strengthSegment} ${(strength === 'medium' || strength === 'strong') ? styles[`seg_${strength}`] : ''}`} />
        <div className={`${styles.strengthSegment} ${strength === 'strong' ? styles.seg_strong : ''}`} />
      </div>
      {strength !== 'none' && (
        <span className={`${styles.strengthLabel} ${styles[`label_${strength}`]}`}>
          {labels[strength]}
        </span>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveToken } = useAuth();

  const [values, setValues] = useState<FormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState<string | undefined>();

  const handleGoogleSuccess = async (idToken: string) => {
    setIsGoogleLoading(true);
    setApiError(undefined);
    try {
      const res = await loginWithGoogle(idToken);
      saveToken(res.access_token);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const detail = err?.detail ?? err?.message ?? '';
      setApiError(detail || 'Đăng ký bằng Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (errMsg?: string) => {
    setApiError(errMsg || 'Đăng ký Google thất bại. Vui lòng thử lại.');
  };

  const passwordStrength = getPasswordStrength(values.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormValues;
    const updated = { ...values, [key]: value };
    setValues(updated);

    // Re-validate on change if the field was already touched
    if (touched[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: validateField(key, value, updated),
        // Also re-validate confirmPassword when password changes
        ...(key === 'password' && touched.confirmPassword
          ? { confirmPassword: validateField('confirmPassword', updated.confirmPassword, updated) }
          : {}),
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormValues;
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({
      ...prev,
      [key]: validateField(key, value, values),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields
    const allErrors: FormErrors = {
      fullName: validateField('fullName', values.fullName, values),
      email: validateField('email', values.email, values),
      password: validateField('password', values.password, values),
      confirmPassword: validateField('confirmPassword', values.confirmPassword, values),
    };
    setErrors(allErrors);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });

    const hasErrors = Object.values(allErrors).some(Boolean);
    if (hasErrors) return;

    setIsLoading(true);
    setApiError(undefined);
    try {
      await sendOTP(values.email, 'verify-email');
      navigate('/otp', {
        state: {
          email: values.email,
          nickname: values.fullName,   // fullName maps to backend "nickname" field
          password: values.password,
          reason: 'verify-email',
        },
      });
    } catch (err: any) {
      const detail = err?.detail ?? err?.message ?? '';
      if (detail.toLowerCase().includes('already') || detail.toLowerCase().includes('registered')) {
        setApiError('Email này đã được đăng ký. Vui lòng đăng nhập.');
      } else {
        setApiError(detail || 'Không thể gửi OTP. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInputClass = (field: keyof FormValues) =>
    [styles.input, touched[field] && errors[field] ? styles.inputError : ''].filter(Boolean).join(' ');

  // ─── Main render ────────────────────────────────────────────────────────────
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
          <div className={styles.navLinks}>
            <button className={styles.navLink} onClick={() => navigate('/')}>Trang chủ</button>
            <button className={styles.navLink} onClick={() => navigate('/')}>Giới thiệu</button>
          </div>
        </div>
        <div className={styles.navButtons}>
          <button className={styles.btnLogin} onClick={() => navigate('/login')}>Đăng nhập</button>
          <button className={styles.btnSignup} onClick={() => navigate('/register')}>Đăng ký</button>
        </div>
      </nav>

      {/* Split Layout */}
      <main className={styles.splitLayout}>

        {/* LEFT — Form Panel */}
        <section className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Tạo tài khoản</h1>
              <p className={styles.formSubtitle}>Theo dõi giá sản phẩm và nhận cảnh báo khi giá giảm.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              {/* Full Name */}
              <div className={styles.field}>
                <label htmlFor="fullName" className={styles.label}>Họ và tên</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={values.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getInputClass('fullName')}
                  autoComplete="name"
                />
                {touched.fullName && errors.fullName && (
                  <span className={styles.errorMsg} role="alert">{errors.fullName}</span>
                )}
              </div>

              {/* Email */}
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getInputClass('email')}
                  autoComplete="email"
                />
                {touched.email && errors.email && (
                  <span className={styles.errorMsg} role="alert">{errors.email}</span>
                )}
              </div>

              {/* Password */}
              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>Mật khẩu</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getInputClass('password')}
                  autoComplete="new-password"
                />
                {values.password && <PasswordStrengthBar strength={passwordStrength} />}
                {touched.password && errors.password && (
                  <span className={styles.errorMsg} role="alert">{errors.password}</span>
                )}
              </div>

              {/* Confirm Password */}
              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>Xác nhận mật khẩu</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getInputClass('confirmPassword')}
                  autoComplete="new-password"
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <span className={styles.errorMsg} role="alert">{errors.confirmPassword}</span>
                )}
              </div>

              {/* API error banner */}
              {apiError && (
                <div className={styles.apiErrorBanner} role="alert">
                  ⚠️ {apiError}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading && <span className={styles.spinner} aria-hidden="true" />}
                {isLoading ? 'Đang gửi OTP...' : 'Đăng ký'}
              </button>
            </form>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>hoặc</span>
              <span className={styles.dividerLine} />
            </div>

            {/* Google Register */}
            <div className={styles.socialAuthContainer}>
              <GoogleAuthButton
                mode="register"
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                isLoading={isGoogleLoading}
              />
            </div>

            <p className={styles.loginRedirect}>
              Đã có tài khoản?{' '}
              <button className={styles.loginLink} onClick={() => navigate('/login')}>
                Đăng nhập
              </button>
            </p>
          </div>
        </section>

        {/* RIGHT — Visual Panel */}
        <section className={styles.visualPanel} aria-hidden="true">
          <div className={styles.visualShape1} />
          <div className={styles.visualShape2} />
          <div className={styles.visualShape3} />

          <div className={styles.brandContent}>
            <div className={styles.brandLogo}>Trakora</div>
            <h2 className={styles.brandHeading}>Theo dõi giá.<br />Mua đúng lúc.</h2>
            <p className={styles.brandDesc}>
              Trakora tự động theo dõi lịch sử giá sản phẩm thương mại điện tử và báo ngay khi giá giảm xuống mức bạn muốn.
            </p>
            <div className={styles.featurePills}>
              <span className={styles.pill}>📈 Lịch sử giá chi tiết</span>
              <span className={styles.pill}>🔔 Cảnh báo khi giá giảm</span>
              <span className={styles.pill}>🛒 Hỗ trợ nhiều sàn TMĐT</span>
            </div>

            {/* Decorative mock card */}
            <div className={styles.mockCard}>
              <div className={styles.mockCardHeader}>
                <div className={`${styles.dot} ${styles.dotRed}`} />
                <div className={`${styles.dot} ${styles.dotYellow}`} />
                <div className={`${styles.dot} ${styles.dotGreen}`} />
              </div>
              <div className={styles.mockCardBody}>
                <div className={`${styles.mockLine} ${styles.line80}`} />
                <div className={`${styles.mockLine} ${styles.line100}`} />
                <div className={`${styles.mockLine} ${styles.line60}`} />
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default RegisterPage;
