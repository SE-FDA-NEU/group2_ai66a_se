import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../api/notificationApi';
import { UserNotification } from '../api/watchlistApi';
import { useAuth } from '../context/AuthContext';
import { formatVnd } from '../utils/currency';
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
};

interface NotificationCenterProps {
  mockOnly?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ mockOnly = false }) => {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState<UserNotification[]>([]);

  const storageKey = user?.id ? `trakora_last_seen_notif_${user.id}` : 'trakora_last_seen_notif';
  const getInitialLastSeen = (): number => {
    try {
      const v = localStorage.getItem(storageKey);
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  };

  const lastSeenIdRef = useRef<number>(getInitialLastSeen());
  const isInitialSyncRef = useRef<boolean>(true);
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
          notifications = mockNotification.id > lastSeenIdRef.current ? [mockNotification] : [];
        } else if (!mockOnly) {
          notifications = await getNotifications(lastSeenIdRef.current);
        }

        if (!active || notifications.length === 0) {
          isInitialSyncRef.current = false;
          return;
        }

        const maxId = Math.max(...notifications.map((n) => n.id));
        lastSeenIdRef.current = Math.max(lastSeenIdRef.current, maxId);
        try {
          localStorage.setItem(storageKey, String(lastSeenIdRef.current));
        } catch {
          // Ignore localStorage write error
        }

        // Lần đầu tải trang: Chỉ đồng bộ maxId vào bộ nhớ đệm, KHÔNG pop-up các thông báo cũ từ quá khứ
        if (isInitialSyncRef.current && !mockNotification) {
          isInitialSyncRef.current = false;
          return;
        }
        isInitialSyncRef.current = false;

        // Chỉ hiển thị popup Toast cho các cảnh báo giá thời gian thực, bỏ qua thông báo cấu hình giá mục tiêu
        const actionableAlerts = notifications.filter(
          (n) => n.kind !== 'target_price_set'
        );

        if (actionableAlerts.length === 0) return;

        actionableAlerts.forEach((n) => {
          if (timers.has(n.id)) return;
          const timer = window.setTimeout(() => dismiss(n.id), TOAST_DURATION_MS);
          timers.set(n.id, timer);
        });

        setVisible((current) => [...current, ...actionableAlerts].slice(-MAX_VISIBLE));
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
  }, [dismiss, isLoggedIn, mockOnly, storageKey]);

  if (visible.length === 0) return null;

  return createPortal(
    <div className={styles.center} aria-live="polite" aria-label="Thông báo">
      {visible.map((notification) => (
        <div className={styles.toast} key={notification.id} role="status">
          <strong>{notification.title}</strong>
          <span>{formatNotificationMessage(notification.message)}</span>
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

