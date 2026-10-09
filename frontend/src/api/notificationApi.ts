import apiClient from './config';
import { UserNotification } from './watchlistApi';

export const getNotifications = async (afterId: number): Promise<UserNotification[]> => {
  const response = await apiClient.get<
    any,
    { message: string; data: { notifications: UserNotification[] } }
  >('/watchlist/notifications', { params: { after_id: afterId } });
  return response.data.notifications;
};
