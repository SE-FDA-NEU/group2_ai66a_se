import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GOOGLE_CLIENT_ID } from '../config/auth';
import styles from './GoogleAuthButton.module.css';

interface GoogleAuthButtonProps {
  mode: 'login' | 'register';
  onSuccess: (idToken: string) => void;
  onError?: (errorMessage: string) => void;
  isLoading?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode,
  onSuccess,
  onError,
  isLoading = false,
}) => {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  const handleCredentialResponse = useCallback(
    (response: google.accounts.id.CredentialResponse) => {
      if (response && response.credential) {
        onSuccess(response.credential);
      } else {
        onError?.('Không nhận được thông tin xác thực từ Google.');
      }
    },
    [onSuccess, onError]
  );

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    const maxAttempts = 25; // 2.5 seconds timeout

    const setupButton = () => {
      if (!buttonContainerRef.current) return false;

      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          buttonContainerRef.current.innerHTML = '';
          const containerWidth = buttonContainerRef.current.parentElement?.offsetWidth || 360;
          const targetWidth = Math.min(Math.max(containerWidth, 240), 400);

          window.google.accounts.id.renderButton(buttonContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: mode === 'register' ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: targetWidth,
          });

          return true;
        } catch (e) {
          console.warn('Google renderButton error:', e);
          setHasError(true);
          return false;
        }
      }
      return false;
    };

    if (!setupButton()) {
      timer = setInterval(() => {
        attempts += 1;
        if (setupButton()) {
          if (timer) clearInterval(timer);
        } else if (attempts >= maxAttempts) {
          if (timer) clearInterval(timer);
          setHasError(true);
        }
      }, 100);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, handleCredentialResponse]);

  const handleFallbackClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      onError?.(
        'Không thể kết nối đến Google Identity Services. Vui lòng kiểm tra kết nối mạng hoặc tiện ích chặn quảng cáo.'
      );
    }
  };

  const buttonText = mode === 'register' ? 'Đăng ký với Google' : 'Đăng nhập với Google';

  return (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.loadingOverlay}>
          <span className={styles.spinner} />
          <span>Đang xác thực Google...</span>
        </div>
      ) : (
        <>
          {/* Official Google Button target div */}
          <div
            ref={buttonContainerRef}
            className={styles.googleBtnWrapper}
            style={{ display: hasError ? 'none' : 'flex' }}
          />

          {/* Fallback button if Google script failed or was blocked */}
          {hasError && (
            <button
              type="button"
              className={styles.fallbackBtn}
              onClick={handleFallbackClick}
              disabled={isLoading}
            >
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>{buttonText}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default GoogleAuthButton;
