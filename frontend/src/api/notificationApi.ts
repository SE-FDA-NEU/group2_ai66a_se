import apiClient from './config';
import { UserNotification } from './watchlistApi';

export const getNotifications = async (afterId: number): Promise<UserNotification[]> => {
  const response = await apiClient.get('/watchlist/notifications', {
    params: { after_id: afterId },
  });

  // The shared Axios interceptor unwraps response.data. Accept the raw Axios
  // envelope too, so notification delivery survives either client behavior.
  const body = response as {
    notifications?: UserNotification[];
    data?: { notifications?: UserNotification[]; data?: { notifications?: UserNotification[] } };
  };
  const notifications =
    body?.notifications ?? body?.data?.notifications ?? body?.data?.data?.notifications;

  if (!Array.isArray(notifications)) {
    throw new Error('Unexpected notifications API response shape.');
  }
  return notifications;
};

export const getUnseenNotifications = async (): Promise<UserNotification[]> => {
  const response = await apiClient.get('/notifications');

  const body = response as {
    notifications?: UserNotification[];
    data?: { notifications?: UserNotification[]; data?: { notifications?: UserNotification[] } };
  };
  const notifications =
    body?.notifications ?? body?.data?.notifications ?? body?.data?.data?.notifications;

  if (!Array.isArray(notifications)) {
    throw new Error('Unexpected notifications API response shape.');
  }
  return notifications;
};

export const markNotificationsSeen = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  await apiClient.post('/notifications/seen', { ids });
};

export const getNotificationHistory = async (): Promise<UserNotification[]> => {
  const response = await apiClient.get('/notifications/history');
  const body = response as {
    notifications?: UserNotification[];
    data?: { notifications?: UserNotification[]; data?: { notifications?: UserNotification[] } };
  };
  const items = body?.notifications ?? body?.data?.notifications ?? body?.data?.data?.notifications;
  if (!Array.isArray(items)) throw new Error('Không thể đọc lịch sử thông báo.');
  return items;
};

export interface SaleEvent {
  id: number;
  name: string;
  description?: string | null;
  marketplace?: string | null;
  start_at: string;
  end_at?: string | null;
  is_active: boolean;
  created_by?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SaleEventPayload {
  name: string;
  start_at: string;
  end_at?: string | null;
  description?: string | null;
  marketplace?: string | null;
  is_active?: boolean;
}

export const getSaleEvents = async (activeOnly = false): Promise<SaleEvent[]> => {
  const res = await apiClient.get<never, { data: { sales: SaleEvent[] } }>('/admin/sales', {
    params: { active_only: activeOnly },
  });
  return res.data?.sales ?? [];
};

export const createSaleEvent = async (payload: SaleEventPayload): Promise<SaleEvent> => {
  const res = await apiClient.post<never, { data: SaleEvent }>('/admin/sales', payload);
  return res.data;
};

export const updateSaleEvent = async (
  saleId: number,
  payload: Partial<SaleEventPayload>,
): Promise<SaleEvent> => {
  const res = await apiClient.patch<never, { data: SaleEvent }>(`/admin/sales/${saleId}`, payload);
  return res.data;
};

export const deleteSaleEvent = async (saleId: number): Promise<void> => {
  await apiClient.delete(`/admin/sales/${saleId}`);
};

export const triggerSaleAlerts = async (): Promise<number> => {
  const res = await apiClient.post<never, { data: { notified_count: number } }>(
    '/admin/sales/trigger-alerts',
  );
  return res.data?.notified_count ?? 0;
};
