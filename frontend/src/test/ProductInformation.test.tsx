import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DetailedProduct, getProductDetail } from '../api/watchlistApi';
import { ProductGallery, ProductInformation } from '../components/ProductInformation';
import ProductDetailPage from '../pages/ProductDetailPage';

vi.mock('../api/watchlistApi', () => ({ getProductDetail: vi.fn(), removeProductFromWatchlist: vi.fn() }));
vi.mock('../components/PriceHistoryChart', () => ({ PriceHistoryChart: () => null }));

const product: DetailedProduct = {
  id: 7, name: 'Tai nghe mẫu', image_url: 'https://example.test/main.jpg',
  url: 'https://www.amazon.com/dp/B012345678', marketplace: 'Amazon',
  review_count: 0, current_price: 1200000, currency: 'VND', in_stock: true,
  price_low: 1100000, price_high: 1300000, buy_when_good: false, fake_discount: false,
  details: {
    product_description: '<p>Comfort &amp; sound.</p><p>Second paragraph.</p><script>evil()</script>',
    about_product: ['USB-C', 'Noise cancellation'],
    product_details: { Weight: '250 g' }, product_information: { Material: 'Aluminium' },
    product_photos: ['https://example.test/main.jpg', 'https://example.test/second.jpg', 'javascript:alert(1)'],
    product_variations: { Color: ['Blue', 'Black'] },
    main_buy_box: { seller: 'Sample Store', return_policy: '30 days' },
    important_information: { Safety: 'Keep dry' },
    new_provider_field: { enabled: false, value: 0 }, currency: 'USD',
  },
};
beforeEach(() => { vi.resetAllMocks(); });

it('renders complete details, nested extra fields, and safe text instead of HTML', () => {
  const { container } = render(<ProductInformation detail={product} loading={false} error={null} onRefresh={vi.fn()} />);
  expect(screen.getByText(/Comfort & sound/)).toBeInTheDocument();
  expect(screen.getByText(/Second paragraph/)).toBeInTheDocument();
  expect(screen.getByText('250 g')).toBeInTheDocument();
  expect(screen.getByText('Aluminium')).toBeInTheDocument();
  expect(screen.getByText('30 days')).toBeInTheDocument();
  expect(screen.getByText('Keep dry')).toBeInTheDocument();
  expect(screen.getByText('Không')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(container.querySelector('script')).toBeNull();
  expect(container.textContent).not.toContain('evil()');
});

it('switches gallery images and rejects unsafe URLs', () => {
  render(<ProductGallery product={product} detail={product} />);
  expect(screen.getAllByRole('button')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Xem ảnh 2' }));
  expect(screen.getByAltText(product.name)).toHaveAttribute('src', 'https://example.test/second.jpg');
});

it('shows loading, cache failure, demo disclosure and an actionable empty state', () => {
  const refresh = vi.fn();
  const { rerender } = render(<ProductInformation loading error={null} onRefresh={refresh} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByRole('button')).toBeDisabled();
  rerender(<ProductInformation detail={{ ...product, details_refresh_failed: true, is_demo: true }} loading={false} error={null} onRefresh={refresh} />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByText(/Dữ liệu minh họa/)).toBeInTheDocument();
  expect(screen.getByText('250 g')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(refresh).toHaveBeenCalledOnce();
  rerender(<ProductInformation detail={{ ...product, details: {} }} loading={false} error={null} onRefresh={refresh} />);
  expect(screen.getByText(/Chưa có thông tin chi tiết/)).toBeInTheDocument();
});

function renderPage(preview = true) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/detail/7', state: preview ? { product: { ...product, details: undefined } } : undefined }]}><Routes><Route path="/detail/:id" element={<ProductDetailPage />} /></Routes></MemoryRouter>);
}

it('fetches the detail endpoint despite having navigation preview data', async () => {
  vi.mocked(getProductDetail).mockResolvedValue(product);
  renderPage();
  await screen.findByText('250 g');
  expect(getProductDetail).toHaveBeenCalledWith(7, false);
});

it('loads directly and retries a failed detail request', async () => {
  vi.mocked(getProductDetail).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(product);
  renderPage(false);
  fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
  await screen.findByText('250 g');
  expect(getProductDetail).toHaveBeenLastCalledWith(7, true);
});

it('keeps the displayed details when a manual refresh fails', async () => {
  vi.mocked(getProductDetail).mockResolvedValueOnce(product).mockRejectedValueOnce(new Error('offline'));
  renderPage();
  await screen.findByText('250 g');
  fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.getByText('250 g')).toBeInTheDocument();
});
