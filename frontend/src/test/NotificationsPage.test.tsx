import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NotificationsPage from '../pages/NotificationsPage';
import { getNotificationHistory, markNotificationsSeen } from '../api/notificationApi';
vi.mock('../api/notificationApi', () => ({ getNotificationHistory: vi.fn(), markNotificationsSeen: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(markNotificationsSeen).mockResolvedValue(); });
afterEach(cleanup);
it('N185-UI-08 shows history, Vietnamese timestamps and marks only rendered unseen entries', async () => {
  vi.mocked(getNotificationHistory).mockResolvedValue([
    { id: 2, title: 'Giá mục tiêu đã đạt', message: 'Giá đã giảm.', kind: 'target_price_reached', product_id: 101, created_at: '2026-11-01T10:00:00Z', seen_at: null },
    { id: 1, title: 'Đã lưu giá mục tiêu', message: 'Đã lưu.', kind: 'target_price_set', created_at: '2026-10-31T10:00:00Z', seen_at: '2026-10-31T10:00:00Z' },
  ]);
  vi.mocked(markNotificationsSeen).mockImplementation(async (ids) => {
    expect(screen.getByText('Giá mục tiêu đã đạt')).toBeInTheDocument();
    expect(ids).toEqual([2]);
  });
  render(<MemoryRouter><NotificationsPage /></MemoryRouter>);
  expect(await screen.findByText('Giá mục tiêu đã đạt')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Xem sản phẩm' })).toHaveAttribute('href', '/detail/101');
  await waitFor(() => expect(screen.getAllByText('Đã xem')).toHaveLength(2));
});
it('N185-UI-09 supports empty history and retry after an error', async () => {
  vi.mocked(getNotificationHistory).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
  render(<MemoryRouter><NotificationsPage /></MemoryRouter>);
  expect(await screen.findByText('Chưa tải được thông báo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
  expect(await screen.findByText('Bạn chưa có thông báo nào')).toBeInTheDocument();
  expect(markNotificationsSeen).not.toHaveBeenCalled();
});

it('N185-UI-12 retains unread state and reports acknowledgement failure without a request loop', async () => {
  vi.mocked(getNotificationHistory).mockResolvedValue([
    { id: 3, kind: 'good_price', title: 'Giá tốt', message: 'Giá đã giảm', created_at: '2026-01-01T00:00:00Z', seen_at: null },
  ]);
  vi.mocked(markNotificationsSeen).mockRejectedValue(new Error('offline'));
  render(<MemoryRouter><NotificationsPage /></MemoryRouter>);
  expect(await screen.findByText('Giá tốt')).toBeInTheDocument();
  await waitFor(() => expect(markNotificationsSeen).toHaveBeenCalledWith([3]));
  expect(screen.queryByText('Đã xem')).not.toBeInTheDocument();
  expect(screen.getByText('Mới')).toBeInTheDocument();
  expect(markNotificationsSeen).toHaveBeenCalledTimes(1);
});
