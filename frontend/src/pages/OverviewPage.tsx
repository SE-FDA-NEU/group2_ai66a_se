import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bookmark,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  Clock,
  Copy,
  HelpCircle,
  Link2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShopTrustBadge } from '../components/ShopTrustBadge';
import { showToast } from '../utils/toast';
import styles from './OverviewPage.module.css';

interface HighlightStat {
  value: string;
  label: string;
}

interface CoreFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface UsageStep {
  step: number;
  title: string;
  description: string;
  tip: string;
}

interface PriceLabelGuide {
  label: string;
  badgeClass: string;
  description: string;
}

interface ShopTrustGuide {
  label: 'Trusted' | 'Needs caution' | 'Risky: few ratings';
  description: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const SUPPORT_EMAIL = 'trakora.app@gmail.com';
const SUPPORT_PHONE = '1800 1234';

const QUICK_JUMP_LINKS = [
  { id: 'gioi-thieu', label: 'Giới thiệu' },
  { id: 'huong-dan', label: 'Hướng dẫn sử dụng' },
  { id: 'nhan-danh-gia', label: 'Ý nghĩa nhãn đánh giá' },
  { id: 'cau-hoi-thuong-gap', label: 'Câu hỏi thường gặp' },
  { id: 'lien-he', label: 'Liên hệ & Hỗ trợ' },
];

const HIGHLIGHT_STATS: HighlightStat[] = [
  {
    value: 'Tối đa 10 sản phẩm',
    label: 'Theo dõi tập trung các sản phẩm quan trọng nhất trên mỗi tài khoản.',
  },
  {
    value: '7+ ngày dữ liệu',
    label: 'Ngưỡng phân tích lịch sử giá để gắn nhãn khách quan và phát hiện giảm giá ảo.',
  },
  {
    value: 'Lưu trữ 7 ngày',
    label: 'Bảo toàn lịch sử giá trong 7 ngày ngay cả khi bạn tạm ngừng theo dõi sản phẩm.',
  },
  {
    value: '23:00 – 07:00',
    label: 'Khung giờ yên tĩnh (Quiet Hours) giúp tạm hoãn thông báo ban đêm.',
  },
];

const CORE_FEATURES: CoreFeature[] = [
  {
    id: 'link-tracking',
    title: 'Dán link & Theo dõi tức thì',
    description:
      'Dán đường dẫn sản phẩm Amazon để tự động trích xuất tên, ảnh, giá hiện tại, khoảng giá lịch sử và quy đổi tiền tệ sang VND.',
    icon: <Link2 size={20} aria-hidden="true" />,
  },
  {
    id: 'price-chart',
    title: 'Biểu đồ lịch sử giá & Phát hiện Gap',
    description:
      'Xem xu hướng giá theo mốc 7 ngày, 14 ngày, 30 ngày hoặc Tất cả kèm đường tham chiếu Đỉnh, Đáy, Giá mục tiêu và đoạn gián đoạn dữ liệu.',
    icon: <ChartNoAxesCombined size={20} aria-hidden="true" />,
  },
  {
    id: 'fake-discount',
    title: 'Cảnh báo khuyến mãi ảo',
    description:
      'Phát hiện khi sản phẩm hiển thị giảm giá trên sàn nhưng giá bán thực tế vẫn cao hơn trên 10% so với trung vị lịch sử.',
    icon: <AlertTriangle size={20} aria-hidden="true" />,
  },
  {
    id: 'target-alert',
    title: 'Giá mục tiêu & Mua khi giá tốt',
    description:
      'Chủ động đặt mức giá kỳ vọng cá nhân hoặc bật chế độ tự động cảnh báo khi giá rơi vào vùng ≤ 5% sát đáy lịch sử.',
    icon: <Target size={20} aria-hidden="true" />,
  },
  {
    id: 'shop-trust',
    title: 'Đánh giá độ uy tín cửa hàng',
    description:
      'Phân loại độ tin cậy của shop theo điểm sao và tổng lượt đánh giá, đi kèm nhận xét nổi bật giúp hạn chế rủi ro khi mua sắm.',
    icon: <ShieldCheck size={20} aria-hidden="true" />,
  },
  {
    id: 'notifications',
    title: 'Thông báo tự động & Khung giờ yên tĩnh',
    description:
      'Nhận cảnh báo qua Trung tâm thông báo trong ứng dụng và Email ngay khi giá đạt kỳ vọng, tùy chọn tắt làm phiền ban đêm.',
    icon: <Bell size={20} aria-hidden="true" />,
  },
];

const USAGE_STEPS: UsageStep[] = [
  {
    step: 1,
    title: 'Thêm sản phẩm cần theo dõi',
    description:
      'Sao chép đường dẫn (URL) sản phẩm từ Amazon, mở mục Danh sách theo dõi, nhấn "+ Thêm sản phẩm" và dán liên kết vào ô nhập.',
    tip: 'Có thể đặt ngay Giá mục tiêu hoặc chọn "Mua khi giá tốt".',
  },
  {
    step: 2,
    title: 'Quan sát & So sánh trên Danh sách',
    description:
      'Theo dõi giá hiện tại, khoảng giá thấp/cao nhất lịch sử, điểm sao, nhãn độ uy tín cửa hàng và nhãn đánh giá giá ngay trên từng dòng.',
    tip: 'Dùng nút Sắp xếp theo giá hoặc ô Tìm kiếm để lọc nhanh.',
  },
  {
    step: 3,
    title: 'Phân tích sâu tại Trang chi tiết',
    description:
      'Nhấn vào bất kỳ sản phẩm nào để xem biểu đồ đường lịch sử giá theo mốc 7N, 14N, 30N, Tất cả cùng thông số thương hiệu và đánh giá thực tế.',
    tip: 'Đoạn nét đứt trên biểu đồ đánh dấu khoảng gián đoạn dữ liệu (Gap).',
  },
  {
    step: 4,
    title: 'Tùy chỉnh Cảnh báo & Chốt đơn',
    description:
      'Nhấn biểu tượng Cài đặt (bánh răng) tại trang chi tiết để cập nhật Giá mục tiêu, bật/tắt thông báo Email và Khung giờ yên tĩnh.',
    tip: 'Khi nhận thông báo giảm giá, bấm "Xem nơi bán" để mở trang mua hàng.',
  },
];

const PRICE_LABEL_GUIDES: PriceLabelGuide[] = [
  {
    label: 'Giá tốt',
    badgeClass: styles.badgeSuccess,
    description:
      'Giá hiện tại đang nằm trong phạm vi ≤ 5% so với mức giá thấp nhất lịch sử — thời điểm tối ưu để cân nhắc mua.',
  },
  {
    label: 'Bình thường',
    badgeClass: styles.badgeNeutral,
    description:
      'Giá hiện tại ổn định, nằm trong biên độ dao động thông thường của sản phẩm trong thời gian theo dõi.',
  },
  {
    label: 'Giá cao',
    badgeClass: styles.badgeError,
    description:
      'Giá hiện tại đang ở vùng cao hơn mặt bằng lịch sử; bạn nên đặt Giá mục tiêu và chờ đợt giảm giá tiếp theo.',
  },
  {
    label: 'Khuyến mãi ảo',
    badgeClass: styles.badgeWarning,
    description:
      'Sản phẩm hiển thị giá gạch ngang khuyến mãi trên sàn nhưng giá bán sau giảm vẫn cao hơn > 10% so với trung vị lịch sử.',
  },
  {
    label: 'Chưa đủ dữ liệu đánh giá',
    badgeClass: styles.badgeNeutral,
    description:
      'Sản phẩm mới được theo dõi dưới 7 ngày dữ liệu riêng biệt; hệ thống đang tiếp tục ghi nhận để đưa ra đánh giá chính xác.',
  },
];

const SHOP_TRUST_GUIDES: ShopTrustGuide[] = [
  {
    label: 'Trusted',
    description:
      'Cửa hàng có điểm đánh giá từ 4.7★ trở lên và tối thiểu 500 lượt nhận xét, mức độ uy tín cao.',
  },
  {
    label: 'Needs caution',
    description:
      'Cửa hàng có điểm đánh giá hoặc lượng nhận xét ở mức trung bình; nên đọc kỹ chi tiết đánh giá trước khi đặt mua.',
  },
  {
    label: 'Risky: few ratings',
    description:
      'Cửa hàng có điểm đánh giá dưới 4.3★ hoặc ít hơn 50 lượt nhận xét; cần kiểm tra cẩn trọng nguồn gốc sản phẩm.',
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-target-price',
    question: 'Vì sao Giá mục tiêu bắt buộc phải thấp hơn Giá hiện tại?',
    answer:
      'Theo quy tắc theo dõi giá của Trakora, cảnh báo chỉ kích hoạt khi giá giảm xuống chạm hoặc thấp hơn mức bạn kỳ vọng. Nếu đặt Giá mục tiêu lớn hơn hoặc bằng Giá hiện tại thì hệ thống sẽ từ chối lưu để tránh gửi cảnh báo sai ngay lập tức.',
  },
  {
    id: 'faq-limit-10',
    question: 'Khi đạt giới hạn 10 sản phẩm theo dõi thì tôi cần làm gì?',
    answer:
      'Mỗi tài khoản theo dõi tối đa 10 sản phẩm cùng lúc để đảm bảo tần suất cập nhật giá ổn định. Khi danh sách đã đủ 10 sản phẩm, bạn chỉ cần nhấn "Ngừng theo dõi" ở một sản phẩm không còn nhu cầu để thêm sản phẩm mới.',
  },
  {
    id: 'faq-retention',
    question: 'Ngừng theo dõi sản phẩm có làm mất toàn bộ lịch sử giá không?',
    answer:
      'Không mất ngay lập tức. Khi không còn ai theo dõi một sản phẩm, hệ thống vẫn bảo toàn dữ liệu lịch sử giá của sản phẩm đó trong vòng 7 ngày. Nếu bạn thêm lại sản phẩm trong thời gian này, toàn bộ biểu đồ cũ vẫn được giữ nguyên.',
  },
  {
    id: 'faq-gap',
    question: 'Đoạn nét đứt "Gap dữ liệu" trên biểu đồ lịch sử giá nghĩa là gì?',
    answer:
      'Nếu khoảng cách giữa hai lần thu thập giá vượt ngưỡng 30 phút (ví dụ khi nguồn sàn thương mại điện tử tạm gián đoạn hoặc sản phẩm tạm thời chưa lấy được giá), biểu đồ sẽ hiển thị đoạn nối nét đứt để bạn biết khoảng thời gian dữ liệu bị gián đoạn thay vì nối liền như bình thường.',
  },
  {
    id: 'faq-quiet-hours',
    question: 'Làm thế nào để cấu hình nhận thông báo qua Email và Khung giờ yên tĩnh?',
    answer:
      'Bạn mở trang chi tiết của một sản phẩm bất kỳ trong Danh sách theo dõi, nhấn biểu tượng Cài đặt (bánh răng) ở góc trên để bật/tắt nhận thông báo qua Email hoặc kích hoạt Khung giờ yên tĩnh (mặc định 23:00 – 07:00) để không bị làm phiền vào ban đêm.',
  },
];

export const OverviewPage: React.FC = () => {
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0].id);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleJump = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggleFaq = (id: string) => {
    setOpenFaqId((current) => (current === id ? null : id));
  };

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
      }
      setCopiedEmail(true);
      showToast('success', `Đã sao chép email hỗ trợ: ${SUPPORT_EMAIL}`);
      window.setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      showToast('error', `Không thể sao chép tự động. Vui lòng dùng địa chỉ: ${SUPPORT_EMAIL}`);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerText}>
          <h1 className={styles.headerTitle}>Tổng quan &amp; Hướng dẫn sử dụng</h1>
          <p className={styles.headerDescription}>
            Tìm hiểu cách Trakora theo dõi biến động giá tự động, giải mã các nhãn đánh giá và tối ưu chi phí mua sắm của bạn.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/watchlist" className={styles.primaryBtn}>
            <Bookmark size={16} aria-hidden="true" />
            <span>Mở Danh sách theo dõi</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link to="/profile" className={styles.secondaryBtn}>
            <UserRound size={16} aria-hidden="true" />
            <span>Hồ sơ &amp; Cài đặt</span>
          </Link>
        </div>
      </header>

      {/* Quick Jump Navigation */}
      <nav className={styles.quickJumpBar} aria-label="Điều hướng nhanh trên trang Tổng quan">
        <span className={styles.quickJumpLabel}>Mục lục:</span>
        {QUICK_JUMP_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.jumpPill}
            onClick={() => handleJump(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Section 1: Introduction & Core Capabilities */}
      <section id="gioi-thieu" className={styles.section} aria-labelledby="heading-intro">
        <div className={styles.heroCard}>
          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow}>
              <Sparkles size={14} aria-hidden="true" />
              <span>Trợ lý theo dõi giá thông minh</span>
            </span>
            <h2 id="heading-intro" className={styles.heroHeading}>
              Giới thiệu về Trakora — Automated E-commerce Price Tracker
            </h2>
            <p className={styles.heroSummary}>
              Trakora tự động thu thập lịch sử giá sản phẩm trên sàn Amazon, quy đổi sang tiền VND và phân tích xu hướng theo thời gian thực. Hệ thống giúp bạn nhận biết khuyến mãi ảo, đánh giá độ tin cậy của cửa hàng và gửi cảnh báo ngay khi sản phẩm chạm mức giá mục tiêu.
            </p>
          </div>
          <div className={styles.heroMeta}>
            <span className={styles.heroMetaTitle}>Phạm vi hỗ trợ hiện tại</span>
            <span className={styles.heroMetaValue}>Sàn Amazon (URL /dp/...)</span>
            <span className={styles.heroMetaTitle}>Tiền tệ hiển thị</span>
            <span className={styles.heroMetaValue}>Tự động quy đổi sang VND</span>
          </div>
        </div>

        <div className={styles.statsGrid}>
          {HIGHLIGHT_STATS.map((stat) => (
            <div key={stat.value} className={styles.statCard}>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statLabel}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className={styles.featuresGrid}>
          {CORE_FEATURES.map((feature) => (
            <article key={feature.id} className={styles.featureCard}>
              <div className={styles.featureIconWrap}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Section 2: Step-by-step Usage Guide */}
      <section id="huong-dan" className={styles.section} aria-labelledby="heading-guide">
        <div className={styles.sectionHeader}>
          <h2 id="heading-guide" className={styles.sectionTitle}>
            Hướng dẫn sử dụng nhanh (4 bước)
          </h2>
          <p className={styles.sectionSubtitle}>
            Quy trình từ lúc thêm đường dẫn sản phẩm đến khi nhận cảnh báo và chốt đơn giá tốt.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          {USAGE_STEPS.map((item) => (
            <article key={item.step} className={styles.stepCard}>
              <span className={styles.stepBadge} aria-hidden="true">
                {item.step}
              </span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>
                  Bước {item.step}: {item.title}
                </h3>
                <p className={styles.stepDesc}>{item.description}</p>
                <span className={styles.stepTip}>{item.tip}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 3: Price Labels & Shop Trust Badges Guide */}
      <section id="nhan-danh-gia" className={styles.section} aria-labelledby="heading-labels">
        <div className={styles.sectionHeader}>
          <h2 id="heading-labels" className={styles.sectionTitle}>
            Ý nghĩa Nhãn giá &amp; Độ uy tín cửa hàng
          </h2>
          <p className={styles.sectionSubtitle}>
            Cách đọc các nhãn phân tích tự động xuất hiện trên Danh sách theo dõi và Trang chi tiết sản phẩm.
          </p>
        </div>

        <div className={styles.guideTwoCol}>
          <div className={styles.guideCard}>
            <h3 className={styles.guideCardTitle}>Nhãn đánh giá mức giá (Nhãn giá)</h3>
            <ul className={styles.labelList}>
              {PRICE_LABEL_GUIDES.map((item) => (
                <li key={item.label} className={styles.labelItem}>
                  <span className={`${styles.badgePill} ${item.badgeClass}`}>{item.label}</span>
                  <p className={styles.labelDesc}>{item.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.guideCard}>
            <h3 className={styles.guideCardTitle}>Nhãn độ tin cậy cửa hàng (Shop Trust)</h3>
            <ul className={styles.labelList}>
              {SHOP_TRUST_GUIDES.map((item) => (
                <li key={item.label} className={styles.labelItem}>
                  <ShopTrustBadge label={item.label} size="medium" />
                  <p className={styles.labelDesc}>{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: Frequently Asked Questions */}
      <section id="cau-hoi-thuong-gap" className={styles.section} aria-labelledby="heading-faq">
        <div className={styles.sectionHeader}>
          <h2 id="heading-faq" className={styles.sectionTitle}>
            Câu hỏi thường gặp &amp; Lưu ý hữu ích
          </h2>
          <p className={styles.sectionSubtitle}>
            Giải đáp nhanh các quy tắc vận hành quan trọng khi sử dụng Trakora.
          </p>
        </div>

        <div className={styles.faqList}>
          {FAQ_ITEMS.map((item) => {
            const isOpen = openFaqId === item.id;
            const answerId = `${item.id}-answer`;
            return (
              <div key={item.id} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqTrigger}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => handleToggleFaq(item.id)}
                >
                  <span className={styles.faqTriggerText}>
                    <HelpCircle size={15} className={styles.faqHelpIcon} aria-hidden="true" />
                    <span>{item.question}</span>
                  </span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ''}`}
                  />
                </button>
                {isOpen && (
                  <div id={answerId} className={styles.faqAnswer}>
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 5: Contact, Support & Product Info */}
      <section id="lien-he" className={styles.section} aria-labelledby="heading-contact">
        <div className={styles.sectionHeader}>
          <h2 id="heading-contact" className={styles.sectionTitle}>
            Liên hệ, Hỗ trợ &amp; Thông tin sản phẩm
          </h2>
          <p className={styles.sectionSubtitle}>
            Kênh tiếp nhận góp ý, báo lỗi kỹ thuật và các lối tắt điều hướng trong ứng dụng.
          </p>
        </div>

        <div className={styles.guideTwoCol}>
          <div className={styles.contactCard}>
            <h3 className={styles.guideCardTitle}>Liên hệ &amp; Hỗ trợ người dùng</h3>
            <ul className={styles.contactList}>
              <li className={styles.contactRow}>
                <div className={styles.contactInfo}>
                  <Mail size={18} className={styles.contactIcon} aria-hidden="true" />
                  <div>
                    <span className={styles.contactLabel}>Email hỗ trợ</span>
                    <span className={styles.contactValue}>{SUPPORT_EMAIL}</span>
                  </div>
                </div>
                <div className={styles.contactActions}>
                  <button
                    type="button"
                    className={styles.inlineActionBtn}
                    onClick={() => void handleCopyEmail()}
                  >
                    {copiedEmail ? (
                      <>
                        <Check size={14} aria-hidden="true" />
                        <span>Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} aria-hidden="true" />
                        <span>Sao chép email</span>
                      </>
                    )}
                  </button>
                  <a className={styles.inlineActionBtn} href={`mailto:${SUPPORT_EMAIL}`}>
                    <Mail size={14} aria-hidden="true" />
                    <span>Gửi email</span>
                  </a>
                </div>
              </li>

              <li className={styles.contactRow}>
                <div className={styles.contactInfo}>
                  <Phone size={18} className={styles.contactIcon} aria-hidden="true" />
                  <div>
                    <span className={styles.contactLabel}>Tổng đài hỗ trợ (08:00 – 21:00)</span>
                    <span className={styles.contactValue}>{SUPPORT_PHONE}</span>
                  </div>
                </div>
              </li>

              <li className={styles.contactRow}>
                <div className={styles.contactInfo}>
                  <MapPin size={18} className={styles.contactIcon} aria-hidden="true" />
                  <div>
                    <span className={styles.contactLabel}>Địa chỉ văn phòng</span>
                    <span className={styles.contactValue}>
                      Đại học Kinh tế Quốc dân (NEU), Hai Bà Trưng, Hà Nội, Việt Nam
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className={styles.contactCard}>
            <h3 className={styles.guideCardTitle}>Thông tin sản phẩm &amp; Lối tắt nhanh</h3>
            <div className={styles.productMetaBox}>
              <div>
                <strong>Sản phẩm:</strong> Trakora — Automated E-commerce Price Tracker
              </div>
              <div>
                <strong>Nhóm phát triển:</strong> Team 2 — Dự án Công nghệ Phần mềm (NEU)
              </div>
              <div>
                <strong>Khung giờ yên tĩnh mặc định:</strong> 23:00 – 07:00 (Asia/Ho_Chi_Minh)
              </div>
            </div>

            <div className={styles.quickLinksGrid}>
              <Link to="/watchlist" className={styles.quickLinkCard}>
                <div className={styles.quickLinkLeft}>
                  <Bookmark size={18} aria-hidden="true" />
                  <div>
                    <span className={styles.quickLinkTitle}>Danh sách theo dõi</span>
                    <span className={styles.quickLinkSub}>Thêm, sắp xếp và quản lý sản phẩm theo dõi</span>
                  </div>
                </div>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>

              <Link to="/notifications" className={styles.quickLinkCard}>
                <div className={styles.quickLinkLeft}>
                  <Bell size={18} aria-hidden="true" />
                  <div>
                    <span className={styles.quickLinkTitle}>Lịch sử thông báo</span>
                    <span className={styles.quickLinkSub}>Xem lại 10 thông báo biến động giá gần nhất</span>
                  </div>
                </div>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>

              <Link to="/profile" className={styles.quickLinkCard}>
                <div className={styles.quickLinkLeft}>
                  <Clock size={18} aria-hidden="true" />
                  <div>
                    <span className={styles.quickLinkTitle}>Hồ sơ cá nhân &amp; Bảo mật</span>
                    <span className={styles.quickLinkSub}>Cập nhật tên hiển thị, đổi mật khẩu và phiên đăng nhập</span>
                  </div>
                </div>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
