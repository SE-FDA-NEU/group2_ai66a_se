import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    vi.clearAllMocks();
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
    vi.useRealTimers();
  });

  it('N185-UI-01 shows target reached details and links the notification to the marketplace product', async () => {
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

  it('N185-UI-02 shows the warning and price details when the price rises above target', async () => {
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
  const alerts = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1, kind: 'target_price_reached', title: `Alert ${i + 1}`,
    message: 'Price reached', created_at: '2026-10-18T10:00:00Z',
  }));
  const tick = async (ms = 0) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  };

  it('N185-UI-03 acknowledges only rendered slots and gives queued items their full display time', async () => {
    vi.useFakeTimers();
    vi.mocked(getUnseenNotifications).mockResolvedValue(alerts);
    vi.mocked(markNotificationsSeen).mockImplementation(async (ids) => {
      ids.forEach((id) => expect(screen.getByText(`Alert ${id}`)).toBeInTheDocument());
    });
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
    await tick();
    expect(screen.getAllByRole('status')).toHaveLength(3);
    expect(screen.queryByText('Alert 4')).not.toBeInTheDocument();
    expect(markNotificationsSeen).toHaveBeenCalledWith([1, 2, 3]);
    // At 5 seconds the first three expire and queued items get their own timers.
    await tick(5000);
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getByText('Alert 4')).toBeInTheDocument();
    expect(markNotificationsSeen).toHaveBeenLastCalledWith([4, 5]);
    await tick(4999);
    expect(screen.getAllByRole('status')).toHaveLength(2);
    await tick(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await tick(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await tick(5000);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('N185-UI-04 fills a dismissed slot and leaves unshown items unseen across remounts', async () => {
    vi.useFakeTimers();
    const unseen = new Map(alerts.map((item) => [item.id, item]));
    vi.mocked(getUnseenNotifications).mockImplementation(async () => [...unseen.values()]);
    vi.mocked(markNotificationsSeen).mockImplementation(async (ids) => {
      ids.forEach((id) => unseen.delete(id));
    });
    const view = render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
    await tick();
    fireEvent.click(screen.getAllByRole('button', { name: 'Đóng thông báo' })[0]);
    await tick();
    expect(screen.getByText('Alert 4')).toBeInTheDocument();
    expect([...unseen.keys()]).toEqual([5]);
    view.unmount();
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
    await tick();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByText('Alert 5')).toBeInTheDocument();
  });

  it('N185-UI-05 retries failed acknowledgements after dismissal without replaying the toast', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getUnseenNotifications).mockResolvedValue(alerts.slice(0, 1));
    vi.mocked(markNotificationsSeen).mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
    await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    await tick();
    vi.mocked(markNotificationsSeen).mockResolvedValue();
    await tick(5000);
    expect(markNotificationsSeen).toHaveBeenLastCalledWith([1]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    const count = vi.mocked(markNotificationsSeen).mock.calls.length;
    await tick(5000);
    expect(markNotificationsSeen).toHaveBeenCalledTimes(count);
  });

  it.each([2, 3, 4])('N185-UI-10 visible slot boundary with %i notifications', async (count) => {
    vi.useFakeTimers();
    vi.mocked(getUnseenNotifications).mockResolvedValue(alerts.slice(0, count));
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
    await tick();
    expect(screen.getAllByRole('status')).toHaveLength(Math.min(3, count));
    expect(markNotificationsSeen).toHaveBeenCalledWith(Array.from({ length: Math.min(3, count) }, (_, i) => i + 1));
    if (count === 4) expect(screen.queryByText('Alert 4')).not.toBeInTheDocument();
  });

  it('N185-UI-11 does not overlap slow polls or acknowledge data after unmount', async () => {
    vi.useFakeTimers();
    let resolve!: (items: typeof alerts) => void;
    vi.mocked(getUnseenNotifications).mockReturnValue(new Promise((done) => { resolve = done; }));
    const view = render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
    await tick();
    await tick(15000);
    expect(getUnseenNotifications).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => { resolve(alerts); });
    expect(markNotificationsSeen).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

});
