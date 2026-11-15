import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OverviewPage from '../pages/OverviewPage';
import { TopNavigation } from '../components/TopNavigation';
import { getNotificationHistory, getUnseenNotifications } from '../api/notificationApi';
import { showToast } from '../utils/toast';

const mocks = vi.hoisted(() => ({
  auth: {
    isLoggedIn: true,
    user: { id: 8, email: 'giaan@example.com', nickname: 'an' },
    logout: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../api/notificationApi', () => ({
  getNotificationHistory: vi.fn(),
  getUnseenNotifications: vi.fn(),
  markNotificationsSeen: vi.fn(),
}));
vi.mock('../utils/toast', () => ({ showToast: vi.fn() }));

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNotificationHistory).mockResolvedValue([]);
    vi.mocked(getUnseenNotifications).mockResolvedValue([]);
  });

  afterEach(cleanup);

  it('renders introduction, 4-step usage guide, price/trust labels, FAQ, and contact sections', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <OverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Tổng quan & Hướng dẫn sử dụng' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Giới thiệu về Trakora/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Hướng dẫn sử dụng nhanh \(4 bước\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Bước 1: Thêm sản phẩm cần theo dõi/i)).toBeInTheDocument();
    expect(screen.getByText(/Bước 4: Tùy chỉnh Cảnh báo & Chốt đơn/i)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /Ý nghĩa Nhãn giá & Độ uy tín cửa hàng/i })).toBeInTheDocument();
    expect(screen.getByText('Giá tốt')).toBeInTheDocument();
    expect(screen.getByText('Khuyến mãi ảo')).toBeInTheDocument();
    expect(screen.getByText('Đáng tin cậy')).toBeInTheDocument();
    expect(screen.getByText('Cần thận trọng')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /Câu hỏi thường gặp/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Liên hệ, Hỗ trợ & Thông tin sản phẩm/i })).toBeInTheDocument();
    expect(screen.getByText('trakora.app@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('1800 1234')).toBeInTheDocument();
  });

  it('toggles FAQ items cleanly when clicked', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <OverviewPage />
      </MemoryRouter>,
    );

    const firstQuestion = screen.getByRole('button', {
      name: /Vì sao Giá mục tiêu bắt buộc phải thấp hơn Giá hiện tại\?/i,
    });
    const secondQuestion = screen.getByRole('button', {
      name: /Khi đạt giới hạn 10 sản phẩm theo dõi thì tôi cần làm gì\?/i,
    });

    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(secondQuestion).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(secondQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
    expect(secondQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Mỗi tài khoản theo dõi tối đa 10 sản phẩm cùng lúc/i)).toBeInTheDocument();

    fireEvent.click(secondQuestion);
    expect(secondQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  it('copies the support email and notifies the user', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={['/overview']}>
        <OverviewPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Sao chép email/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('trakora.app@gmail.com'));
    expect(showToast).toHaveBeenCalledWith('success', 'Đã sao chép email hỗ trợ: trakora.app@gmail.com');
  });

  it('navigates from /watchlist to /overview via the Tổng quan button in TopNavigation', async () => {
    render(
      <MemoryRouter initialEntries={['/watchlist']}>
        <TopNavigation />
        <Routes>
          <Route path="/watchlist" element={<div>Trang Danh sách theo dõi</div>} />
          <Route path="/overview" element={<OverviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Trang Danh sách theo dõi')).toBeInTheDocument();

    const overviewLink = screen.getByRole('link', { name: 'Tổng quan' });
    fireEvent.click(overviewLink);

    expect(await screen.findByRole('heading', { name: 'Tổng quan & Hướng dẫn sử dụng' })).toBeInTheDocument();
    expect(overviewLink).toHaveAttribute('aria-current', 'page');
  });
});
