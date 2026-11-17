import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../pages/AdminPage';
import {
  checkSystemHealth,
  cleanupExpiredProducts,
  createSaleEvent,
  deleteSaleEvent,
  getSaleEvents,
  getSystemInfo,
  setAdminByEmail,
  triggerSaleAlerts,
  updateSaleEvent,
} from '../api/adminApi';
import { showToast } from '../utils/toast';

const mocks = vi.hoisted(() => ({
  auth: {
    isLoggedIn: true,
    user: { id: 1, email: 'admin@example.com', nickname: 'Admin', is_developer: true },
  },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../api/adminApi', () => ({
  getSystemInfo: vi.fn(),
  checkSystemHealth: vi.fn(),
  setAdminByEmail: vi.fn(),
  cleanupExpiredProducts: vi.fn(),
  getSaleEvents: vi.fn(),
  createSaleEvent: vi.fn(),
  updateSaleEvent: vi.fn(),
  deleteSaleEvent: vi.fn(),
  triggerSaleAlerts: vi.fn(),
}));
vi.mock('../utils/toast', () => ({ showToast: vi.fn() }));

const sampleSales = [
  {
    id: 1,
    name: '11.11 Mega Sale',
    description: 'Giảm giá lớn tháng 11',
    marketplace: 'shopee',
    start_at: '2026-11-11T00:00:00Z',
    end_at: '2026-11-12T00:00:00Z',
    is_active: true,
    created_by: 1,
    created_at: '2026-11-01T00:00:00Z',
  },
];

const renderAdminPage = () =>
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.isLoggedIn = true;
    mocks.auth.user = { id: 1, email: 'admin@example.com', nickname: 'Admin', is_developer: true };
    vi.mocked(getSystemInfo).mockResolvedValue({
      message: 'Hệ thống ổn định',
      data: { app_name: 'Hệ thống quản lý API', version: '1.0.0', developer: 'admin@example.com' },
    });
    vi.mocked(checkSystemHealth).mockResolvedValue({ message: 'Mọi thứ kết nối ổn định', data: null });
    vi.mocked(setAdminByEmail).mockResolvedValue({ message: 'Đã cập nhật admin cho email user@example.com', data: null });
    vi.mocked(cleanupExpiredProducts).mockResolvedValue({
      message: 'Đã dọn dẹp 2 sản phẩm hết hạn.',
      data: { deleted_product_ids: [10, 11], count: 2 },
    });
    vi.mocked(getSaleEvents).mockResolvedValue(sampleSales);
    vi.mocked(createSaleEvent).mockResolvedValue({
      id: 2,
      name: '12.12 Sale',
      description: 'Cuối năm',
      marketplace: 'amazon',
      start_at: '2026-12-12T00:00:00.000Z',
      end_at: '2026-12-13T00:00:00.000Z',
      is_active: true,
      created_at: '2026-11-02T00:00:00Z',
    });
    vi.mocked(updateSaleEvent).mockResolvedValue({
      ...sampleSales[0],
      is_active: false,
    });
    vi.mocked(deleteSaleEvent).mockResolvedValue();
    vi.mocked(triggerSaleAlerts).mockResolvedValue(4);
  });

  afterEach(cleanup);

  it('shows 403 permission error for regular non-admin users', () => {
    mocks.auth.user = { id: 42, email: 'van@example.com', nickname: 'Van', is_developer: false };
    renderAdminPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Bạn không có quyền truy cập trang này');
    expect(alert).toHaveTextContent('You do not have permission to view this page');
    expect(getSystemInfo).not.toHaveBeenCalled();
    expect(getSaleEvents).not.toHaveBeenCalled();
  });

  it('loads system info and handles health check, set-admin, and cleanup APIs', async () => {
    renderAdminPage();

    expect(await screen.findByText('Hệ thống quản lý API')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Mọi thứ kết nối ổn định')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối' }));
    await waitFor(() => expect(checkSystemHealth).toHaveBeenCalledTimes(2));
    expect(showToast).toHaveBeenCalledWith('success', 'Mọi thứ kết nối ổn định');

    fireEvent.change(screen.getByLabelText('Email người dùng'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cấp quyền Admin' }));
    await waitFor(() => expect(setAdminByEmail).toHaveBeenCalledWith('user@example.com'));
    expect(await screen.findByText('Đã cập nhật admin cho email user@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chạy dọn dẹp ngay' }));
    await waitFor(() => expect(cleanupExpiredProducts).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Đã dọn dẹp 2 sản phẩm hết hạn/)).toBeInTheDocument();
    expect(screen.getByText(/ID: 10, 11/)).toBeInTheDocument();
  });

  it('validates end date before start date and creates a sale event', async () => {
    renderAdminPage();
    expect(await screen.findByText('11.11 Mega Sale')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tên sự kiện sale'), { target: { value: '12.12 Sale' } });
    fireEvent.change(screen.getByLabelText('Sàn thương mại điện tử'), { target: { value: 'amazon' } });
    fireEvent.change(screen.getByLabelText('Thời gian bắt đầu'), { target: { value: '2026-12-12T10:00' } });
    fireEvent.change(screen.getByLabelText('Thời gian kết thúc'), { target: { value: '2026-12-11T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo sự kiện' }));

    expect(await screen.findByText(/End date must be after the start date/)).toBeInTheDocument();
    expect(createSaleEvent).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Thời gian kết thúc'), { target: { value: '2026-12-13T10:00' } });
    fireEvent.change(screen.getByLabelText('Mô tả sự kiện'), { target: { value: 'Cuối năm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo sự kiện' }));

    await waitFor(() => expect(createSaleEvent).toHaveBeenCalledTimes(1));
    expect(createSaleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '12.12 Sale',
        marketplace: 'amazon',
        description: 'Cuối năm',
        is_active: true,
      }),
    );
  });

  it('supports editing, toggling, deleting sale events and triggering 48h alerts', async () => {
    renderAdminPage();
    expect(await screen.findByText('11.11 Mega Sale')).toBeInTheDocument();

    // Filter active only
    fireEvent.click(screen.getByRole('button', { name: 'Đang kích hoạt' }));
    await waitFor(() => expect(getSaleEvents).toHaveBeenCalledWith(true));

    // Reset filter back to all
    fireEvent.click(screen.getByRole('button', { name: 'Tất cả sự kiện' }));
    await waitFor(() => expect(getSaleEvents).toHaveBeenLastCalledWith(false));

    // Edit sale event
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    expect(screen.getByDisplayValue('11.11 Mega Sale')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tên sự kiện sale'), { target: { value: '11.11 Super Sale' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cập nhật' }));
    await waitFor(() =>
      expect(updateSaleEvent).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: '11.11 Super Sale' }),
      ),
    );

    // Toggle active status
    fireEvent.click(screen.getByRole('button', { name: 'Tạm tắt' }));
    await waitFor(() => expect(updateSaleEvent).toHaveBeenCalledWith(1, { is_active: false }));

    // Delete with confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa sự kiện sale?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa sự kiện' }));
    await waitFor(() => expect(deleteSaleEvent).toHaveBeenCalledWith(1));

    // Trigger 48h alerts
    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt cảnh báo 48h ngay' }));
    await waitFor(() => expect(triggerSaleAlerts).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Đã kích hoạt gửi 4 cảnh báo đợt giảm giá lớn/)).toBeInTheDocument();
  });
});
