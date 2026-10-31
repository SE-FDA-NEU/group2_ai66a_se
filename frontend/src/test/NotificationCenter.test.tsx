import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationCenter } from '../components/NotificationCenter';
import { getUnseenNotifications, markNotificationsSeen } from '../api/notificationApi';
import { getWatchlist } from '../api/watchlistApi';

vi.mock('../api/notificationApi', () => ({
  getUnseenNotifications: vi.fn(),
  markNotificationsSeen: vi.fn(),
}));
vi.mock('../api/watchlistApi', () => ({ getWatchlist: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isLoggedIn: true }) }));

const productUrl = 'https://www.amazon.com/dp/B012345678';

describe('NotificationCenter target price notifications', () => {
  beforeEach(() => {
    vi.mocked(getUnseenNotifications).mockResolvedValue([]);
    vi.mocked(markNotificationsSeen).mockResolvedValue();
    vi.mocked(getWatchlist).mockResolvedValue({
      total: 1,
      products: [{ id: 101, url: productUrl } as never],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows target reached details and links the notification to the marketplace product', async () => {
    vi.mocked(getUnseenNotifications).mockResolvedValue([{
      id: 7,
      product_id: 101,
      kind: 'target_price_reached',
      title: 'Giá mục tiêu đã đạt',
      message: 'Tai nghe mẫu hiện có giá 1.200.000 VND, đã chạm mức giá mục tiêu 1.500.000 VND.',
      created_at: '2026-10-18T10:00:00Z',
    }]);

    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: /Giá mục tiêu đã đạt/i });
    expect(link).toHaveAttribute('href', productUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('1.200.000 VND');
    expect(link).toHaveTextContent('1.500.000 VND');
    expect(markNotificationsSeen).toHaveBeenCalledWith([7]);

    fireEvent.click(link);
    expect(link).toHaveAttribute('href', productUrl);
  });

  it('shows the warning and price details when the price rises above target', async () => {
    vi.mocked(getUnseenNotifications).mockResolvedValue([{
      id: 8,
      product_id: 101,
      kind: 'price_above_target',
      title: 'Giá đã tăng trên mục tiêu',
      message: 'Tai nghe mẫu hiện có giá 1.600.000 VND, đã vượt trên mức giá mục tiêu 1.500.000 VND.',
      created_at: '2026-10-18T10:05:00Z',
    }]);

    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: /Giá đã tăng trên mục tiêu/i });
    expect(link).toHaveTextContent('1.600.000 VND');
    expect(link).toHaveTextContent('1.500.000 VND');
    expect(link).toHaveAttribute('href', productUrl);
  });
});
