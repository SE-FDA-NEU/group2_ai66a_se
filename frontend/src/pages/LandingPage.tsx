import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.landingContainer}>
      {/* Header / Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <div
            className={styles.logo}
            onClick={() => scrollToSection('home')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && scrollToSection('home')}
          >
            Trakora
          </div>
          <div className={styles.navLinks}>
            <button onClick={() => scrollToSection('home')} className={styles.navLink}>
              Trang chủ
            </button>
            <button onClick={() => scrollToSection('introduction')} className={styles.navLink}>
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
      
      {/* Hero Section */}
      <section id="home" className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Chào mừng đến với <span className={styles.highlight}>Trakora</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Trakora là nền tảng theo dõi và cảnh báo biến động giá thương mại điện tử thông minh. <br />
            Giúp bạn nắm bắt lịch sử giá, săn sale đúng lúc và tiết kiệm tối đa.
          </p>
          <div className={styles.ctaButtons}>
            <button className={styles.btnPrimaryCta} onClick={() => navigate('/register')}>
              Bắt đầu ngay
            </button>
            <button className={styles.btnSecondaryCta} onClick={() => scrollToSection('introduction')}>
              Tìm hiểu thêm
            </button>
          </div>
        </div>
        
        <div className={styles.heroVisual}>
          <div className={styles.glassCard}>
            <div className={styles.cardHeader}>
              <div className={`${styles.dot} ${styles.red}`} />
              <div className={`${styles.dot} ${styles.yellow}`} />
              <div className={`${styles.dot} ${styles.green}`} />
            </div>
            <div className={styles.cardBody}>
              <div className={`${styles.mockupLine} ${styles.line1}`} />
              <div className={`${styles.mockupLine} ${styles.line2}`} />
              <div className={`${styles.mockupLine} ${styles.line3}`} />
            </div>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section id="introduction" className={styles.introSection}>
        <h2 className={styles.sectionTitle}>
          Giới thiệu về <span className={styles.highlight}>Trakora</span>
        </h2>
        <p className={styles.sectionSubtitle}>
          Khám phá các tính năng vượt trội giúp bạn theo dõi giá và tối ưu chi phí mua sắm.
        </p>
        
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📈</div>
            <h3>Biểu đồ lịch sử giá</h3>
            <p>
              Theo dõi biến động giá chi tiết qua từng giai đoạn, nhận biết ngay các đợt giảm giá ảo để mua đúng giá thật.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔔</div>
            <h3>Cảnh báo giá giảm tức thì</h3>
            <p>
              Đặt mức giá mục tiêu mong muốn và nhận thông báo ngay khi sản phẩm chạm ngưỡng bạn cần mua.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛒</div>
            <h3>Hỗ trợ đa sàn thương mại</h3>
            <p>
              Quản lý danh sách theo dõi sản phẩm tập trung từ các sàn thương mại điện tử lớn tại một nơi duy nhất.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerCol}>
            <h4 className={styles.footerLogo}>Trakora</h4>
            <p className={styles.footerDesc}>
              Giải pháp theo dõi biến động giá và thông báo ưu đãi mua sắm thông minh.
            </p>
          </div>
          <div className={styles.footerCol}>
            <h4>Khám phá</h4>
            <ul>
              <li>
                <button onClick={() => scrollToSection('home')}>Trang chủ</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('introduction')}>Giới thiệu</button>
              </li>
              <li>
                <button onClick={() => navigate('/login')}>Đăng nhập</button>
              </li>
              <li>
                <button onClick={() => navigate('/register')}>Đăng ký</button>
              </li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Hỗ trợ</h4>
            <ul>
              <li>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Trung tâm trợ giúp
                </button>
              </li>
              <li>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Điều khoản sử dụng
                </button>
              </li>
              <li>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Chính sách bảo mật
                </button>
              </li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Liên hệ</h4>
            <ul className={styles.contactInfo}>
              <li>📧 support@trakora.com</li>
              <li>📞 1800 1234</li>
              <li>📍 Hà Nội, Việt Nam</li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} Trakora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
