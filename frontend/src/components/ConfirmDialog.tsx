import React from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? styles.confirmDanger : styles.confirmBtn}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
