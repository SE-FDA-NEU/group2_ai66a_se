import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

export const Sidebar: React.FC = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>T</div>
        <h1 className={styles.logoText}>Trakora</h1>
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/"
          className={({ isActive }) => `${styles.navItem} ${isActive && window.location.pathname === '/' ? styles.active : ''}`}
        >
          <span className={styles.icon}>[]</span>
          <span>Tổng quan</span>
        </NavLink>

        <NavLink
          to="/watchlist"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>[]</span>
          <span>Danh sách theo dõi</span>
        </NavLink>

        <NavLink
          to="/settings"
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
            <span className={styles.userName}>{localStorage.getItem('user_email') ? 'Đã đăng nhập' : 'Khách'}</span>
            <span className={styles.userEmail}>{localStorage.getItem('user_email') || 'Chưa đăng nhập'}</span>
          </div>
          {localStorage.getItem('access_token') && (
            <button
              title="Đăng xuất"
              onClick={() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_email');
                window.location.href = '/login';
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                marginLeft: 'auto',
                color: '#ef4444',
              }}
            >
              ⎋
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
