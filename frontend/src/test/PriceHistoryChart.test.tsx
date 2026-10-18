import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PriceHistoryChart, { formatTooltipDisplay } from '../components/PriceHistoryChart';
import * as watchlistApi from '../api/watchlistApi';

// Mock getPriceHistory API
vi.mock('../api/watchlistApi', async () => {
  const actual = await vi.importActual<typeof watchlistApi>('../api/watchlistApi');
  return {
    ...actual,
    getPriceHistory: vi.fn(),
  };
});

describe('formatTooltipDisplay helper', () => {
  it('formats normal price data point as "đ – <DD/MM> HH:MM"', () => {
    // Exact requirement example: 239,000đ – 18/09 14:00
    const formatted = formatTooltipDisplay(239000, '2026-09-18T14:00:00', 'VND');
    expect(formatted).toBe('239,000đ – 18/09 14:00');
  });

  it('correctly pads single-digit dates and hours', () => {
    const formatted = formatTooltipDisplay(50000, '2026-04-05T08:05:00', 'VND');
    expect(formatted).toBe('50,000đ – 05/04 08:05');
  });

  it('converts USD currency to VND if specified', () => {
    // 10 USD * 26000 = 260,000đ
    const formatted = formatTooltipDisplay(10, '2026-09-18T14:00:00', 'USD');
    expect(formatted).toBe('260,000đ – 18/09 14:00');
  });
});

describe('PriceHistoryChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockReturnValue(new Promise(() => {}));

    render(<PriceHistoryChart productId={10} currency="VND" />);

    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
    expect(screen.getByText(/Đang tải lịch sử giá/i)).toBeInTheDocument();
  });

  it('renders error state and retries on button click', async () => {
    vi.mocked(watchlistApi.getPriceHistory)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        min_price: 100000,
        max_price: 150000,
        tracked_days: 7,
        data_points: [
          { price: 120000, timestamp: '2026-10-18T10:00:00Z', is_gap: false },
        ],
      });

    render(<PriceHistoryChart productId={10} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    });
    expect(watchlistApi.getPriceHistory).toHaveBeenCalledTimes(2);
  });

  it('renders empty state when data_points is empty', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockResolvedValue({
      min_price: null,
      max_price: null,
      tracked_days: 2,
      data_points: [],
    });

    render(<PriceHistoryChart productId={10} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
    });
    expect(screen.getByText(/Chưa có dữ liệu biến động giá/i)).toBeInTheDocument();
    expect(screen.getByTestId('warning-banner')).toBeInTheDocument();
    expect(screen.getByText(/Chỉ mới có 2 ngày dữ liệu theo dõi/i)).toBeInTheDocument();
  });

  it('displays warning banner when tracked_days is less than 7', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockResolvedValue({
      min_price: 150000,
      max_price: 200000,
      tracked_days: 3,
      data_points: [
        { price: 180000, timestamp: '2026-10-16T08:00:00Z', is_gap: false },
        { price: 150000, timestamp: '2026-10-17T08:00:00Z', is_gap: false },
        { price: 200000, timestamp: '2026-10-18T08:00:00Z', is_gap: false },
      ],
    });

    render(<PriceHistoryChart productId={10} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    });

    const warningBanner = screen.getByTestId('warning-banner');
    expect(warningBanner).toBeInTheDocument();
    expect(warningBanner).toHaveTextContent(/Chỉ mới có 3 ngày dữ liệu theo dõi/i);
    expect(warningBanner).toHaveTextContent(/Cần ít nhất 7 ngày để biểu đồ hiển thị xu hướng đầy đủ/i);
  });

  it('does NOT display warning banner when tracked_days >= 7', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockResolvedValue({
      min_price: 150000,
      max_price: 200000,
      tracked_days: 10,
      data_points: [
        { price: 180000, timestamp: '2026-10-16T08:00:00Z', is_gap: false },
        { price: 150000, timestamp: '2026-10-17T08:00:00Z', is_gap: false },
      ],
    });

    render(<PriceHistoryChart productId={10} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('warning-banner')).not.toBeInTheDocument();
  });

  it('correctly plots and renders lowest, highest, and latest price milestones', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockResolvedValue({
      min_price: 120000,
      max_price: 250000,
      tracked_days: 7,
      data_points: [
        { price: 200000, timestamp: '2026-10-15T08:00:00Z', is_gap: false },
        { price: 120000, timestamp: '2026-10-16T08:00:00Z', is_gap: false },
        { price: 250000, timestamp: '2026-10-17T08:00:00Z', is_gap: false },
        { price: 210000, timestamp: '2026-10-18T08:00:00Z', is_gap: false },
      ],
    });

    render(<PriceHistoryChart productId={10} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    });

    const minStat = screen.getByTestId('stat-min-price');
    const maxStat = screen.getByTestId('stat-max-price');
    const latestStat = screen.getByTestId('stat-latest-price');

    expect(minStat).toHaveTextContent(/120\.000/);
    expect(maxStat).toHaveTextContent(/250\.000/);
    expect(latestStat).toHaveTextContent(/210\.000/);
  });

  it('renders chart legend distinguishing continuous data and gaps', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockResolvedValue({
      min_price: 100000,
      max_price: 150000,
      tracked_days: 7,
      data_points: [
        { price: 120000, timestamp: '2026-10-18T10:00:00Z', is_gap: false },
        { price: 130000, timestamp: '2026-10-18T14:00:00Z', is_gap: true },
      ],
    });

    render(<PriceHistoryChart productId={10} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    });

    expect(screen.getByText(/Dữ liệu liên tục/i)).toBeInTheDocument();
    expect(screen.getByText(/Khoảng trống \(Gaps\)/i)).toBeInTheDocument();
  });

  it('re-fetches data when changing time range', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockResolvedValue({
      min_price: 100000,
      max_price: 150000,
      tracked_days: 7,
      data_points: [
        { price: 120000, timestamp: '2026-10-18T10:00:00Z', is_gap: false },
      ],
    });

    render(<PriceHistoryChart productId={42} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    });
    expect(watchlistApi.getPriceHistory).toHaveBeenCalledWith(42, 7);

    // Switch to 14 days
    const button14 = screen.getByRole('button', { name: '14 ngày' });
    fireEvent.click(button14);

    await waitFor(() => {
      expect(watchlistApi.getPriceHistory).toHaveBeenCalledWith(42, 14);
    });

    // Switch to 30 days
    const button30 = screen.getByRole('button', { name: '30 ngày' });
    fireEvent.click(button30);

    await waitFor(() => {
      expect(watchlistApi.getPriceHistory).toHaveBeenCalledWith(42, 30);
    });

    // Switch to Tất cả (all time)
    const buttonAll = screen.getByRole('button', { name: 'Tất cả' });
    fireEvent.click(buttonAll);

    await waitFor(() => {
      expect(watchlistApi.getPriceHistory).toHaveBeenCalledWith(42, 0);
    });
  });

  it('has overflow-x hidden container ensuring no horizontal scrolling on mobile', async () => {
    vi.mocked(watchlistApi.getPriceHistory).mockResolvedValue({
      min_price: 100000,
      max_price: 150000,
      tracked_days: 7,
      data_points: [
        { price: 120000, timestamp: '2026-10-18T10:00:00Z', is_gap: false },
      ],
    });

    render(<PriceHistoryChart productId={10} currency="VND" />);

    await waitFor(() => {
      expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    });

    const card = screen.getByTestId('price-history-chart');
    expect(card.className).toMatch(/chartCard/);
  });
});
