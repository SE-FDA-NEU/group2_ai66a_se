import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { isTokenValid, clearAuthStorage } from '../utils/auth';

// Helper tạo JWT mock
const createMockJwt = (expInSecondsFromNow: number): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expInSecondsFromNow;
  const payload = btoa(JSON.stringify({ sub: '123', exp, email: 'user@test.com' }));
  const signature = 'test_signature';
  return `${header}.${payload}.${signature}`;
};

describe('Auth Utils & isTokenValid', () => {
  it('returns false for null, undefined or empty string', () => {
    expect(isTokenValid(null)).toBe(false);
    expect(isTokenValid(undefined)).toBe(false);
    expect(isTokenValid('')).toBe(false);
    expect(isTokenValid('undefined')).toBe(false);
    expect(isTokenValid('null')).toBe(false);
  });

  it('returns false for malformed JWT token', () => {
    expect(isTokenValid('invalid.token')).toBe(false);
    expect(isTokenValid('header.not_json_payload.sig')).toBe(false);
  });

  it('returns false for expired token', () => {
    const expiredToken = createMockJwt(-3600); // 1 hour ago
    expect(isTokenValid(expiredToken)).toBe(false);
  });

  it('returns true for valid active token', () => {
    const activeToken = createMockJwt(3600); // 1 hour in future
    expect(isTokenValid(activeToken)).toBe(true);
  });

  it('clearAuthStorage removes access_token and user_email from localStorage', () => {
    localStorage.setItem('access_token', 'sample_token');
    localStorage.setItem('user_email', 'test@test.com');
    clearAuthStorage();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user_email')).toBeNull();
  });
});

describe('Route Guard & Navigation Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('redirects to /login when visiting /watchlist without any token', async () => {
    window.history.pushState({}, '', '/watchlist');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it('redirects to /login when visiting /settings without any token', async () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
  });

  it('redirects to /login when visiting /detail/101 without any token', async () => {
    window.history.pushState({}, '', '/detail/101');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
  });

  it('redirects to /login and clears storage when token is string "undefined"', async () => {
    localStorage.setItem('access_token', 'undefined');
    localStorage.setItem('user_email', 'ghost@test.com');
    window.history.pushState({}, '', '/watchlist');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('redirects to /login and clears storage when token is string "null"', async () => {
    localStorage.setItem('access_token', 'null');
    window.history.pushState({}, '', '/watchlist');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('redirects to /login when token is expired JWT', async () => {
    const expiredToken = createMockJwt(-1800); // expired 30 minutes ago
    localStorage.setItem('access_token', expiredToken);
    window.history.pushState({}, '', '/watchlist');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('redirects unknown route (*) to /login when unauthenticated', async () => {
    window.history.pushState({}, '', '/some-random-unknown-page');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
  });

  it('allows access to /watchlist when token is valid', async () => {
    const validToken = createMockJwt(3600);
    localStorage.setItem('access_token', validToken);
    window.history.pushState({}, '', '/watchlist');
    render(<App />);

    expect(window.location.pathname).toBe('/watchlist');
    expect(screen.getByRole('heading', { name: /danh sách theo dõi/i })).toBeInTheDocument();
  });

  it('redirects /login to /watchlist when user already has a valid token', async () => {
    const validToken = createMockJwt(3600);
    localStorage.setItem('access_token', validToken);
    window.history.pushState({}, '', '/login');
    render(<App />);

    expect(window.location.pathname).toBe('/watchlist');
  });

  it('allows visiting /login when token in storage is expired', async () => {
    const expiredToken = createMockJwt(-3600);
    localStorage.setItem('access_token', expiredToken);
    window.history.pushState({}, '', '/login');
    render(<App />);

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: /đăng nhập/i })).toBeInTheDocument();
  });
});
