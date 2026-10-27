import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi', () => ({
  sendOTP: vi.fn(),
  verifyOTP: vi.fn(),
  resetPassword: vi.fn(),
}));

describe('ForgotPasswordPage (US04 - Google Account Password Reset Block)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays friendly error when email belongs to a Google account without password', async () => {
    vi.mocked(authApi.sendOTP).mockRejectedValue({
      error: {
        code: 'GOOGLE_ACCOUNT_NO_PASSWORD',
        message: 'Account is registered via Google and does not have a local password. Please sign in with Google.',
      },
      detail: 'Account is registered via Google and does not have a local password. Please sign in with Google.',
    });

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/Địa chỉ email/i);
    const submitBtn = screen.getByRole('button', { name: /Tiếp tục/i });

    fireEvent.change(emailInput, { target: { value: 'googleuser@gmail.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Tài khoản này được đăng ký bằng Google và không có mật khẩu ứng dụng. Vui lòng đăng nhập trực tiếp bằng Google.'
        )
      ).toBeInTheDocument();
    });
  });

  it('advances to step 2 when email request succeeds for standard account', async () => {
    vi.mocked(authApi.sendOTP).mockResolvedValue({
      message: 'OTP sent successfully',
    });

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/Địa chỉ email/i);
    const submitBtn = screen.getByRole('button', { name: /Tiếp tục/i });

    fireEvent.change(emailInput, { target: { value: 'standard@example.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Xác thực mã OTP/i)).toBeInTheDocument();
    });
  });
});

