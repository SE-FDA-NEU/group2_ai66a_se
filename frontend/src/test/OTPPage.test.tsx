import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OTPPage from '../pages/OTPPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi', () => ({
  sendOTP: vi.fn(),
  verifyOTP: vi.fn(),
  registerUser: vi.fn(),
  login: vi.fn(),
}));

vi.mock('../api/userApi', () => ({
  getUserProfile: vi.fn().mockResolvedValue({ data: null }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    saveToken: vi.fn(),
    setUser: vi.fn(),
    token: null,
    user: null,
    isLoggedIn: false,
    logout: vi.fn(),
  }),
}));

describe('OTPPage Anti-Spam & Resend Flow', () => {
  const defaultState = {
    email: 'test@example.com',
    nickname: 'Test User',
    password: 'password123',
    reason: 'verify-email',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders the resend button in disabled state with countdown when cooldown is active', () => {
    // Set active cooldown in sessionStorage (45 seconds left)
    sessionStorage.setItem('otp_cooldown_verify-email_test@example.com', (Date.now() + 45000).toString());

    render(
      <MemoryRouter initialEntries={[{ pathname: '/otp', state: defaultState }]}>
        <OTPPage />
      </MemoryRouter>
    );

    // Resend button MUST be present on the UI
    const resendBtn = screen.getByRole('button', { name: /Gửi lại mã/i });
    expect(resendBtn).toBeInTheDocument();
    expect(resendBtn).toBeDisabled();
    expect(resendBtn).toHaveTextContent(/Gửi lại mã \(\d+s\)/);
  });

  it('enables the resend button when cooldown reaches 0', () => {
    // Set expired cooldown in sessionStorage
    sessionStorage.setItem('otp_cooldown_verify-email_test@example.com', (Date.now() - 1000).toString());

    render(
      <MemoryRouter initialEntries={[{ pathname: '/otp', state: defaultState }]}>
        <OTPPage />
      </MemoryRouter>
    );

    const resendBtn = screen.getByRole('button', { name: /Gửi lại OTP/i });
    expect(resendBtn).toBeInTheDocument();
    expect(resendBtn).toBeEnabled();
  });

  it('triggers sendOTP and restarts cooldown with success toast when resend button is clicked', async () => {
    sessionStorage.setItem('otp_cooldown_verify-email_test@example.com', (Date.now() - 1000).toString());
    vi.mocked(authApi.sendOTP).mockResolvedValue({ message: 'OTP sent' });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/otp', state: defaultState }]}>
        <OTPPage />
      </MemoryRouter>
    );

    const resendBtn = screen.getByRole('button', { name: /Gửi lại OTP/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(authApi.sendOTP).toHaveBeenCalledWith('test@example.com', 'verify-email');
      expect(screen.getByText(/Mã OTP mới đã được gửi thành công!/i)).toBeInTheDocument();
      expect(resendBtn).toBeDisabled();
    });
  });

  it('displays rate limit error message when backend returns OTP_MAX_REQUESTS_EXCEEDED', async () => {
    sessionStorage.setItem('otp_cooldown_verify-email_test@example.com', (Date.now() - 1000).toString());
    vi.mocked(authApi.sendOTP).mockRejectedValue({
      error: {
        code: 'OTP_MAX_REQUESTS_EXCEEDED',
        message: 'Bạn đã yêu cầu gửi mã OTP quá 5 lần trong vòng 1 giờ. Vui lòng thử lại sau.',
      },
      detail: 'Bạn đã yêu cầu gửi mã OTP quá 5 lần trong vòng 1 giờ. Vui lòng thử lại sau.',
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/otp', state: defaultState }]}>
        <OTPPage />
      </MemoryRouter>
    );

    const resendBtn = screen.getByRole('button', { name: /Gửi lại OTP/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Bạn đã yêu cầu gửi mã OTP quá 5 lần trong vòng 1 giờ/i)
      ).toBeInTheDocument();
    });
  });
});

