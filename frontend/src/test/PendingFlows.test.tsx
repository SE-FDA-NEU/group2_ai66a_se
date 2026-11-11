import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { getUserProfile } from '../api/userApi';
import * as api from '../api/authApi';
import RegisterPage from '../pages/RegisterPage';
import OTPPage from '../pages/OTPPage';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

vi.mock('../api/userApi', () => ({ getUserProfile: vi.fn() }));
vi.mock('../api/authApi', () => ({ login: vi.fn(), loginWithGoogle: vi.fn(), sendOTP: vi.fn(), verifyOTP: vi.fn(), registerUser: vi.fn() }));
const token = `header.${btoa(JSON.stringify({ sub: '7', exp: 9999999999 }))}.signature`;
const user = { id: 7, email: 'buyer@example.test', nickname: 'Buyer' };
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });
function Session() { const auth = useAuth(); return <><span>{auth.user?.email ?? 'No profile'}</span><button onClick={auth.logout}>Logout</button></>; }

it('shows continuous initialization and fetches a stored-token profile once in StrictMode', async () => {
  const pending = deferred<Awaited<ReturnType<typeof getUserProfile>>>();
  vi.mocked(getUserProfile).mockReturnValue(pending.promise);
  localStorage.setItem('access_token', token);
  render(<StrictMode><AuthProvider><Session /></AuthProvider></StrictMode>);
  expect(screen.getByRole('status')).toHaveTextContent('Đang chuẩn bị tài khoản');
  await waitFor(() => expect(getUserProfile).toHaveBeenCalledOnce());
  expect(screen.getByRole('heading', { name: 'Đang kết nối với Trakora' })).toHaveFocus();
  await act(async () => { pending.resolve({ data: user } as Awaited<ReturnType<typeof getUserProfile>>); });
  expect(screen.getByText(user.email)).toBeVisible();
});

it('recovers a profile failure without asking for credentials again', async () => {
  localStorage.setItem('access_token', token);
  vi.mocked(getUserProfile).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: user } as Awaited<ReturnType<typeof getUserProfile>>);
  render(<AuthProvider><Session /></AuthProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Thử tải lại hồ sơ' }));
  await screen.findByText(user.email);
  expect(getUserProfile).toHaveBeenCalledTimes(2);
  expect(api.login).not.toHaveBeenCalled();
});

it('ignores a late profile response after session logout', async () => {
  const pending = deferred<Awaited<ReturnType<typeof getUserProfile>>>();
  vi.mocked(getUserProfile).mockReturnValue(pending.promise);
  localStorage.setItem('access_token', token);
  render(<AuthProvider><Session /></AuthProvider>);
  await waitFor(() => expect(getUserProfile).toHaveBeenCalledOnce());
  act(() => { window.dispatchEvent(new Event('auth:logout')); });
  await act(async () => { pending.resolve({ data: user } as Awaited<ReturnType<typeof getUserProfile>>); });
  expect(screen.getByText('No profile')).toBeVisible();
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(localStorage.getItem('user_email')).toBeNull();
});

it('shows registration progress and preserves the form after a failed send', async () => {
  const pending = deferred<Awaited<ReturnType<typeof api.sendOTP>>>();
  vi.mocked(api.sendOTP).mockReturnValue(pending.promise);
  render(<AuthProvider><MemoryRouter><RegisterPage /></MemoryRouter></AuthProvider>);
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Test Buyer' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Mật khẩu', { exact: true }), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'Password123!' } });
  const submit = screen.getAllByRole('button', { name: /^Đăng ký$/ }).find(button => button.getAttribute('type') === 'submit')!;
  submit.focus();
  fireEvent.click(submit);
  expect(screen.getByRole('status')).toHaveTextContent('Đang gửi mã xác minh');
  fireEvent.submit(submit.closest('form')!);
  expect(api.sendOTP).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: /^Đăng ký$/ })).not.toBeInTheDocument();
  await act(async () => { pending.reject(new Error('Offline')); });
  expect(screen.getByLabelText('Email')).toHaveValue(user.email);
  expect(submit).toBeEnabled();
  expect(submit).toHaveFocus();
});

it('retries auto-login after account creation without verifying or creating again', async () => {
  vi.mocked(api.verifyOTP).mockResolvedValue({ data: { verified_token: 'verified' } } as Awaited<ReturnType<typeof api.verifyOTP>>);
  vi.mocked(api.registerUser).mockResolvedValue({} as Awaited<ReturnType<typeof api.registerUser>>);
  vi.mocked(api.login).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ access_token: token } as Awaited<ReturnType<typeof api.login>>);
  vi.mocked(getUserProfile).mockResolvedValue({ data: user } as Awaited<ReturnType<typeof getUserProfile>>);
  render(<AuthProvider><MemoryRouter initialEntries={[{ pathname: '/otp', state: { email: user.email, nickname: 'Buyer', password: 'Password123!', reason: 'verify-email' } }]}><Routes><Route path="/otp" element={<OTPPage />} /><Route path="/watchlist" element={<h1>Ready</h1>} /></Routes></MemoryRouter></AuthProvider>);
  screen.getAllByRole('textbox').forEach((input, i) => fireEvent.change(input, { target: { value: String(i + 1) } }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Đăng nhập tài khoản mới' }));
  await screen.findByText('Ready');
  expect(api.verifyOTP).toHaveBeenCalledOnce();
  expect(api.registerUser).toHaveBeenCalledOnce();
  expect(api.login).toHaveBeenCalledTimes(2);
});

it('keeps the Google container mounted across slow authentication and uses current callbacks', async () => {
  let credential!: google.accounts.id.IdConfiguration['callback'];
  const initialize = vi.fn((config: google.accounts.id.IdConfiguration) => { credential = config.callback; });
  const renderButton = vi.fn((element: HTMLElement, config: google.accounts.id.GsiButtonConfiguration) => {
    const button = document.createElement('button'); button.textContent = 'Google SDK'; button.onclick = () => config.click_listener?.(); element.append(button);
  });
  vi.stubGlobal('google', { accounts: { id: { initialize, renderButton } } });
  const first = vi.fn(); const second = vi.fn(); const interaction = vi.fn();
  const { rerender } = render(<GoogleAuthButton mode="login" onSuccess={first} onInteractionChange={interaction} />);
  fireEvent.click(await screen.findByText('Google SDK'));
  expect(interaction).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục bằng email' }));
  rerender(<GoogleAuthButton mode="login" onSuccess={second} isLoading />);
  expect(document.querySelector('[inert]')).toBeTruthy();
  rerender(<GoogleAuthButton mode="login" onSuccess={second} />);
  act(() => credential({ credential: 'cancelled' }));
  expect(second).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Google SDK'));
  act(() => credential({ credential: 'credential' }));
  expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledWith('credential');
  expect(initialize).toHaveBeenCalledOnce(); expect(renderButton).toHaveBeenCalledOnce();
});

it('shows SDK initialization, then offers retry and recovers when Google becomes available', () => {
  vi.useFakeTimers();
  try {
    render(<GoogleAuthButton mode="login" onSuccess={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang kết nối với Google');
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải đăng nhập Google');
    const renderButton = vi.fn((element: HTMLElement) => { element.textContent = 'Recovered Google'; });
    vi.stubGlobal('google', { accounts: { id: { initialize: vi.fn(), renderButton } } });
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại Google' }));
    expect(screen.getByText('Recovered Google')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  } finally { vi.useRealTimers(); }
});
