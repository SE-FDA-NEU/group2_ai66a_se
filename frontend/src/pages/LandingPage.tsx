import React from 'react';
import {
  AlertTriangle,
  Bell,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock,
  Link2,
  Mail,
  MapPin,
  Moon,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Star,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatVnd } from '../utils/currency';
import styles from './LandingPage.module.css';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
}

export interface VisualProductPreview {
  name: string;
  shopName: string;
  rating: number;
  reviewCount: number;
  currentPrice: number;
  originalPrice?: number;
  priceLow: number;
  priceHigh: number;
  targetPrice: number;
  priceBadgeText: string;
  priceBadgeType: 'success' | 'warning' | 'error';
  shopTrustText: string;
  shopTrustType: 'success' | 'warning';
}

const CORE_FEATURES: FeatureItem[] = [
  {
    id: 'feature-link',
    title: 'Dán link & Theo dõi giá tức thì',
    description:
      'Sao chép và dán liên kết sản phẩm vào Trakora. Hệ thống tự động trích xuất thông tin, quy đổi tiền tệ VND và lưu vào danh sách theo dõi tập trung.',
    highlights: [
      'Hiển thị ngay giá hiện tại, giá thấp nhất và cao nhất lịch sử',
      'Theo dõi tối đa 10 sản phẩm quan trọng nhất mỗi tài khoản',
      'Lưu giữ lịch sử giá 7 ngày ngay cả khi tạm ngừng theo dõi',
    ],
    icon: <Link2 size={26} aria-hidden="true" />,
  },
  {
    id: 'feature-chart',
    title: 'Biểu đồ đường lịch sử giá & Phát hiện Gap',
    description:
      'Trực quan hóa toàn bộ biến động giá bằng biểu đồ đường theo mốc 7 ngày, 14 ngày, 30 ngày hoặc Tất cả (All-time), tự động đánh dấu khoảng đứt quãng dữ liệu.',
    highlights: [
      'Đường tham chiếu nét đứt cho Giá cao nhất, Giá thấp nhất và Giá mục tiêu',
      'Tự động phát hiện và hiển thị khoảng gián đoạn thu thập dữ liệu (Gap)',
      'Cập nhật biến động giá theo thời gian thực qua Server-Sent Events (SSE)',
    ],
    icon: <ChartNoAxesCombined size={26} aria-hidden="true" />,
  },
  {
    id: 'feature-fake-discount',
    title: 'Cảnh báo giảm giá ảo & Nhãn đánh giá giá',
    description:
      'Phân tích lịch sử giá thực tế để gắn nhãn khách quan (Giá tốt, Bình thường, Giá cao) và phát hiện ngay chiêu trò nâng giá gốc trước đợt sale.',
    highlights: [
      'Cảnh báo "Giảm giá ảo" khi giá sau giảm vẫn cao hơn trung bình lịch sử',
      'Nhãn "Giá tốt" khi giá hiện tại nằm trong vùng ≤ 5% sát mức đáy lịch sử',
      'Hiển thị rõ "Chưa đủ dữ liệu" với sản phẩm mới theo dõi dưới 7 ngày',
    ],
    icon: <AlertTriangle size={26} aria-hidden="true" />,
  },
  {
    id: 'feature-target-alert',
    title: 'Giá mục tiêu & Chế độ "Mua khi giá tốt"',
    description:
      'Chủ động đặt mức giá kỳ vọng hoặc bật chế độ tự động cảnh báo khi sản phẩm chạm vùng giá tốt mà không cần tự tính toán con số cụ thể.',
    highlights: [
      'Ràng buộc thông minh: Giá mục tiêu luôn thấp hơn giá hiện tại',
      'Tùy chọn "Mua khi giá tốt" tự động kích hoạt khi giá rơi vào vùng đáy',
      'Thông báo kèm liên kết dẫn thẳng tới trang sản phẩm để chốt đơn ngay',
    ],
    icon: <Target size={26} aria-hidden="true" />,
  },
  {
    id: 'feature-shop-trust',
    title: 'Độ uy tín Cửa hàng & So sánh giá nhanh',
    description:
      'Tránh mua phải hàng giả, hàng kém chất lượng nhờ nhãn đánh giá độ tin cậy của shop, xem nhận xét nổi bật và sắp xếp danh sách theo giá.',
    highlights: [
      'Phân loại trực quan: Shop uy tín cao, Shop bình thường, Cần cân nhắc',
      'Hiển thị điểm sao, tổng lượt đánh giá, thương hiệu và top review thực tế',
      'Sắp xếp nhanh danh sách theo dõi theo giá hiện tại từ thấp đến cao',
    ],
    icon: <ShieldCheck size={26} aria-hidden="true" />,
  },
  {
    id: 'feature-notifications',
    title: 'Đa kênh thông báo, Giờ yên tĩnh & Bảo mật',
    description:
      'Nhận thông báo qua Web Push, Trung tâm thông báo và Email; hỗ trợ cấu hình khung giờ yên tĩnh ban đêm cùng xác thực Google OAuth / OTP.',
    highlights: [
      'Tùy chỉnh bật/tắt thông báo Email, Web Push và Khung giờ yên tĩnh (Quiet Hours)',
      'Đăng ký & đăng nhập nhanh qua Google OAuth hoặc Email OTP 6 chữ số',
      'Quản lý hồ sơ cá nhân, biệt danh (nickname) và khôi phục mật khẩu an toàn',
    ],
    icon: <Bell size={26} aria-hidden="true" />,
  },
];

