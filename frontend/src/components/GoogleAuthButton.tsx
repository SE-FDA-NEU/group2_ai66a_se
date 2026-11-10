import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../config/auth';
import { InlinePending } from './LoadingState';
import styles from './GoogleAuthButton.module.css';
interface GoogleAuthButtonProps { mode: 'login' | 'register'; onSuccess: (idToken: string) => void; onError?: (message: string) => void; isLoading?: boolean; onInteractionChange?: (pending: boolean) => void }
export const GoogleAuthButton = ({ mode, onSuccess, onError, isLoading = false, onInteractionChange }: GoogleAuthButtonProps) => {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSuccess, onError, isLoading, onInteractionChange });
  callbacks.current = { onSuccess, onError, isLoading, onInteractionChange };
  const [providerPending, setProviderPending] = useState(false);
  const live = useRef(true);
  const credentialAllowed = useRef(true);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    live.current = true;
    let tries = 0;
    let timer: ReturnType<typeof setInterval>;
    setState('loading');
    const setup = () => {
      if (!container.current || !window.google?.accounts?.id) return false;
      try {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, auto_select: false, cancel_on_tap_outside: true,
          callback: response => { if (!live.current || !credentialAllowed.current || callbacks.current.isLoading) return; credentialAllowed.current = false; setProviderPending(false); callbacks.current.onInteractionChange?.(false); if (response.credential) callbacks.current.onSuccess(response.credential); else callbacks.current.onError?.('Không nhận được thông tin xác thực từ Google.'); },
        });
        container.current.innerHTML = '';
        window.google.accounts.id.renderButton(container.current, { click_listener: () => { if (!callbacks.current.isLoading) { credentialAllowed.current = true; setProviderPending(true); callbacks.current.onInteractionChange?.(true); } }, type: 'standard', theme: 'outline', size: 'large', text: mode === 'register' ? 'signup_with' : 'signin_with', shape: 'rectangular', logo_alignment: 'left', width: Math.min(Math.max(container.current.parentElement?.offsetWidth || 360, 240), 400) });
        setState('ready'); return true;
      } catch { setState('error'); return true; }
    };
    if (!setup()) timer = setInterval(() => { if (setup()) clearInterval(timer); else if (++tries >= 100) { clearInterval(timer); setState('error'); } }, 100);
    return () => { live.current = false; clearInterval(timer); };
  }, [mode, attempt]);
  useEffect(() => { container.current?.toggleAttribute('inert', isLoading || providerPending); }, [isLoading, providerPending]);
  const retry = () => {
    if (!window.google?.accounts?.id) {
      document.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]').forEach(script => script.remove());
      const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; document.head.append(script);
    }
    setAttempt(value => value + 1);
  };
  return <div className={styles.container}>
    <div ref={container} className={styles.googleBtnWrapper} hidden={state !== 'ready'} aria-disabled={isLoading} style={{ pointerEvents: isLoading || providerPending ? 'none' : undefined }} />
    {providerPending && <div><InlinePending message="Đang chờ bạn chọn tài khoản Google..." /><p>Nếu bạn đã đóng cửa sổ Google, hãy tiếp tục bằng email.</p><button className={styles.fallbackBtn} type="button" onClick={() => { credentialAllowed.current = false; setProviderPending(false); callbacks.current.onInteractionChange?.(false); }}>Tiếp tục bằng email</button></div>}
    {state === 'loading'  && <InlinePending message="Đang kết nối với Google..." />}
    {state === 'error' && <div role="alert"><p>Chưa thể tải đăng nhập Google. Bạn có thể dùng email hoặc thử kết nối lại.</p><button className={styles.fallbackBtn} type="button" disabled={isLoading} onClick={retry}>Thử kết nối lại Google</button></div>}
  </div>;
};
export default GoogleAuthButton;
