import React from 'react';
import '../styles/LandingPage.css';

const LandingPage: React.FC = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Header / Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo" onClick={() => scrollToSection('home')}>Trakora</div>
          <div className="nav-links">
            <button onClick={() => scrollToSection('home')} className="nav-link">Home</button>
            <button onClick={() => scrollToSection('introduction')} className="nav-link">Introduction</button>
          </div>
        </div>
        <div className="nav-buttons">
          <button className="btn-login">Đăng nhập</button>
          <button className="btn-signup">Đăng ký</button>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section id="home" className="hero-section centered">
        <div className="hero-content text-center">
          <h1 className="hero-title">Chào mừng đến với <span className="highlight">Trakora</span></h1>
          <p className="hero-subtitle">
            Trakora là nền tảng quản lý công việc và tối ưu hóa hiệu suất toàn diện. <br/>
            Giúp bạn sắp xếp, theo dõi và hoàn thành mục tiêu một cách thông minh và dễ dàng nhất.
          </p>
          <div className="cta-buttons centered-cta">
            <button className="btn-primary" onClick={() => scrollToSection('introduction')}>Bắt đầu ngay</button>
            <button className="btn-secondary" onClick={() => scrollToSection('introduction')}>Tìm hiểu thêm</button>
          </div>
        </div>
        
        <div className="hero-visual centered-visual">
          <div className="abstract-shape shape-1"></div>
          <div className="abstract-shape shape-2"></div>
          <div className="glass-card">
            <div className="card-header">
              <div className="dot red"></div>
              <div className="dot yellow"></div>
              <div className="dot green"></div>
            </div>
            <div className="card-body">
              <div className="mockup-line line-1"></div>
              <div className="mockup-line line-2"></div>
              <div className="mockup-line line-3"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section id="introduction" className="intro-section">
        <h2 className="section-title">Giới thiệu về <span className="highlight">Trakora</span></h2>
        <p className="section-subtitle">Khám phá các tính năng vượt trội giúp bạn nâng cao năng suất làm việc mỗi ngày.</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Tối ưu hiệu suất</h3>
            <p>Quản lý thời gian và nguồn lực hiệu quả, giúp bạn hoàn thành công việc nhanh hơn với chất lượng tốt nhất.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Theo dõi tiến độ</h3>
            <p>Báo cáo trực quan, theo dõi sát sao từng bước phát triển của dự án một cách minh bạch và rõ ràng.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Làm việc nhóm</h3>
            <p>Kết nối và cộng tác dễ dàng với các thành viên trong đội ngũ, chia sẻ thông tin liền mạch mọi lúc mọi nơi.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-col">
            <h4 className="footer-logo">Trakora</h4>
            <p className="footer-desc">Giải pháp quản lý và tối ưu hóa công việc hàng đầu cho cá nhân và doanh nghiệp.</p>
          </div>
          <div className="footer-col">
            <h4>Khám phá</h4>
            <ul>
              <li><button onClick={() => scrollToSection('home')}>Trang chủ</button></li>
              <li><button onClick={() => scrollToSection('introduction')}>Giới thiệu</button></li>
              <li><button>Tính năng</button></li>
              <li><button>Bảng giá</button></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Hỗ trợ</h4>
            <ul>
              <li><button>Trung tâm trợ giúp</button></li>
              <li><button>Điều khoản sử dụng</button></li>
              <li><button>Chính sách bảo mật</button></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Liên hệ</h4>
            <ul className="contact-info">
              <li>📧 support@trakora.com</li>
              <li>📞 1800 1234</li>
              <li>📍 123 Đường ABC, TP.HCM</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Trakora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
