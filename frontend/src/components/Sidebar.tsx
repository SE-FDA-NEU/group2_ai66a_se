import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, isLoggedIn } = useAuth();
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
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/"
          onClick={onClose}
          className={({ isActive }) => `${styles.navItem} ${isActive && window.location.pathname === '/' ? styles.active : ''}`}
        >
          <span className={styles.icon}>[]</span>
          <span>Tổng quan</span>
        </NavLink>

        <NavLink
          to="/watchlist"
          onClick={onClose}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>[]</span>
          <span>Danh sách theo dõi</span>
        </NavLink>

        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>[]</span>
          <span>Cài đặt</span>
        </NavLink>
      </nav>

      <div className={styles.footer}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}></div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{isLoggedIn ? 'Đã đăng nhập' : 'Khách'}</span>
            <span className={styles.userEmail}>{localStorage.getItem('user_email') || 'Chưa đăng nhập'}</span>
          </div>
          {isLoggedIn && (
            <button
              title="Đăng xuất"
              onClick={() => {
                logout();
                localStorage.removeItem('user_email');
                navigate('/login');
              }}
              className={styles.logoutBtn}
            >
              ⎋
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
