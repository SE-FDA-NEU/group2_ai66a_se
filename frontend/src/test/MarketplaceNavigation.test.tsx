import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProductRow } from '../components/ProductRow';
import ProductDetailPage from '../pages/ProductDetailPage';
import { WatchlistProduct } from '../api/watchlistApi';

vi.mock('../api/watchlistApi', () => ({
  getWatchlist: vi.fn(),
  removeProductFromWatchlist: vi.fn(),
}));
vi.mock('../components/PriceHistoryChart', () => ({ PriceHistoryChart: () => null }));

const product: WatchlistProduct = {
  id: 101,
  name: 'Tai nghe mẫu',
  url: 'https://www.amazon.com/dp/B012345678',
  image_url: '',
  marketplace: 'Amazon',
  review_count: 0,
  current_price: 1200000,
  currency: 'VND',
  in_stock: true,
  price_low: 1100000,
  price_high: 1500000,
  buy_when_good: false,
  fake_discount: false,
};

const expectSafeMarketplaceLink = (link: HTMLElement) => {
  expect(link).toHaveAttribute('href', product.url);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
};

describe('marketplace navigation', () => {
  it('provides a marketplace link from a watchlist product row', () => {
    render(
      <MemoryRouter>
        <ProductRow
          id={String(product.id)}
          name={product.name}
          currentPrice={product.current_price}
          currency={product.currency}
          onRemove={vi.fn()}
          originalProduct={product}
        />
      </MemoryRouter>,
    );

    expectSafeMarketplaceLink(screen.getByRole('link', { name: 'Xem trên marketplace' }));
  });

  it('opens the product marketplace URL from the detail page', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/detail/101', state: { product } }]}>
        <Routes>
          <Route path="/detail/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expectSafeMarketplaceLink(screen.getByRole('link', { name: 'Xem trên Amazon' }));
  });
});
