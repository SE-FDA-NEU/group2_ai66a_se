import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNotifications } from '../api/notificationApi';
import { NotificationCenter } from './NotificationCenter';

vi.mock('../api/notificationApi', () => ({
  getNotifications: vi.fn(),
}));

describe('NotificationCenter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getNotifications).mockReset();
  });

  it('shows a notification returned by the backend and advances its cursor', async () => {
    vi.mocked(getNotifications).mockResolvedValue([
      {
        id: 12,
        product_id: 31,
        kind: 'good_price',
        title: 'Sản phẩm đang có giá tốt',
        message: 'Tai nghe hiện có giá tốt.',
        created_at: '2026-10-10T10:00:00Z',
      },
    ]);

    render(<NotificationCenter />);

    expect(await screen.findByText('Sản phẩm đang có giá tốt')).toBeInTheDocument();
    expect(screen.getByText('Tai nghe hiện có giá tốt.')).toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledWith(0);
    expect(localStorage.getItem('trakora:last-notification-id')).toBe('12');
  });
});
