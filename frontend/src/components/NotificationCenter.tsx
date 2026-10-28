import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getUnseenNotifications, markNotificationsSeen } from '../api/notificationApi';
import { getWatchlist, UserNotification } from '../api/watchlistApi';
import { useAuth } from '../context/AuthContext';
import { formatVnd } from '../utils/currency';
import { getSafeMarketplaceUrl } from '../utils/marketplace';
import styles from './NotificationCenter.module.css';

export const formatNotificationMessage = (msg: string): string => {
  if (!msg) return '';
  if (msg.includes('₫') || msg.includes('đ')) {
    return msg;
  }
  return msg.replace(/(\d+(?:\.\d+)?)\s*USD\b/gi, (match, numStr) => {
    const val = parseFloat(numStr);
    if (!Number.isFinite(val)) return match;
    const vndFormatted = formatVnd(val, 'USD');
    return `${vndFormatted} (${val.toFixed(2)} USD)`;
  });
};

const POLL_INTERVAL_MS = 5_000;
const TOAST_DURATION_MS = 6_000;
const MAX_VISIBLE = 3;
type VisibleNotification = UserNotification & { productUrl?: string };

const MOCK_NOTIFICATIONS: Record<string, UserNotification> = {
  target_price_set: {
    id: 1,
    product_id: 101,
    kind: 'target_price_set',
    title: 'Đã đặt giá mục tiêu',
    message: 'Notification mẫu: giá mục tiêu cho sản phẩm đã được lưu.',
    created_at: new Date().toISOString(),
  },
  good_price: {
    id: 1,
    product_id: 101,
    kind: 'good_price',
    title: 'Giá tốt rồi!',
    message: 'Notification mẫu: sản phẩm hiện có mức giá tốt để mua.',
    created_at: new Date().toISOString(),
  },
  target_price_reached: {
    id: 1,
    product_id: 101,
    kind: 'target_price_reached',
    title: 'Giá mục tiêu đã đạt',
    message: 'Sản phẩm Tai nghe mẫu hiện có giá 1.200.000 VND, đã chạm mức giá mục tiêu 1.500.000 VND của bạn.',
    created_at: new Date().toISOString(),
  },
  price_above_target: {
    id: 1,
    product_id: 101,
    kind: 'price_above_target',
    title: 'Giá đã tăng trên mục tiêu',
    message: 'Sản phẩm Tai nghe mẫu hiện có giá 1.600.000 VND, đã vượt trên mức giá mục tiêu 1.500.000 VND của bạn.',
    created_at: new Date().toISOString(),
  },
};

interface NotificationCenterProps {
  mockOnly?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ mockOnly = false }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState<VisibleNotification[]>([]);

  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setVisible((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    let active = true;
    const timers = timersRef.current;

    const poll = async () => {
      // Chỉ poll nếu người dùng đã đăng nhập hoặc đang test mock
      if (!isLoggedIn && !mockOnly && !new URLSearchParams(window.location.search).has('mockNotification')) {
        return;
      }

      try {
        const mockKind = (mockOnly || import.meta.env.DEV)
          ? new URLSearchParams(window.location.search).get('mockNotification')
          : null;
        const mockNotification = mockKind ? MOCK_NOTIFICATIONS[mockKind] : undefined;

        let notifications: UserNotification[] = [];
        if (mockNotification) {
          notifications = [mockNotification];
        } else if (!mockOnly) {
          notifications = await getUnseenNotifications();
        }

        if (!active || notifications.length === 0) return;

        // Server-side seen: mark everything unseen as seen so reload/reopen
        // never floods the user with the same toasts again.
        if (!mockNotification && !mockOnly && notifications.length > 0) {
          try {
            await markNotificationsSeen(notifications.map((n) => n.id));
          } catch (error) {
            console.error('Could not mark notifications as seen:', error);
          }
        }
        if (!active) return;

        // Chỉ hiển thị popup Toast cho các cảnh báo giá thời gian thực, bỏ qua thông báo cấu hình giá mục tiêu
        const actionableAlerts = notifications.filter(
          (n) => n.kind !== 'target_price_set'
        );

        if (actionableAlerts.length === 0) return;

        let productUrls = new Map<number, string>();
        if (!mockOnly && actionableAlerts.some((item) => item.product_id != null)) {
          try {
            const watchlist = await getWatchlist();
            productUrls = new Map(
              watchlist.products.map((product) => [
                product.id,
                getSafeMarketplaceUrl(product.url),
              ]).filter((entry): entry is [number, string] => Boolean(entry[1])),
            );
          } catch (error) {
            // Keep the notification visible even when its marketplace URL cannot be resolved.
            console.error('Could not resolve notification product links:', error);
          }
        }
        if (!active) return;

        const notificationsWithLinks: VisibleNotification[] = actionableAlerts.map((item) => ({
          ...item,
          productUrl: item.product_id == null ? undefined : productUrls.get(item.product_id),
        }));

        notificationsWithLinks.forEach((n) => {
          if (timers.has(n.id)) return;
          const timer = window.setTimeout(() => dismiss(n.id), TOAST_DURATION_MS);
          timers.set(n.id, timer);
        });

        setVisible((current) => [...current, ...notificationsWithLinks].slice(-MAX_VISIBLE));
      } catch (error) {
        if (isLoggedIn) {
          console.error('Could not load notifications:', error);
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [dismiss, isLoggedIn, mockOnly]);

  if (visible.length === 0) return null;

  return createPortal(
    <div className={styles.center} aria-live="polite" aria-label="Thông báo">
      {visible.map((notification) => (
        <div className={styles.toast} key={notification.id} role="status">
          {notification.productUrl ? (
            <a
              className={styles.toastLink}
              href={notification.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${notification.title}. Mở sản phẩm trên marketplace trong tab mới`}
            >
              <strong>{notification.title}</strong>
              <span>{formatNotificationMessage(notification.message)}</span>
            </a>
          ) : (
            <div className={styles.toastContent}>
              <strong>{notification.title}</strong>
              <span>{formatNotificationMessage(notification.message)}</span>
            </div>
          )}
          {notification.product_id && (
            <button
              type="button"
              className={styles.viewLink}
              onClick={() => {
                dismiss(notification.id);
                navigate(`/detail/${notification.product_id}`);
              }}
            >
              Xem chi tiết sản phẩm →
            </button>
          )}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => dismiss(notification.id)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
};
