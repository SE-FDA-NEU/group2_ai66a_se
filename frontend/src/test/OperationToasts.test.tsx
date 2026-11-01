import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { OperationToasts } from '../components/OperationToasts';
import { showToast, toastStore } from '../utils/toast';
import apiClient from '../api/config';

const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => {
  toastStore.getSnapshot().forEach((item) => toastStore.dismiss(item.id));
});
afterEach(() => { cleanup(); vi.useRealTimers(); apiClient.defaults.adapter = originalAdapter; });

it('N185-UI-06 shows success and error with distinct roles, expires at five seconds, and queues overflow', async () => {
  vi.useFakeTimers();
  render(<OperationToasts />);
  act(() => {
    showToast('success', 'Đã lưu hồ sơ.');
    showToast('error', 'Vui lòng thử lại.');
    showToast('success', 'Đã thêm sản phẩm.');
    showToast('success', 'Đã cập nhật mật khẩu.');
  });
  expect(screen.getByRole('alert')).toHaveTextContent('Không thể thực hiện');
  expect(screen.queryByText('Đã cập nhật mật khẩu.')).not.toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
  expect(screen.getByText('Đã lưu hồ sơ.')).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.queryByText('Đã lưu hồ sơ.')).not.toBeInTheDocument();
  expect(screen.getByText('Đã cập nhật mật khẩu.')).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.queryByText('Đã lưu hồ sơ.')).not.toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('N185-UI-07 reports write outcomes in Vietnamese and keeps background reads and seen writes silent', async () => {
  apiClient.defaults.adapter = async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
  await apiClient.get('/notifications');
  await apiClient.post('/notifications/seen', { ids: [1] });
  expect(toastStore.getSnapshot()).toHaveLength(0);
  await apiClient.put('/watchlist/1/target-price', { target_price: 100 });
  expect(toastStore.getSnapshot()[0].message).toBe('Đã lưu giá mục tiêu.');
  apiClient.defaults.adapter = async (config) => {
    throw new AxiosError('Network error', 'ERR_NETWORK', config as InternalAxiosRequestConfig,
      undefined, { data: { detail: 'Internal server error' }, status: 500, headers: new AxiosHeaders(), config, statusText: 'Error' } as AxiosResponse);
  };
  await expect(apiClient.delete('/watchlist/1')).rejects.toBeDefined();
  expect(toastStore.getSnapshot()[1].message).toContain('Vui lòng');
});
