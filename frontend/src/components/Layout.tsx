import React from 'react';
import { TopNavigation } from './TopNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="appLayout">
      <TopNavigation />
      <main className="mainContent">
        {children}
      </main>
    </div>
  );
};
