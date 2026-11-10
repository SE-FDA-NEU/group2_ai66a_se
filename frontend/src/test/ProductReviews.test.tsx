import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductReviews } from '../components/ProductReviews';
import { getProductReviews, WatchlistProduct } from '../api/watchlistApi';

vi.mock('../api/watchlistApi', () => ({ getProductReviews: vi.fn() }));
const product = { id: 7, review_count: 25, product_rating: 4.5, reviews: [], top_reviews: [] } as unknown as WatchlistProduct;
const batch = (offset: number) => Array.from({ length: 10 }, (_, i) => ({ id: offset + i, author: `Buyer ${offset + i}`, rating: 5, text: `Review ${offset + i}` }));
beforeEach(() => { vi.resetAllMocks(); });

it('loads ten reviews, appends ten, and resets when filtering', async () => {
  vi.mocked(getProductReviews).mockResolvedValueOnce({ reviews: batch(0), has_more: true, source: 'live' })
    .mockResolvedValueOnce({ reviews: batch(10), has_more: true, source: 'live' })
    .mockResolvedValueOnce({ reviews: [{ id: 99, text: 'One star review', rating: 1 }], has_more: false, source: 'live' });
  render(<ProductReviews product={product} />);
  await waitFor(() => expect(screen.getAllByTestId('review-card')).toHaveLength(10));
  fireEvent.click(screen.getByText('Xem thêm đánh giá'));
  await waitFor(() => expect(screen.getAllByTestId('review-card')).toHaveLength(20));
  fireEvent.click(screen.getByRole('button', { name: '1 sao' }));
  await screen.findByText('One star review');
  expect(screen.getAllByTestId('review-card')).toHaveLength(1);
  expect(getProductReviews).toHaveBeenLastCalledWith(7, 1, 1);
  expect(screen.queryByText('Xem thêm đánh giá')).not.toBeInTheDocument();
});

it('maps provider fixtures even when an empty reviews array exists', async () => {
  vi.mocked(getProductReviews).mockRejectedValue(new Error('offline'));
  render(<ProductReviews product={{ ...product, top_reviews: [{ review_author: 'Provider buyer', review_comment: 'Real content', review_star_rating: '4' } as unknown as import('../api/watchlistApi').CustomerReview] }} />);
  expect(screen.getByText('Real content')).toBeInTheDocument();
  expect(screen.getByText('Provider buyer')).toBeInTheDocument();
  await screen.findByRole('alert');
});

it('offers retry after failure and distinguishes empty filtered results', async () => {
  vi.mocked(getProductReviews).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ reviews: [], has_more: false, source: 'live' });
  render(<ProductReviews product={product} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
  await screen.findByTestId('empty-reviews');
  fireEvent.click(screen.getByRole('button', { name: '2 sao' }));
  await screen.findByText('Chưa có đánh giá 2 sao cho sản phẩm này.');
});
