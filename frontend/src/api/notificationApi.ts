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
