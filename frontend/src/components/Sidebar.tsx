import React from 'react';
import { Bell, Bookmark, LayoutDashboard, LogOut, User as UserIcon, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';
import { showToast } from '../utils/toast';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, isLoggedIn, user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.logoContainer}>
        <div className={styles.logoWrapper}>
          <div className={styles.logoIcon}>T</div>
          <h1 className={styles.logoText}>Trakora</h1>
        </div>
        {/* Nút đóng cho mobile */}
        {isOpen && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng menu">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/"
          onClick={onClose}
          className={({ isActive }) => `${styles.navItem} ${isActive && window.location.pathname === '/' ? styles.active : ''}`}
        >
          <LayoutDashboard className={styles.icon} aria-hidden="true" />
          <span>Tổng quan</span>
        </NavLink>

        <NavLink
          to="/watchlist"
          onClick={onClose}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Bookmark className={styles.icon} aria-hidden="true" />
          <span>Danh sách theo dõi</span>
        </NavLink>

        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <UserIcon className={styles.icon} aria-hidden="true" />
          <span>Hồ sơ cá nhân</span>
        </NavLink>
        <NavLink to="/notifications" onClick={onClose}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <Bell className={styles.icon} aria-hidden="true" /><span>Thông báo</span>
        </NavLink>
      </nav>

      <div className={styles.footer}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}></div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{isLoggedIn ? (user?.nickname || 'Đã đăng nhập') : 'Khách'}</span>
            <span className={styles.userEmail}>{user?.email || (isLoggedIn ? 'Đang tải...' : 'Chưa đăng nhập')}</span>
          </div>
          {isLoggedIn && (
            <button
              title="Đăng xuất"
              onClick={() => {
                logout();
                showToast('success', 'Đã đăng xuất tài khoản.');
                navigate('/login');
              }}
              className={styles.logoutBtn}
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
