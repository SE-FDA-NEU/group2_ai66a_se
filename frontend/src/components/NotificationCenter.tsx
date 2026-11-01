import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getUnseenNotifications, markNotificationsSeen } from '../api/notificationApi';
import { getWatchlist, UserNotification } from '../api/watchlistApi';
import { useAuth } from '../context/AuthContext';
import { formatVnd } from '../utils/currency';
import { getSafeMarketplaceUrl } from '../utils/marketplace';
import styles from './NotificationCenter.module.css';
import { OperationToasts } from './OperationToasts';

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
const TOAST_DURATION_MS = 5_000;
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

const NotificationDelivery: React.FC<NotificationCenterProps> = ({ mockOnly = false }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<VisibleNotification[]>([]);
  const visible = queue.slice(0, MAX_VISIBLE);
  const knownIds = useRef(new Set<number>());
  const pendingSeen = useRef(new Set<number>());
  const seenRequestRunning = useRef(false);
  const mockKind = (mockOnly || import.meta.env.DEV)
    ? new URLSearchParams(window.location.search).get('mockNotification')
    : null;
  const mockNotification = mockKind ? MOCK_NOTIFICATIONS[mockKind] : undefined;

  const flushSeen = useCallback(async () => {
    if (mockOnly || mockNotification || seenRequestRunning.current || pendingSeen.current.size === 0) return;
    const ids = [...pendingSeen.current];
    seenRequestRunning.current = true;
    try {
      await markNotificationsSeen(ids);
      ids.forEach((id) => pendingSeen.current.delete(id));
    } catch (error) {
      // Retain failed acknowledgements for the next poll, even after dismissal.
      console.error('Could not mark notifications as seen:', error);
    } finally {
      seenRequestRunning.current = false;
    }
  }, [mockOnly, mockNotification]);

  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    let active = true;
    let polling = false;

    const poll = async () => {
      // Chỉ poll nếu người dùng đã đăng nhập hoặc đang test mock
      if (!isLoggedIn && !mockOnly && !new URLSearchParams(window.location.search).has('mockNotification')) {
        return;
      }

      if (polling) return;
      polling = true;
      try {
        await flushSeen();
        if (!active) return;
        let notifications: UserNotification[] = [];
        if (mockNotification) {
          notifications = [mockNotification];
        } else if (!mockOnly) {
          notifications = await getUnseenNotifications();
        }

        if (!active || notifications.length === 0) return;

        // Keep configuration confirmations out of price-alert toasts.
        const actionableAlerts = notifications.filter(
          (n) => n.kind !== 'target_price_set' && !knownIds.current.has(n.id)
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

        const newItems = notificationsWithLinks.filter((item) => {
          if (knownIds.current.has(item.id)) return false;
          knownIds.current.add(item.id);
          return true;
        });
        setQueue((current) => [...current, ...newItems]);
      } catch (error) {
        if (isLoggedIn) {
          console.error('Could not load notifications:', error);
        }
      } finally {
        polling = false;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isLoggedIn, mockOnly, mockNotification, flushSeen]);

  useEffect(() => {
    // Effects run after the toast DOM has been committed. Queued items are
    // acknowledged and timed only when they enter the visible slots.
    visible.forEach((item) => {
      if (timersRef.current.has(item.id)) return;
      pendingSeen.current.add(item.id);
      timersRef.current.set(item.id, window.setTimeout(() => dismiss(item.id), TOAST_DURATION_MS));
    });
    void flushSeen();
  }, [queue, dismiss, flushSeen]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  if (visible.length === 0) return null;

  return (
    <>
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
    </>
  );
};

// Reset queued items and local deduplication when the authenticated session changes.
export const NotificationCenter: React.FC<NotificationCenterProps> = (props) => {
  const { token, isLoggedIn } = useAuth();
  return createPortal(
    <div className={styles.center} aria-label="Thông báo">
      <OperationToasts />
      <NotificationDelivery key={`${isLoggedIn}:${token ?? ''}`} {...props} />
    </div>, document.body,
  );
};
