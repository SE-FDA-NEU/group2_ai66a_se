import { ButtonHTMLAttributes, useEffect, useRef, useState } from 'react';
import styles from './LoadingState.module.css';

export function BrandLoadingIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.mark} ${compact ? styles.markCompact : ''}`} aria-hidden="true">
      <span>T</span>
      <svg viewBox="0 0 160 40">
        <path className={styles.track} d="M0 28H25L42 16L59 24L78 10L99 18L121 6H160" />
        <path className={styles.trace} d="M0 28H25L42 16L59 24L78 10L99 18L121 6H160" />
      </svg>
    </span>
  );
}

export function AuthPendingScreen({ message, error, onRetry, onExit }: { message: string; error?: string | null; onRetry?: () => void; onExit?: () => void }) {
  const [slow, setSlow] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    heading.current?.focus();
    const timer = setTimeout(() => setSlow(true), 7000);
    return () => {
      clearTimeout(timer);
      queueMicrotask(() => { if (heading.current?.isConnected) return; const element = previousFocus.current; if (element?.isConnected && !element.closest('[hidden]')) element.focus(); });
    };
  }, []);
  useEffect(() => { heading.current?.focus(); }, [Boolean(error)]);
  return <main className={styles.auth}>
    <div className={styles.authContent}><div className={styles.wordmark}>Trakora</div>
      <BrandLoadingIndicator />
      <h1 ref={heading} tabIndex={-1}>{error ? 'Chưa thể hoàn tất đăng nhập' : 'Đang kết nối với Trakora'}</h1>
      <p role={error ? 'alert' : 'status'} aria-live="polite">{error || message}</p>
      {!error && <p className={styles.help}>{slow ? 'Kết nối đang lâu hơn dự kiến. Yêu cầu vẫn đang được xử lý; bạn chưa cần gửi lại.' : 'Theo dõi giá. Mua đúng lúc.'}</p>}
      {error && <div className={styles.actions}><button onClick={onRetry} type="button">Thử tải lại hồ sơ</button><button onClick={onExit} type="button">Quay lại đăng nhập</button></div>}
    </div>
  </main>;
}

export function SectionLoadingState({ message = 'Đang tải dữ liệu...' }: { message?: string; skeleton?: boolean }) {
  return (
    <div className={styles.section} role="status" aria-live="polite">
      <BrandLoadingIndicator />
      <p className={styles.sectionMessage}>{message}</p>
    </div>
  );
}

export function InlinePending({ message, announce = true }: { message: string; announce?: boolean }) {
  return (
    <span className={styles.inline} role={announce ? 'status' : undefined}>
      <BrandLoadingIndicator compact />
      <span>{message}</span>
    </span>
  );
}

export function PendingButton({ pending, pendingLabel, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pending: boolean; pendingLabel: string }) {
  return <button {...props} disabled={disabled || pending} aria-busy={pending}>{pending ? <InlinePending message={pendingLabel} /> : children}</button>;
}