const VISUAL_PRODUCTS: VisualProductPreview[] = [
  {
    name: 'Tai nghe chống ồn Sony WH-1000XM5 Wireless',
    shopName: 'Sony Official Store',
    rating: 4.9,
    reviewCount: 2450,
    currentPrice: 7490000,
    priceLow: 7350000,
    priceHigh: 9590000,
    targetPrice: 7600000,
    priceBadgeText: 'Giá tốt',
    priceBadgeType: 'success',
    shopTrustText: 'Shop uy tín',
    shopTrustType: 'success',
  },
  {
    name: 'Máy đọc sách Kindle Paperwhite 5 (Gen 11) 16GB',
    shopName: 'TechDeals Store',
    rating: 4.6,
    reviewCount: 890,
    currentPrice: 4190000,
    originalPrice: 5890000,
    priceLow: 3590000,
    priceHigh: 4450000,
    targetPrice: 3750000,
    priceBadgeText: 'Cảnh báo giảm giá ảo',
    priceBadgeType: 'warning',
    shopTrustText: 'Shop uy tín',
    shopTrustType: 'success',
  },
  {
    name: 'Bàn phím cơ không dây Keychron K8 Pro RGB',
    shopName: 'GearHub Shop',
    rating: 4.2,
    reviewCount: 38,
    currentPrice: 2850000,
    priceLow: 2290000,
    priceHigh: 2950000,
    targetPrice: 2400000,
    priceBadgeText: 'Giá cao',
    priceBadgeType: 'error',
    shopTrustText: 'Cần cân nhắc',
    shopTrustType: 'warning',
  },
];

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
            <button onClick={() => scrollToSection('visuals')} className={styles.navLink}>
              Trực quan tính năng
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

      {/* Hero Section (Restored to original clean layout) */}
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
            <button
              className={styles.btnSecondaryCta}
              onClick={() => scrollToSection('introduction')}
            >
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

      {/* Introduction & Full Features Section */}
      <section id="introduction" className={styles.introSection}>
        <h2 className={styles.sectionTitle}>
          Giới thiệu về <span className={styles.highlight}>Trakora</span>
        </h2>
        <p className={styles.sectionSubtitle}>
          Khám phá trọn bộ tính năng giúp bạn theo dõi lịch sử giá tự động, nhận biết giảm giá ảo và tối ưu chi phí mua sắm.
        </p>

        <div className={styles.featuresGrid}>
          {CORE_FEATURES.map((feature) => (
            <div key={feature.id} className={styles.featureCard}>
              <div className={styles.featureCardHeader}>
                <div className={styles.featureIcon}>{feature.icon}</div>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <ul className={styles.featureChecklist}>
                {feature.highlights.map((point, index) => (
                  <li key={index}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Static Visual Illustrations Section (Line Chart, Watchlist Badges, Notification & Shop Trust) */}
      <section id="visuals" className={styles.visualShowcaseSection}>
        <h2 className={styles.sectionTitle}>
          Hình ảnh trực quan <span className={styles.highlight}>Hệ thống Trakora</span>
        </h2>
        <p className={styles.sectionSubtitle}>
          Giao diện trực quan giúp bạn nắm bắt toàn bộ lịch sử biến động giá, cảnh báo giảm giá ảo và độ tin cậy của cửa hàng chỉ trong một ánh nhìn.
        </p>

        <div className={styles.visualBlockList}>
          {/* Visual 1: Static Line Chart Illustration */}
          <div className={styles.visualBlock}>
            <div className={styles.visualTextCol}>
              <span className={styles.visualEyebrow}>Biểu đồ đường lịch sử giá</span>
              <h3>Theo dõi xu hướng bằng biểu đồ đường & đường tham chiếu mục tiêu</h3>
              <p>
                Trakora vẽ biểu đồ đường (Line Chart) chi tiết xuyên suốt thời gian sản phẩm được theo dõi (7 ngày, 14 ngày, 30 ngày hoặc Tất cả). Các đường tham chiếu nét đứt hiển thị rõ <strong>Giá cao nhất</strong>, <strong>Giá mục tiêu</strong> và <strong>Giá thấp nhất</strong>.
              </p>
              <div className={styles.visualLegendTags}>
                <span className={`${styles.badgePill} ${styles.badgeSuccess}`}>
                  Chạm giá mục tiêu: {formatVnd(7490000, 'VND')}
                </span>
                <span className={`${styles.badgePill} ${styles.badgeWarning}`}>
                  Tự động phát hiện khoảng gián đoạn (Gap)
                </span>
              </div>
            </div>

            <div className={styles.visualFigureCard} aria-label="Hình minh họa biểu đồ đường lịch sử giá">
              <div className={styles.figureHeader}>
                <div>
                  <div className={styles.figureTitle}>
                    Biểu đồ lịch sử giá — Sony WH-1000XM5
                  </div>
                  <div className={styles.figureSub}>
                    Đang hiển thị: Tất cả (All-time) • Giá hiện tại:{' '}
                    <strong>{formatVnd(7490000, 'VND')}</strong>
                  </div>
                </div>
                <div className={styles.timeRangePills}>
                  <span className={styles.rangePill}>7N</span>
                  <span className={styles.rangePill}>14N</span>
                  <span className={styles.rangePill}>30N</span>
                  <span className={`${styles.rangePill} ${styles.rangePillActive}`}>Tất cả</span>
                </div>
              </div>

              {/* Static SVG Line Chart */}
              <div className={styles.lineChartBox}>
                <svg
                  viewBox="0 0 560 210"
                  className={styles.lineChartSvg}
                  role="img"
                  aria-label="Biểu đồ đường minh họa lịch sử biến động giá giảm dần chạm mức giá mục tiêu"
                >
                  {/* Reference Dashed Line: High Price */}
                  <line
                    x1="45"
                    y1="32"
                    x2="535"
                    y2="32"
                    className={styles.refLineHigh}
                  />
                  <text x="50" y="25" className={styles.svgLabelHigh}>
                    Đỉnh lịch sử: {formatVnd(9590000, 'VND')}
                  </text>

                  {/* Reference Dashed Line: Target Price */}
                  <line
                    x1="45"
                    y1="138"
                    x2="535"
                    y2="138"
                    className={styles.refLineTarget}
                  />
                  <text x="50" y="131" className={styles.svgLabelTarget}>
                    Giá mục tiêu: {formatVnd(7600000, 'VND')}
                  </text>

                  {/* Reference Dashed Line: Low Price */}
                  <line
                    x1="45"
                    y1="172"
                    x2="535"
                    y2="172"
                    className={styles.refLineLow}
                  />
                  <text x="50" y="188" className={styles.svgLabelLow}>
                    Đáy lịch sử: {formatVnd(7350000, 'VND')}
                  </text>

                  {/* Area under the line chart */}
                  <polygon
                    points="55,48 135,62 215,52 295,95 375,88 455,122 525,152 525,175 55,175"
                    className={styles.lineAreaFill}
                  />

                  {/* Solid Line Segments */}
                  <polyline
                    fill="none"
                    points="55,48 135,62 215,52"
                    className={styles.pricePolyline}
                  />
                  {/* Gap Dashed Segment */}
                  <line
                    x1="215"
                    y1="52"
                    x2="295"
                    y2="95"
                    className={styles.gapLineSegment}
                  />
                  {/* Solid Line Segments after Gap */}
                  <polyline
                    fill="none"
                    points="295,95 375,88 455,122 525,152"
                    className={styles.pricePolyline}
                  />

                  {/* Data Nodes */}
                  <circle cx="55" cy="48" r="4.5" className={styles.nodePrimary} />
                  <circle cx="135" cy="62" r="4.5" className={styles.nodePrimary} />
                  <circle cx="215" cy="52" r="4.5" className={styles.nodeWarning} />
                  <circle cx="295" cy="95" r="4.5" className={styles.nodeWarning} />
                  <circle cx="375" cy="88" r="4.5" className={styles.nodePrimary} />
                  <circle cx="455" cy="122" r="4.5" className={styles.nodePrimary} />
                  <circle cx="525" cy="152" r="6" className={styles.nodeSuccess} />

                  {/* Gap Annotation */}
                  <text x="232" y="68" className={styles.svgGapText}>
                    Gap dữ liệu
                  </text>
                </svg>
              </div>

              <div className={styles.figureLegendBar}>
                <span className={styles.legendEntry}>
                  <span className={`${styles.legendSwatch} ${styles.swatchPrimary}`} />
                  Đường giá thực tế
                </span>
                <span className={styles.legendEntry}>
                  <span className={`${styles.legendSwatch} ${styles.swatchSuccess}`} />
                  Ngưỡng Giá mục tiêu & Đáy
                </span>
                <span className={styles.legendEntry}>
                  <span className={`${styles.legendSwatch} ${styles.swatchWarning}`} />
                  Đoạn gián đoạn (Gap)
                </span>
              </div>
            </div>
          </div>

          {/* Visual 2: Watchlist Summary Rows & Fake Discount Detection */}
          <div className={styles.visualBlock}>
            <div className={styles.visualTextCol}>
              <span className={styles.visualEyebrow}>
                Danh sách theo dõi & Cảnh báo giảm giá ảo
              </span>
              <h3>Nhận diện ngay giá tốt, giảm giá ảo và độ uy tín cửa hàng</h3>
              <p>
                Mỗi sản phẩm trong Watchlist hiển thị đầy đủ giá hiện tại, khoảng giá thấp/cao lịch sử, điểm sao đánh giá, nhãn độ tin cậy của shop và cảnh báo ngay nếu người bán nâng giá gốc lên cao rồi gắn mác giảm giá ảo.
              </p>
              <div className={styles.visualLegendTags}>
                <span className={`${styles.badgePill} ${styles.badgeSuccess}`}>
                  Nhãn Giá tốt & Shop uy tín
                </span>
                <span className={`${styles.badgePill} ${styles.badgeWarning}`}>
                  Cảnh báo giảm giá ảo (Fake Discount)
                </span>
              </div>
            </div>

            <div className={styles.visualFigureCard} aria-label="Hình minh họa danh sách sản phẩm theo dõi">
              <div className={styles.figureHeader}>
                <div className={styles.figureTitle}>Danh sách sản phẩm theo dõi (Watchlist)</div>
                <span className={styles.figureSub}>Sắp xếp: Giá thấp đến cao</span>
              </div>

              <div className={styles.staticProductList}>
                {VISUAL_PRODUCTS.map((item, idx) => (
                  <div key={idx} className={styles.staticProductCard}>
                    <div className={styles.staticProductLeft}>
                      <div className={styles.staticThumbIcon}>
                        <ShoppingCart size={18} aria-hidden="true" />
                      </div>
                      <div className={styles.staticProductInfo}>
                        <div className={styles.staticProductName}>{item.name}</div>
                        <div className={styles.staticProductMeta}>
                          <span>{item.shopName}</span>
                          <span
                            className={`${styles.badgePill} ${
                              item.shopTrustType === 'success'
                                ? styles.badgeSuccess
                                : styles.badgeWarning
                            }`}
                          >
                            {item.shopTrustText}
                          </span>
                          <span className={styles.staticStarRating}>
                            <Star size={12} aria-hidden="true" />
                            {item.rating} ({item.reviewCount})
                          </span>
                        </div>
                        <div className={styles.staticPriceBounds}>
                          Thấp nhất: {formatVnd(item.priceLow, 'VND')} • Cao nhất:{' '}
                          {formatVnd(item.priceHigh, 'VND')} • Mục tiêu:{' '}
                          {formatVnd(item.targetPrice, 'VND')}
                        </div>
                      </div>
                    </div>

                    <div className={styles.staticProductRight}>
                      <div className={styles.staticPriceText}>
                        {formatVnd(item.currentPrice, 'VND')}
                      </div>
                      {item.originalPrice && (
                        <div className={styles.staticFakeOriginPrice}>
                          Giá gạch ngang: {formatVnd(item.originalPrice, 'VND')}
                        </div>
                      )}
                      <span
                        className={`${styles.badgePill} ${
                          item.priceBadgeType === 'success'
                            ? styles.badgeSuccess
                            : item.priceBadgeType === 'warning'
                            ? styles.badgeWarning
                            : styles.badgeError
                        }`}
                      >
                        {item.priceBadgeText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual 3: Multi-channel Notification & Quiet Hours Illustration */}
          <div className={styles.visualBlock}>
            <div className={styles.visualTextCol}>
              <span className={styles.visualEyebrow}>
                Cảnh báo thông minh & Khung giờ yên tĩnh
              </span>
              <h3>Thông báo tức thì đa kênh nhưng không làm phiền giấc ngủ</h3>
              <p>
                Ngay khi giá giảm xuống dưới mức <strong>Giá mục tiêu</strong> hoặc chạm vùng <strong>Giá tốt</strong>, Trakora lập tức gửi cảnh báo qua Trung tâm thông báo, Web Push và Email. Bạn có thể bật <strong>Khung giờ yên tĩnh (Quiet Hours)</strong> để không bị đánh thức vào ban đêm.
              </p>
              <div className={styles.visualLegendTags}>
                <span className={`${styles.badgePill} ${styles.badgeSuccess}`}>
                  Email + Web Push + In-App SSE
                </span>
                <span className={`${styles.badgePill} ${styles.badgeNeutral}`}>
                  Quiet Hours: 23:00 – 07:00
                </span>
              </div>
            </div>

            <div className={styles.visualFigureCard} aria-label="Hình minh họa thông báo giảm giá và khung giờ yên tĩnh">
              <div className={styles.figureHeader}>
                <div className={styles.figureTitle}>Cấu hình Cảnh báo & Thông báo tự động</div>
                <span className={`${styles.badgePill} ${styles.badgeSuccess}`}>Đang hoạt động</span>
              </div>

              <div className={styles.notifVisualStack}>
                <div className={styles.notifAlertSample}>
                  <div className={styles.notifAlertIcon}>
                    <Bell size={18} aria-hidden="true" />
                  </div>
                  <div className={styles.notifAlertBody}>
                    <div className={styles.notifAlertTitle}>
                      Giá đã chạm mục tiêu! Sony WH-1000XM5 giảm còn {formatVnd(7490000, 'VND')}
                    </div>
                    <div className={styles.notifAlertDesc}>
                      Thấp hơn mức giá mục tiêu bạn đặt ({formatVnd(7600000, 'VND')}). Nhấn để mở trang sản phẩm trên sàn ngay.
                    </div>
                  </div>
                </div>

                <div className={styles.settingsVisualRow}>
                  <div className={styles.settingVisualBox}>
                    <Moon size={18} aria-hidden="true" />
                    <div>
                      <div className={styles.settingBoxTitle}>Khung giờ yên tĩnh (Quiet Hours)</div>
                      <div className={styles.settingBoxSub}>Tạm hoãn chuông báo từ 23:00 đến 07:00 sáng</div>
                    </div>
                  </div>
                  <div className={styles.settingVisualBox}>
                    <Clock size={18} aria-hidden="true" />
                    <div>
                      <div className={styles.settingBoxTitle}>Chế độ "Mua khi giá tốt"</div>
                      <div className={styles.settingBoxSub}>Tự động báo khi giá chạm vùng 5% đáy lịch sử</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                <button onClick={() => scrollToSection('visuals')}>Trực quan tính năng</button>
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
              <li>
                <Mail size={16} aria-hidden="true" /> trakora.app@gmail.com
              </li>
              <li>
                <Phone size={16} aria-hidden="true" /> 1800 1234
              </li>
              <li>
                <MapPin size={16} aria-hidden="true" /> Hà Nội, Việt Nam
              </li>
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
