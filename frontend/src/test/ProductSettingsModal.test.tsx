import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductSettingsModal } from '../components/ProductSettingsModal';
import * as watchlistApi from '../api/watchlistApi';

vi.mock('../api/watchlistApi', () => ({
  updateTargetPrice: vi.fn(),
}));

describe('ProductSettingsModal (US02 - Target Price & Settings)', () => {
  const mockProduct: watchlistApi.WatchlistProduct = {
    id: 101,
    name: 'Test Product',
    current_price: 200000,
    target_price: 180000,
    currency: 'VND',
    image_url: 'https://example.com/img.jpg',
    url: 'https://shopee.vn/product/101',
    marketplace: 'shopee',
    review_count: 5,
    in_stock: true,
    price_low: 150000,
    price_high: 220000,
    buy_when_good: false,
    price_label: 'Normal',
    fake_discount: false,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    product: mockProduct,
    onTargetPriceUpdated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with target price form and notification settings section', () => {
    render(<ProductSettingsModal {...defaultProps} />);

    expect(screen.getByText('Cài đặt sản phẩm & Cảnh báo')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mức giá mục tiêu mới/i)).toBeInTheDocument();
    expect(screen.getByText(/Tùy chọn nhận thông báo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu giá mục tiêu/i })).toBeInTheDocument();
  });

  it('validates BR1 in real-time: target price >= current price shows error message', async () => {
    render(<ProductSettingsModal {...defaultProps} />);

    const input = screen.getByLabelText(/Mức giá mục tiêu mới/i);
    const submitBtn = screen.getByRole('button', { name: /Lưu giá mục tiêu/i });

    // Enter a price equal to current price (200,000)
    fireEvent.change(input, { target: { value: '200000' } });

    expect(
      screen.getByText('Target must be lower than the current price 200.000 ₫')
    ).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Enter a price greater than current price (250,000)
    fireEvent.change(input, { target: { value: '250000' } });

    expect(
      screen.getByText('Target must be lower than the current price 200.000 ₫')
    ).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it('allows saving when target price < current price and calls updateTargetPrice', async () => {
    const updated = {
      ...mockProduct,
      target_price: 150000,
    };
    vi.mocked(watchlistApi.updateTargetPrice).mockResolvedValue(updated);

    render(<ProductSettingsModal {...defaultProps} />);

    const input = screen.getByLabelText(/Mức giá mục tiêu mới/i);
    const submitBtn = screen.getByRole('button', { name: /Lưu giá mục tiêu/i });

    // Valid lower price: 150,000
    fireEvent.change(input, { target: { value: '150000' } });

    expect(
      screen.queryByText(/Target must be lower than the current price/i)
    ).not.toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(watchlistApi.updateTargetPrice).toHaveBeenCalledWith(101, 150000);
      expect(defaultProps.onTargetPriceUpdated).toHaveBeenCalledWith(updated);
    });
  });

  it('displays API error if updateTargetPrice fails', async () => {
    vi.mocked(watchlistApi.updateTargetPrice).mockRejectedValue({
      detail: 'Không thể cập nhật giá mục tiêu vào lúc này.',
    });

    render(<ProductSettingsModal {...defaultProps} />);

    const input = screen.getByLabelText(/Mức giá mục tiêu mới/i);
    fireEvent.change(input, { target: { value: '170000' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu giá mục tiêu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Không thể cập nhật giá mục tiêu vào lúc này.')
      ).toBeInTheDocument();
    });
  });
});

