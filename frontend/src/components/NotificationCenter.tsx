import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getNotifications } from '../api/notificationApi';
import { UserNotification } from '../api/watchlistApi';
import styles from './NotificationCenter.module.css';

const POLL_INTERVAL_MS = 5_000;
const TOAST_DURATION_MS = 5_000;
const MAX_VISIBLE = 3;

export const NotificationCenter: React.FC = () => {
  const [visible, setVisible] = useState<UserNotification[]>([]);
  const lastSeenIdRef = useRef(0);
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
      try {
        const notifications = await getNotifications(lastSeenIdRef.current);
        if (!active || notifications.length === 0) return;

        lastSeenIdRef.current = Math.max(
          lastSeenIdRef.current,
          ...notifications.map((n) => n.id),
        );

        notifications.forEach((n) => {
          if (timers.has(n.id)) return;
          const timer = window.setTimeout(() => dismiss(n.id), TOAST_DURATION_MS);
          timers.set(n.id, timer);
        });

        setVisible((current) => [...current, ...notifications].slice(-MAX_VISIBLE));
      } catch (error) {
        console.error('Could not load notifications:', error);
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
  }, [dismiss]);

  if (visible.length === 0) return null;

  return createPortal(
    <div className={styles.center} aria-live="polite" aria-label="Thông báo">
      {visible.map((notification) => (
        <div className={styles.toast} key={notification.id} role="status">
          <strong>{notification.title}</strong>
          <span>{notification.message}</span>
          <button
            type="button"
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