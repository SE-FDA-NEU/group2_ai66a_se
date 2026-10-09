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

const customProduct = (
  id: number,
  name: string,
  current_price: number,
  currency: string = 'VND',
) => ({
  id,
  name,
  url: `https://amazon.com/dp/B0123456${id}`,
  image_url: '',
  marketplace: 'amazon',
  review_count: 0,
  current_price,
  currency,
  in_stock: true,
  price_low: current_price,
  price_high: current_price,
  buy_when_good: false,
  fake_discount: false,
});

describe('WatchlistPage sorting by price (US08 / Issue #49)', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token');
    vi.clearAllMocks();
  });

  it('AC1: sorts products from low to high (70k, 40k, 55k -> 40k, 55k, 70k)', async () => {
    const user = userEvent.setup();
    const products = [
      customProduct(1, 'Đèn ngủ 70k', 70000),
      customProduct(2, 'Đèn ngủ 40k', 40000),
      customProduct(3, 'Đèn ngủ 55k', 55000),
    ];
    vi.mocked(getWatchlist).mockResolvedValue({
      total: 3,
      products,
    });

    render(
      <MemoryRouter>
        <WatchlistPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đèn ngủ 70k')).toBeInTheDocument();

    const sortSelect = screen.getByTestId('sort-select');
    await user.selectOptions(sortSelect, 'price_asc');

    const headings = screen.getAllByRole('heading', { level: 3 });
    const productNames = headings.map((h) => h.textContent);
    expect(productNames).toEqual(['Đèn ngủ 40k', 'Đèn ngủ 55k', 'Đèn ngủ 70k']);
  });

  it('AC2: sorts products from high to low (70k, 40k, 55k -> 70k, 55k, 40k)', async () => {
    const user = userEvent.setup();
    const products = [
      customProduct(1, 'Đèn ngủ 70k', 70000),
      customProduct(2, 'Đèn ngủ 40k', 40000),
      customProduct(3, 'Đèn ngủ 55k', 55000),
    ];
    vi.mocked(getWatchlist).mockResolvedValue({
      total: 3,
      products,
    });

    render(
      <MemoryRouter>
        <WatchlistPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đèn ngủ 70k')).toBeInTheDocument();

    const sortSelect = screen.getByTestId('sort-select');
    await user.selectOptions(sortSelect, 'price_desc');

    const headings = screen.getAllByRole('heading', { level: 3 });
    const productNames = headings.map((h) => h.textContent);
    expect(productNames).toEqual(['Đèn ngủ 70k', 'Đèn ngủ 55k', 'Đèn ngủ 40k']);
  });

  it('AC3: reorders 8 tracked products within 1 second', async () => {
    const user = userEvent.setup();
    const prices = [120000, 30000, 85000, 45000, 99000, 20000, 60000, 150000];
    const products = prices.map((price, idx) =>
      customProduct(idx + 1, `Sản phẩm ${price}`, price),
    );
    vi.mocked(getWatchlist).mockResolvedValue({
      total: 8,
      products,
    });

    render(
      <MemoryRouter>
        <WatchlistPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tổng cộng 8 sản phẩm')).toBeInTheDocument();

    const sortSelect = screen.getByTestId('sort-select');

    const startTime = performance.now();
    await user.selectOptions(sortSelect, 'price_asc');
    const elapsedMs = performance.now() - startTime;

    expect(elapsedMs).toBeLessThan(1000);

    const headings = screen.getAllByRole('heading', { level: 3 });
    const productNames = headings.map((h) => h.textContent);
    expect(productNames).toEqual([
      'Sản phẩm 20000',
      'Sản phẩm 30000',
      'Sản phẩm 45000',
      'Sản phẩm 60000',
      'Sản phẩm 85000',
      'Sản phẩm 99000',
      'Sản phẩm 120000',
      'Sản phẩm 150000',
    ]);
  });

  it('restores original list order when sort is set back to default', async () => {
    const user = userEvent.setup();
    const products = [
      customProduct(1, 'Đèn ngủ 70k', 70000),
      customProduct(2, 'Đèn ngủ 40k', 40000),
      customProduct(3, 'Đèn ngủ 55k', 55000),
    ];
    vi.mocked(getWatchlist).mockResolvedValue({
      total: 3,
      products,
    });

    render(
      <MemoryRouter>
        <WatchlistPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đèn ngủ 70k')).toBeInTheDocument();

    const sortSelect = screen.getByTestId('sort-select');
    await user.selectOptions(sortSelect, 'price_asc');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Đèn ngủ 40k',
      'Đèn ngủ 55k',
      'Đèn ngủ 70k',
    ]);

    await user.selectOptions(sortSelect, 'default');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Đèn ngủ 70k',
      'Đèn ngủ 40k',
      'Đèn ngủ 55k',
    ]);
  });

  it('sorts correctly when combined with search query filtering', async () => {
    const user = userEvent.setup();
    const products = [
      customProduct(1, 'Đèn ngủ 70k', 70000),
      customProduct(2, 'Quạt bàn 40k', 40000),
      customProduct(3, 'Đèn ngủ 55k', 55000),
      customProduct(4, 'Đèn ngủ 90k', 90000),
    ];
    vi.mocked(getWatchlist).mockResolvedValue({
      total: 4,
      products,
    });

    render(
      <MemoryRouter>
        <WatchlistPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đèn ngủ 70k')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Tìm kiếm sản phẩm...');
    await user.type(searchInput, 'Đèn ngủ');

    const sortSelect = screen.getByTestId('sort-select');
    await user.selectOptions(sortSelect, 'price_asc');

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Đèn ngủ 55k',
      'Đèn ngủ 70k',
      'Đèn ngủ 90k',
    ]);
  });
});

