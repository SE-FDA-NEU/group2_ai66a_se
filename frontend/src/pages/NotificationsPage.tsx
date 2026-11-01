import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNotificationHistory, markNotificationsSeen } from '../api/notificationApi';
import { UserNotification } from '../api/watchlistApi';
import { showToast } from '../utils/toast';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const history = await getNotificationHistory();
      if (id !== requestId.current) return;
      setItems(history);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);
  // History entries are acknowledged only after the list is rendered.
  useEffect(() => {
    if (loading || error) return;
    const ids = items.filter((item) => !item.seen_at).map((item) => item.id);
    if (!ids.length) return;
    let active = true;
    void markNotificationsSeen(ids).then(() => {
      if (active) setItems((current) => current.map((item) => ids.includes(item.id)
        ? { ...item, seen_at: new Date().toISOString() } : item));
    }).catch(() => {
      if (active) showToast('error', 'Chưa lưu được trạng thái đã xem. Vui lòng tải lại để thử lại.');
    });
    return () => { active = false; };
  }, [items, loading, error]);
  return <div className={styles.page}>
    <header className={styles.header}>
      <div><h1>Thông báo</h1><p>10 thông báo gần nhất về sản phẩm bạn theo dõi.</p></div>
      <button className={styles.refresh} onClick={() => void load()} disabled={loading}>
        <RotateCw size={16} aria-hidden="true" />{loading ? 'Đang tải…' : 'Tải lại'}
      </button>
    </header>
    <section className={styles.card} aria-label="Lịch sử thông báo" aria-busy={loading}>
      <div className={styles.cardHeader}><h2>Lịch sử thông báo</h2><span>{items.length}/10 thông báo</span></div>
      {loading ? <p className={styles.empty} role="status">Đang tải thông báo…</p>
        : error ? <div className={styles.empty} role="alert"><Bell size={28} /><h3>Chưa tải được thông báo</h3><p>Vui lòng kiểm tra kết nối và chọn Tải lại.</p></div>
        : items.length === 0 ? <div className={styles.empty}><Bell size={32} /><h3>Bạn chưa có thông báo nào</h3><p>Các cập nhật về giá và sản phẩm sẽ xuất hiện tại đây.</p><Link to="/watchlist">Xem danh sách theo dõi</Link></div>
        : <ol className={styles.list}>{items.map((item) => <li key={item.id} className={styles.item}>
          <div className={styles.icon}><Bell size={18} aria-hidden="true" /></div>
          <div className={styles.content}><h3>{item.title}</h3><p>{item.message}</p>
            <div className={styles.meta}><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</time>
              <span>{item.seen_at ? <><Check size={13} aria-hidden="true" />Đã xem</> : 'Mới'}</span>
              {item.product_id != null && <Link to={`/detail/${item.product_id}`}>Xem sản phẩm</Link>}
            </div>
          </div>
        </li>)}</ol>}
    </section>
  </div>;
}
