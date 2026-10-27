import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import styles from './ShopTrustBadge.module.css';
import { ShopTrustLabel } from '../utils/trustLabel';

export interface ShopTrustBadgeProps {
  label?: ShopTrustLabel | string | null;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const ShopTrustBadge: React.FC<ShopTrustBadgeProps> = ({
  label,
  size = 'medium',
  className = '',
}) => {
  if (!label) return null;

  const normalized = label.trim();
  const lower = normalized.toLowerCase();

  let variantClass = styles.unknown;
  let statusKey = 'unknown';
  let Icon = AlertCircle;

  if (lower.includes('trusted')) {
    variantClass = styles.trusted;
    statusKey = 'trusted';
    Icon = ShieldCheck;
  } else if (lower.includes('risk')) {
    variantClass = styles.risky;
    statusKey = 'risky';
    Icon = AlertTriangle;
  } else if (lower.includes('caution')) {
    variantClass = styles.caution;
    statusKey = 'caution';
    Icon = AlertCircle;
  }

  const sizeClass =
    size === 'small'
      ? styles.sizeSmall
      : size === 'large'
      ? styles.sizeLarge
      : styles.sizeMedium;

  const iconSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  return (
    <span
      className={`${styles.badge} ${sizeClass} ${variantClass} ${className}`.trim()}
      data-testid="shop-trust-badge"
      data-trust-status={statusKey}
      title={`Shop Trust Status: ${normalized}`}
      aria-label={`Shop trust status: ${normalized}`}
    >
      <Icon size={iconSize} className={styles.icon} aria-hidden="true" />
      <span>{normalized}</span>
    </span>
  );
};
