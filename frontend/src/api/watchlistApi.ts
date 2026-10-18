import apiClient from './config';

export interface WatchlistProduct {
  id: number;
  name: string;
  url: string;
  image_url: string;
  marketplace: string;
  brand?: string | null;
  shop_name?: string | null;
  product_rating?: number | null;
  review_count: number;
  current_price: number;
  original_price?: number | null;
  currency: string;
  in_stock: boolean;
  price_low: number;
  price_high: number;
  target_price?: number | null;
  buy_when_good: boolean;
  price_label?: string | null;
  fake_discount: boolean;
  fake_discount_percent?: number | null;
}

export interface WatchlistResponse {
  total: number;
  products: WatchlistProduct[];
}

export interface AddProductPayload {
  url: string;
  target_price?: number | null;
  buy_when_good?: boolean;
}

export interface UserNotification {
  id: number;
  product_id?: number | null;
  kind: 'target_price_set' | 'good_price' | string;
  title: string;
  message: string;
  created_at: string;
}

/**
 * Lấy danh sách sản phẩm theo dõi của user hiện tại
 */
export const getWatchlist = async (): Promise<WatchlistResponse> => {
  const res = await apiClient.get<any, { message: string; data: WatchlistResponse }>('/watchlist');
  return res.data;
};

/**
 * Thêm sản phẩm mới vào danh sách theo dõi
 */
export const addProductToWatchlist = async (payload: AddProductPayload): Promise<WatchlistProduct> => {
  const res = await apiClient.post<any, { message: string; data: WatchlistProduct }>('/watchlist', payload);
  return res.data;
};

/**
 * Xóa sản phẩm khỏi danh sách theo dõi
 */
export const removeProductFromWatchlist = async (productId: number): Promise<void> => {
  await apiClient.delete(`/watchlist/${productId}`);
};

export interface PriceDataPoint {
  price: number | string;
  timestamp: string;
  is_gap: boolean;
}

export interface PriceHistoryResponse {
  min_price: number | string | null;
  max_price: number | string | null;
  tracked_days: number;
  data_points: PriceDataPoint[];
}

/**
 * Lấy lịch sử biến động giá của sản phẩm và khoảng trống gap
 */
export const getPriceHistory = async (
  productId: number,
  days: number = 7,
  gapThresholdMinutes: number = 30
): Promise<PriceHistoryResponse> => {
  const res = await apiClient.get<any, { message: string; data: PriceHistoryResponse }>(
    `/watchlist/${productId}/history`,
    {
      params: {
        days,
        gap_threshold_minutes: gapThresholdMinutes,
      },
    }
  );
  return res.data;
};

