import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getWatchlist, addProductToWatchlist } from '../api/watchlistApi';
import { WatchlistPage } from './WatchlistPage';

vi.mock('../api/watchlistApi', () => ({
  getWatchlist: vi.fn(),
  addProductToWatchlist: vi.fn(),
  removeProductFromWatchlist: vi.fn(),
}));

const product = (id: number) => ({
  id,
  name: `Product ${id}`,
  url: `https://amazon.com/dp/B0123456${id}`,
  image_url: '',
  marketplace: 'amazon',
  review_count: 0,
  current_price: 100,
  currency: 'USD',
  in_stock: true,
  price_low: 100,
  price_high: 100,
  buy_when_good: false,
  fake_discount: false,
});

function renderWatchlist(count: number) {
  vi.mocked(getWatchlist).mockResolvedValue({
    total: count,
    products: Array.from({ length: count }, (_, index) => product(index + 1)),
  });
  return render(
    <MemoryRouter>
      <WatchlistPage />
    </MemoryRouter>,
  );
}

describe('WatchlistPage product tracking', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token');
    vi.clearAllMocks();
  });

  it('disables the add button when ten products are already tracked', async () => {
    renderWatchlist(10);

    expect(await screen.findByText('Tổng cộng 10 sản phẩm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm sản phẩm/ })).toBeDisabled();
  });

  it('keeps the add button enabled below the backend limit', async () => {
    renderWatchlist(9);

    await screen.findByText('Tổng cộng 9 sản phẩm');
    expect(screen.getByRole('button', { name: /Thêm sản phẩm/ })).toBeEnabled();
  });

  it('shows backend validation errors in the add modal', async () => {
    const user = userEvent.setup();
    vi.mocked(addProductToWatchlist).mockRejectedValue({
      message: 'You can track at most 10 products.',
    });
    renderWatchlist(9);

    await user.click(await screen.findByRole('button', { name: /Thêm sản phẩm/ }));
    await user.type(
      screen.getByPlaceholderText('https://www.amazon.com/dp/...'),
      'https://www.amazon.com/dp/B012345678',
    );
    await user.click(screen.getByRole('button', { name: 'Thêm vào danh sách' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You can track at most 10 products.',
    );
    expect(addProductToWatchlist).toHaveBeenCalledWith({
      url: 'https://www.amazon.com/dp/B012345678',
      target_price: null,
      buy_when_good: false,
    });
    expect(screen.getByRole('heading', { name: 'Thêm sản phẩm cần theo dõi' })).toBeInTheDocument();
  });
});
