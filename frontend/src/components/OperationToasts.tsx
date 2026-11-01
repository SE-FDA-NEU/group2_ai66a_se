import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CircleCheck, AlertCircle, X } from 'lucide-react';
import { toastStore } from '../utils/toast';
import styles from './NotificationCenter.module.css';

export const OperationToasts = () => {
  const queue = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  const timers = useRef(new Map<number, number>());
  useEffect(() => {
    queue.slice(0, 3).forEach((item) => {
      if (timers.current.has(item.id)) return;
      timers.current.set(item.id, window.setTimeout(() => {
        timers.current.delete(item.id);
        toastStore.dismiss(item.id);
      }, 5000));
    });
    for (const [id, timer] of timers.current) {
      if (!queue.some((item) => item.id === id)) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    }
  }, [queue]);
  useEffect(() => {
    const current = timers.current;
    return () => { current.forEach(clearTimeout); current.clear(); };
  }, []);
  return <>{queue.slice(0, 3).map((item) => (
    <div key={item.id} className={`${styles.toast} ${item.kind === 'error' ? styles.error : ''}`}
      role={item.kind === 'error' ? 'alert' : 'status'}>
      <div className={styles.toastContent}>
        <strong>{item.kind === 'success' ? <CircleCheck size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}{item.title}</strong>
        <span>{item.message}</span>
      </div>
      <button type="button" className={styles.closeBtn} aria-label="Đóng thông báo" onClick={() => toastStore.dismiss(item.id)}><X size={18} /></button>
    </div>
  ))}</>;
};
