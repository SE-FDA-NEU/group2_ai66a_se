import React, { useEffect, useState } from 'react';
import { getNotifications } from '../api/notificationApi';
import { UserNotification } from '../api/watchlistApi';
import styles from './NotificationCenter.module.css';

const STORAGE_KEY = 'trakora:last-notification-id';
const POLL_INTERVAL_MS = 5_000;

export const NotificationCenter: React.FC = () => {
  const [visible, setVisible] = useState<UserNotification[]>([]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const lastSeenId = Number(localStorage.getItem(STORAGE_KEY) || 0);
      try {
        const notifications = await getNotifications(lastSeenId);
        if (!active || notifications.length === 0) return;

        const newestId = notifications[notifications.length - 1].id;
        const newIds = new Set(notifications.map((item) => item.id));
        localStorage.setItem(STORAGE_KEY, String(newestId));
        setVisible((current) => [...current, ...notifications].slice(-3));
        window.setTimeout(() => {
          if (active) {
            setVisible((current) => current.filter((item) => !newIds.has(item.id)));
          }
        }, 8_000);
      } catch {
        // The next poll retries; a temporary notification API failure should not disrupt the page.
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (visible.length === 0) return null;

  return (
    <div className={styles.center} aria-live="polite" aria-label="Thông báo">
      {visible.map((notification) => (
        <div className={styles.toast} key={notification.id} role="status">
          <strong>{notification.title}</strong>
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setVisible((current) => current.filter((item) => item.id !== notification.id))}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
