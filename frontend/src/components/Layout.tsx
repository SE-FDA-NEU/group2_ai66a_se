import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <NotificationCenter />
      {/* Nút Hamburger cho Mobile (hiển thị khi màn hình nhỏ) */}
      <div className={styles.mobileHeader}>
        <button 
          className={styles.hamburgerBtn} 
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Mở menu"
        >
          ☰
        </button>
        <h1 className={styles.mobileTitle}>Trakora</h1>
        <div style={{ width: '32px' }}></div> {/* Spacer để cân bằng title ra giữa */}
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Overlay để bấm ra ngoài đóng menu */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};
