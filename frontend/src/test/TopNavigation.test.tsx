import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopNavigation } from '../components/TopNavigation';
import { getNotificationHistory, getUnseenNotifications, markNotificationsSeen } from '../api/notificationApi';

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

const makeNotifications = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: index + 1,
  kind: 'good_price',
  title: `Thông báo ${index + 1}`,
  message: 'Giá sản phẩm đã giảm.',
  created_at: '2026-11-01T10:00:00Z',
}));

const renderNavigation = (initialPath = '/watchlist') => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <TopNavigation />
  </MemoryRouter>,
);

describe('TopNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.isLoggedIn = true;
    mocks.auth.user = { id: 8, email: 'giaan@example.com', nickname: 'an' };
    vi.mocked(getNotificationHistory).mockResolvedValue([]);
    vi.mocked(getUnseenNotifications).mockResolvedValue([]);
    vi.mocked(markNotificationsSeen).mockResolvedValue();
  });

  afterEach(cleanup);

  it('marks the current watchlist route as the current page', () => {
    renderNavigation();
    expect(screen.getByRole('link', { name: 'Danh sách theo dõi' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Tổng quan' })).not.toHaveAttribute('aria-current', 'page');
  });

  it.each([
    [0, null],
    [1, '1'],
    [9, '9'],
    [10, '9+'],
  ])('shows the correct unread badge for %i notifications', async (count, badge) => {
    vi.mocked(getUnseenNotifications).mockResolvedValue(makeNotifications(count));
    renderNavigation();
    if (badge === null) {
      await waitFor(() => expect(getUnseenNotifications).toHaveBeenCalled());
      expect(screen.queryByText('9+')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument();
    } else {
      expect(await screen.findByRole('button', { name: `Thông báo, ${badge} chưa đọc` })).toBeInTheDocument();
    }
  });

  it('opens the notification menu, supports arrow navigation, and closes on Escape', async () => {
    vi.mocked(getNotificationHistory).mockResolvedValue(makeNotifications(2));
    renderNavigation();
    const trigger = screen.getByRole('button', { name: 'Thông báo' });
    fireEvent.click(trigger);
    const menu = await screen.findByRole('menu', { name: 'Thông báo gần đây' });
    const firstItem = await screen.findByRole('menuitem', { name: /Thông báo 1/ });
    await waitFor(() => expect(firstItem).toHaveFocus());
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: /Thông báo 2/ })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu', { name: 'Thông báo gần đây' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes an open account menu when clicking outside', async () => {
    renderNavigation();
    fireEvent.click(screen.getByRole('button', { name: 'Tài khoản: An' }));
    expect(await screen.findByRole('menu', { name: 'Menu tài khoản' })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('menu', { name: 'Menu tài khoản' })).not.toBeInTheDocument());
  });

  it('shows the full account identity and confirms before logging out', async () => {
    mocks.auth.user = {
      id: 8,
      email: 'a.very.long.email.address.with.more.than.fifty.characters@example.com',
      nickname: 'ân',
    };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderNavigation();
    fireEvent.click(screen.getByRole('button', { name: 'Tài khoản: Ân' }));
    expect(await screen.findByText('a.very.long.email.address.with.more.than.fifty.characters@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));
    expect(confirm).toHaveBeenCalled();
    expect(mocks.auth.logout).not.toHaveBeenCalled();
  });

  it('marks loaded notifications as read when requested', async () => {
    const notifications = makeNotifications(1).map((item) => ({ ...item, seen_at: null }));
    vi.mocked(getNotificationHistory).mockResolvedValue(notifications);
    vi.mocked(getUnseenNotifications).mockResolvedValue(notifications);
    renderNavigation();
    fireEvent.click(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Đánh dấu đã đọc' }));
    await waitFor(() => expect(markNotificationsSeen).toHaveBeenCalledWith([1]));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument());
  });
});
