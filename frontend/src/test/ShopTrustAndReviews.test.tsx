import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { computeShopTrustLabel } from '../utils/trustLabel';
import { ShopTrustBadge } from '../components/ShopTrustBadge';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ProductRow } from '../components/ProductRow';
import * as watchlistApi from '../api/watchlistApi';

vi.mock('../api/watchlistApi', () => ({
  getWatchlist: vi.fn(),
  removeProductFromWatchlist: vi.fn(),
}));

vi.mock('../components/PriceHistoryChart', () => ({
  PriceHistoryChart: () => <div data-testid="mock-chart">Mock Chart</div>,
}));

describe('US09 & BR10: Shop Trust Labels and Reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BR10 Shop Trust Label Calculation Logic', () => {
    it('returns "Trusted" when shop has 4.8★ and 1,200 ratings (>= 4.7★ and >= 500 ratings)', () => {
      const label = computeShopTrustLabel(4.8, 1200);
      expect(label).toBe('Trusted');
    });

    it('returns "Risky: few ratings" when shop has 4.9★ and 12 ratings (< 50 ratings)', () => {
      const label = computeShopTrustLabel(4.9, 12);
      expect(label).toBe('Risky: few ratings');
    });

    it('returns "Needs caution" when shop has 4.5★ and 800 ratings (all other cases)', () => {
      const label = computeShopTrustLabel(4.5, 800);
      expect(label).toBe('Needs caution');
    });

    it('returns "Risky: few ratings" when rating < 4.3★ even with 1000 ratings', () => {
      const label = computeShopTrustLabel(4.1, 1000);
      expect(label).toBe('Risky: few ratings');
    });

    it('returns "Trusted" exactly at boundaries: 4.7★ and 500 ratings', () => {
      const label = computeShopTrustLabel(4.7, 500);
      expect(label).toBe('Trusted');
    });

    it('returns "Needs caution" at boundary: 4.7★ but 499 ratings', () => {
      const label = computeShopTrustLabel(4.7, 499);
      expect(label).toBe('Needs caution');
    });

    it('respects explicit label override', () => {
      expect(computeShopTrustLabel(undefined, undefined, 'Trusted')).toBe('Trusted');
      expect(computeShopTrustLabel(undefined, undefined, 'Risky: few ratings')).toBe('Risky: few ratings');
      expect(computeShopTrustLabel(undefined, undefined, 'Needs caution')).toBe('Needs caution');
    });
  });

  describe('ShopTrustBadge Component', () => {
    it('renders "Trusted" with appropriate class and icon', () => {
      render(<ShopTrustBadge label="Trusted" />);
      const badge = screen.getByTestId('shop-trust-badge');
      expect(badge).toHaveTextContent('Đáng tin cậy');
      expect(badge).toHaveAttribute('data-trust-status', 'trusted');
    });

    it('renders "Risky: few ratings" with appropriate class and icon', () => {
      render(<ShopTrustBadge label="Risky: few ratings" />);
      const badge = screen.getByTestId('shop-trust-badge');
      expect(badge).toHaveTextContent('Rủi ro: ít đánh giá');
      expect(badge).toHaveAttribute('data-trust-status', 'risky');
    });

    it('renders "Needs caution" with appropriate class and icon', () => {
      render(<ShopTrustBadge label="Needs caution" />);
      const badge = screen.getByTestId('shop-trust-badge');
      expect(badge).toHaveTextContent('Cần thận trọng');
      expect(badge).toHaveAttribute('data-trust-status', 'caution');
    });
  });

  describe('/detail Page UI', () => {
    const baseProduct: watchlistApi.WatchlistProduct = {
      id: 99,
      name: 'Sony WH-1000XM5 Wireless Headphones',
      brand: 'Sony',
      shop_name: 'Official Sony Store',
      url: 'https://example.com/product/99',
      image_url: 'https://example.com/sony.jpg',
      marketplace: 'Shopee',
      current_price: 6500000,
      currency: 'VND',
      in_stock: true,
      price_low: 6000000,
      price_high: 7000000,
      review_count: 1200,
      product_rating: 4.8,
      buy_when_good: false,
      fake_discount: false,
    };

    it('displays shop name, brand, product name and "Trusted" label for 4.8★ and 1,200 ratings', () => {
      const product = {
        ...baseProduct,
        shop_rating: 4.8,
        shop_review_count: 1200,
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/detail/99', state: { product } }]}>
          <Routes>
            <Route path="/detail/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Shop name, brand, product name
      expect(screen.getByTestId('product-brand')).toHaveTextContent('Sony');
      expect(screen.getByTestId('product-name')).toHaveTextContent('Sony WH-1000XM5 Wireless Headphones');
      expect(screen.getByTestId('shop-name')).toHaveTextContent('Official Sony Store');

      // Shop trust label "Trusted"
      const trustBadges = screen.getAllByTestId('shop-trust-badge');
      expect(trustBadges.length).toBeGreaterThanOrEqual(1);
      expect(trustBadges[0]).toHaveTextContent('Đáng tin cậy');
      expect(trustBadges[0]).toHaveAttribute('data-trust-status', 'trusted');
    });

    it('displays "Risky: few ratings" for a shop with 4.9★ and 12 ratings', () => {
      const product = {
        ...baseProduct,
        shop_name: 'New Shop',
        shop_rating: 4.9,
        shop_review_count: 12,
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/detail/99', state: { product } }]}>
          <Routes>
            <Route path="/detail/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      const trustBadges = screen.getAllByTestId('shop-trust-badge');
      expect(trustBadges[0]).toHaveTextContent('Rủi ro: ít đánh giá');
      expect(trustBadges[0]).toHaveAttribute('data-trust-status', 'risky');
    });

    it('displays "Needs caution" for a shop with 4.5★ and 800 ratings', () => {
      const product = {
        ...baseProduct,
        shop_name: 'Regular Shop',
        shop_rating: 4.5,
        shop_review_count: 800,
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/detail/99', state: { product } }]}>
          <Routes>
            <Route path="/detail/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      const trustBadges = screen.getAllByTestId('shop-trust-badge');
      expect(trustBadges[0]).toHaveTextContent('Cần thận trọng');
      expect(trustBadges[0]).toHaveAttribute('data-trust-status', 'caution');
    });

    it('displays product average rating and total number of ratings', () => {
      const product = {
        ...baseProduct,
        product_rating: 4.8,
        review_count: 1200,
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/detail/99', state: { product } }]}>
          <Routes>
            <Route path="/detail/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('product-avg-rating')).toHaveTextContent('4.8');
      expect(screen.getByTestId('product-total-ratings')).toHaveTextContent('1,200 đánh giá');
      expect(screen.getByTestId('reviews-average-rating')).toHaveTextContent('4.8');
      expect(screen.getByTestId('reviews-total-ratings')).toHaveTextContent('1,200 lượt đánh giá');
    });

    it('renders the list of 5 most recent customer reviews and limits to 5', () => {
      const sampleReviews = [
        { id: 1, author: 'Alice', rating: 5, title: 'Amazing audio', comment: 'Best noise cancellation ever!' },
        { id: 2, author: 'Bob', rating: 4, title: 'Good value', comment: 'Comfortable to wear all day.' },
        { id: 3, author: 'Charlie', rating: 5, title: 'High quality', comment: 'Sound is crisp and clear.' },
        { id: 4, author: 'Dave', rating: 4, title: 'Battery lasts long', comment: 'Lasts more than 30 hours.' },
        { id: 5, author: 'Eve', rating: 5, title: 'Perfect purchase', comment: 'Worth every penny.' },
        { id: 6, author: 'Frank', rating: 3, title: '6th review', comment: 'Should not appear in the top 5.' },
      ];

      const product = {
        ...baseProduct,
        reviews: sampleReviews,
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/detail/99', state: { product } }]}>
          <Routes>
            <Route path="/detail/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      const reviewCards = screen.getAllByTestId('review-card');
      expect(reviewCards).toHaveLength(5);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Amazing audio')).toBeInTheDocument();
      expect(screen.getByText('Best noise cancellation ever!')).toBeInTheDocument();

      expect(screen.getByText('Eve')).toBeInTheDocument();
      expect(screen.getByText('Perfect purchase')).toBeInTheDocument();

      // The 6th review should not be rendered
      expect(screen.queryByText('Frank')).not.toBeInTheDocument();
      expect(screen.queryByText('6th review')).not.toBeInTheDocument();
    });

    it('renders empty message when no customer reviews are available', () => {
      const product = {
        ...baseProduct,
        reviews: [],
        top_reviews: [],
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/detail/99', state: { product } }]}>
          <Routes>
            <Route path="/detail/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('empty-reviews')).toHaveTextContent('Chưa có đánh giá nào từ khách hàng');
    });
  });

  describe('/watchlist Page UI (ProductRow)', () => {
    it('displays shop trust label "Trusted" on tracked product row for a trusted shop', () => {
      const onRemove = vi.fn();
      render(
        <MemoryRouter>
          <ProductRow
            id="1"
            name="Trusted Wireless Mouse"
            currentPrice={450000}
            currency="VND"
            shopName="Logitech Store"
            shopTrustLabel="Trusted"
            onRemove={onRemove}
          />
        </MemoryRouter>
      );

      const trustBadges = screen.getAllByTestId('shop-trust-badge');
      expect(trustBadges.length).toBeGreaterThanOrEqual(1);
      expect(trustBadges[0]).toHaveTextContent('Đáng tin cậy');
      expect(trustBadges[0]).toHaveAttribute('data-trust-status', 'trusted');
    });

    it('computes and displays "Risky: few ratings" from shop rating and review count on product row', () => {
      const onRemove = vi.fn();
      render(
        <MemoryRouter>
          <ProductRow
            id="2"
            name="Cheap Keyboard"
            currentPrice={150000}
            currency="VND"
            shopName="Newbie Tech"
            shopRating={4.9}
            shopReviewCount={12}
            onRemove={onRemove}
          />
        </MemoryRouter>
      );

      const trustBadges = screen.getAllByTestId('shop-trust-badge');
      expect(trustBadges.length).toBeGreaterThanOrEqual(1);
      expect(trustBadges[0]).toHaveTextContent('Rủi ro: ít đánh giá');
      expect(trustBadges[0]).toHaveAttribute('data-trust-status', 'risky');
    });
  });
});
