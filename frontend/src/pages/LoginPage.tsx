import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import styles from './LoginPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(
  name: keyof FormValues,
  value: string
): string | undefined {
  switch (name) {
    case 'email':
      if (!value.trim()) return 'Vui lòng nhập email.';
      if (!EMAIL_REGEX.test(value)) return 'Địa chỉ email không hợp lệ.';
      return undefined;
    case 'password':
      if (!value) return 'Vui lòng nhập mật khẩu.';
      return undefined;
    default:
      return undefined;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormValues;
    setValues((prev) => ({ ...prev, [key]: value }));
    if (touched[key]) {
      setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormValues;
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const allErrors: FormErrors = {
      email: validateField('email', values.email),
      password: validateField('password', values.password),
    };
    setErrors(allErrors);
    setTouched({ email: true, password: true });

    if (Object.values(allErrors).some(Boolean)) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const res = await login(values.email, values.password);
      if (res && res.access_token) {
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('user_email', values.email);
        navigate('/watchlist');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Email hoặc mật khẩu không chính xác.';
      if (typeof err === 'string') {
        msg = err;
      } else if (err?.detail) {
        msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } else if (err?.message) {
        msg = err.message;
      }
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClass = (field: keyof FormValues) =>
    [styles.input, touched[field] && errors[field] ? styles.inputError : ''].filter(Boolean).join(' ');

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

        {/* LEFT — Visual Panel */}
        <section className={styles.visualPanel} aria-hidden="true">
          <div className={styles.visualShape1} />
          <div className={styles.visualShape2} />
          <div className={styles.visualShape3} />

          <div className={styles.brandContent}>
            <div className={styles.brandLogo}>Trakora</div>
            <h2 className={styles.brandHeading}>Không bỏ lỡ<br />ưu đãi nào nữa.</h2>
            <p className={styles.brandDesc}>
              Đăng nhập để xem danh sách sản phẩm đang theo dõi và nhận thông báo ngay khi giá về mức bạn muốn.
            </p>
            <div className={styles.featurePills}>
              <span className={styles.pill}>📈 Biểu đồ lịch sử giá</span>
              <span className={styles.pill}>🔔 Cảnh báo giá theo thời gian thực</span>
              <span className={styles.pill}>🛒 Nhiều sàn thương mại điện tử</span>
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

        {/* RIGHT — Form Panel */}
        <section className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Đăng nhập</h1>
              <p className={styles.formSubtitle}>Chào mừng trở lại! Nhập thông tin tài khoản của bạn.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
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
                <div className={styles.labelRow}>
                  <label htmlFor="password" className={styles.label}>Mật khẩu</label>
                  <button
                    type="button"
                    className={styles.forgotLink}
                    onClick={() => {/* TODO: forgot password flow */}}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClass('password')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeToggle}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    tabIndex={0}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <span className={styles.errorMsg} role="alert">{errors.password}</span>
                )}
              </div>

              {submitError && (
                <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '14px', textAlign: 'center' }}>
                  {submitError}
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <p className={styles.registerRedirect}>
              Chưa có tài khoản?{' '}
              <button className={styles.registerLink} onClick={() => navigate('/register')}>
                Đăng ký ngay
              </button>
            </p>
          </div>
        </section>

      </main>
    </div>
  );
};

export default LoginPage;
