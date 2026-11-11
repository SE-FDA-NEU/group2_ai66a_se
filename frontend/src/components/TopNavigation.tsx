import { InlinePending } from './LoadingState';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getNotificationHistory, getUnseenNotifications, markNotificationsSeen } from '../api/notificationApi';
import { UserNotification } from '../api/watchlistApi';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import styles from './TopNavigation.module.css';

const primaryNavigation = [
  { label: 'Tổng quan', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Danh sách theo dõi', to: '/watchlist', icon: Bookmark, end: true },
];

type OpenMenu = 'notifications' | 'user' | null;

const getDisplayName = (nickname?: string | null, email?: string | null): string => {
  const name = nickname?.trim() || email?.split('@')[0]?.trim() || '';
  if (!name) return 'Người dùng';
  const [firstCharacter = '', ...rest] = Array.from(name);
  return `${firstCharacter.toLocaleUpperCase('vi-VN')}${rest.join('')}`;
};

const getInitial = (name: string): string => Array.from(name.trim())[0]?.toLocaleUpperCase('vi-VN') ?? '?';

const getAvatarColor = (identity: string): string => {
  let hash = 0;
  for (const character of identity) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return `hsl(${hash % 360} 48% 88%)`;
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

export const TopNavigation: React.FC = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadIds, setUnreadIds] = useState<number[]>([]);
  const [notificationError, setNotificationError] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const drawerButtonRef = useRef<HTMLButtonElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const previousPathname = useRef(location.pathname);

  const displayName = getDisplayName(user?.nickname, user?.email);
  const email = user?.email || '';
  const avatarColor = getAvatarColor(String(user?.id ?? displayName));

  const loadNotifications = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoadingNotifications(true);
    setNotificationError(false);
    try {
      const [history, unseen] = await Promise.all([
        getNotificationHistory(),
        getUnseenNotifications(),
      ]);
      if (id !== requestId.current) return;
      setNotifications(history.slice(0, 10));
      setUnreadIds(unseen.map((item) => item.id));
    } catch (error) {
      if (id !== requestId.current) return;
      console.error('Could not load notification menu:', error);
      setNotificationError(true);
    } finally {
      if (id === requestId.current) setIsLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) void loadNotifications();
    return () => { requestId.current++; };
  }, [isLoggedIn, loadNotifications]);

  useEffect(() => {
    if (!isLoggedIn || openMenu !== 'notifications') return;
    void loadNotifications();
  }, [isLoggedIn, openMenu, loadNotifications]);

  useEffect(() => {
    if (!openMenu) return;
    const menuRef = openMenu === 'notifications' ? notificationMenuRef : userMenuRef;
    const triggerRef = openMenu === 'notifications' ? notificationButtonRef : userButtonRef;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('.notificationItem, .accountMenuItem')
      ?? menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)');
    firstItem?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpenMenu(null);
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenMenu(null);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu, isLoadingNotifications, notifications.length]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const drawer = drawerRef.current;
    const focusable = () => drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    focusable()?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsDrawerOpen(false);
        drawerButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  useEffect(() => {
    if (previousPathname.current === location.pathname) return;
    previousPathname.current = location.pathname;
    setOpenMenu(null);
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1 + items.length) % items.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex !== undefined && items.length) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  };

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => current === menu ? null : menu);
  };

  const handleMarkRead = async () => {
    if (!unreadIds.length || isMarkingRead) return;
    setIsMarkingRead(true);
    try {
      await markNotificationsSeen(unreadIds);
      const seenAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => unreadIds.includes(item.id)
        ? { ...item, seen_at: seenAt }
        : item));
      setUnreadIds([]);
    } catch (error) {
      console.error('Could not mark notifications as read:', error);
      showToast('error', 'Chưa thể đánh dấu thông báo đã đọc. Vui lòng thử lại.');
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất không?')) return;
    setOpenMenu(null);
    logout();
    showToast('success', 'Đã đăng xuất tài khoản.');
    navigate('/login');
  };

  const activeTab = (path: string) => path === '/' ? location.pathname === '/' : location.pathname === path;

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <button
          ref={drawerButtonRef}
          type="button"
          className={styles.mobileMenuButton}
          aria-label="Mở menu điều hướng"
          aria-expanded={isDrawerOpen}
          aria-controls="primary-navigation-drawer"
          onClick={() => setIsDrawerOpen(true)}
        >
          <Menu size={21} aria-hidden="true" />
        </button>

        <Link className={styles.brand} to="/watchlist" aria-label="Trakora - Danh sách theo dõi">
          <span className={styles.logoMark} aria-hidden="true">T</span>
          <span>Trakora</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Điều hướng chính">
          {primaryNavigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              aria-current={activeTab(to) ? 'page' : undefined}
              className={({ isActive }) => `${styles.navLink} ${isActive && activeTab(to) ? styles.active : ''}`}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <div className={styles.actionWrap}>
            <button
              ref={notificationButtonRef}
              type="button"
              className={styles.iconButton}
              aria-label={unreadIds.length
                ? `Thông báo, ${unreadIds.length > 9 ? '9+' : unreadIds.length} chưa đọc`
                : 'Thông báo'}
              aria-expanded={openMenu === 'notifications'}
              aria-haspopup="menu"
              onClick={() => toggleMenu('notifications')}
            >
              <Bell size={20} aria-hidden="true" />
              {unreadIds.length > 0 && (
                <span className={styles.badge} aria-hidden="true">
                  {unreadIds.length > 9 ? '9+' : unreadIds.length}
                </span>
              )}
            </button>
            {openMenu === 'notifications' && (
              <div
                ref={notificationMenuRef}
                className={`${styles.dropdown} ${styles.notificationDropdown}`}
                role="menu"
                aria-label="Thông báo gần đây"
                onKeyDown={handleMenuKeyDown}
              >
                <div className={styles.dropdownHeading}>
                  <h2>Thông báo</h2>
                  {unreadIds.length > 0 && <span>{unreadIds.length > 9 ? '9+' : unreadIds.length} chưa đọc</span>}
                </div>
                {isLoadingNotifications && notifications.length > 0 && <div className={styles.menuMessage}><InlinePending message="Đang cập nhật thông báo…" /></div>}
                {notificationError && notifications.length > 0 && <p role="alert">Không thể cập nhật thông báo. <button type="button" onClick={() => void loadNotifications()}>Thử lại</button></p>}
                {isLoadingNotifications && notifications.length === 0 ? (
                  <div className={styles.menuMessage}><InlinePending message="Đang tải thông báo…" /></div>
                ) : notificationError && notifications.length === 0 ? (
                  <div className={styles.menuMessage} role="alert">
                    <span>Chưa tải được thông báo.</span>
                    <button type="button" role="menuitem" className={styles.retryButton} onClick={() => void loadNotifications()}>
                      Thử lại
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className={styles.menuMessage}>Bạn chưa có thông báo nào.</p>
                ) : (
                  <ul className={styles.notificationList}>
                    {notifications.map((item) => (
                      <li key={item.id}>
                        <Link
                          role="menuitem"
                          tabIndex={-1}
                          className={`${styles.notificationItem} ${!item.seen_at ? styles.unread : ''}`}
                          aria-label={`${item.title} - ${item.seen_at ? 'Đã đọc' : 'Chưa đọc'}`}
                          to={item.product_id == null ? '/notifications' : `/detail/${item.product_id}`}
                        >
                          <span className={styles.notificationTitle}>
                            {!item.seen_at && <span className={styles.unreadDot} aria-hidden="true" />}
                            {item.title}
                          </span>
                          <span className={styles.notificationMessage}>{item.message}</span>
                          <time dateTime={item.created_at}>{formatTimestamp(item.created_at)}</time>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.dropdownFooter}>
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className={styles.menuAction}
                    disabled={unreadIds.length === 0 || isMarkingRead}
                    onClick={() => void handleMarkRead()}
                  >
                    {isMarkingRead ? 'Đang lưu…' : 'Đánh dấu đã đọc'}
                  </button>
                  <Link role="menuitem" tabIndex={-1} className={styles.menuAction} to="/notifications">
                    Xem tất cả
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actionWrap}>
            <button
              ref={userButtonRef}
              type="button"
              className={styles.userButton}
              aria-label={`Tài khoản: ${displayName}`}
              aria-expanded={openMenu === 'user'}
              aria-haspopup="menu"
              onClick={() => toggleMenu('user')}
            >
              <span className={styles.avatar} style={{ backgroundColor: avatarColor }} aria-hidden="true">
                {getInitial(displayName)}
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {openMenu === 'user' && (
              <div
                ref={userMenuRef}
                className={`${styles.dropdown} ${styles.userDropdown}`}
                role="menu"
                aria-label="Menu tài khoản"
                onKeyDown={handleMenuKeyDown}
              >
                <div className={styles.accountDetails} title={`${displayName}${email ? `\n${email}` : ''}`}>
                  <strong>{displayName}</strong>
                  {email && <span>{email}</span>}
                </div>
                <Link role="menuitem" tabIndex={-1} className={styles.accountMenuItem} to="/profile">
                  <UserRound size={17} aria-hidden="true" /> Hồ sơ cá nhân
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={styles.accountMenuItem}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                  onClick={handleLogout}
                >
                  <LogOut size={17} aria-hidden="true" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDrawerOpen && (
        <div className={styles.drawerLayer}>
          <button
            type="button"
            className={styles.drawerBackdrop}
            aria-label="Đóng menu điều hướng"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div
            id="primary-navigation-drawer"
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Điều hướng chính"
          >
            <div className={styles.drawerHeader}>
              <Link className={styles.brand} to="/watchlist" onClick={() => setIsDrawerOpen(false)}>
                <span className={styles.logoMark} aria-hidden="true">T</span>
                <span>Trakora</span>
              </Link>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng menu"
                onClick={() => {
                  setIsDrawerOpen(false);
                  drawerButtonRef.current?.focus();
                }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav className={styles.drawerNav} aria-label="Điều hướng chính">
              {primaryNavigation.map(({ label, to, icon: Icon, end }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={end}
                  aria-current={activeTab(to) ? 'page' : undefined}
                  className={({ isActive }) => `${styles.navLink} ${styles.drawerLink} ${isActive && activeTab(to) ? styles.active : ''}`}
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
