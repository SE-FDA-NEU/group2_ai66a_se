import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const baseProps = {
    isOpen: true,
    title: 'Đăng xuất?',
    description: 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Trakora.',
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<ConfirmDialog {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirming', () => {
    render(<ConfirmDialog {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose without onConfirm when cancelling', () => {
    render(<ConfirmDialog {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it('closes when clicking the overlay', () => {
    render(<ConfirmDialog {...baseProps} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it('shows custom labels', () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Đăng xuất" cancelLabel="Quay lại" />);
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeInTheDocument();
  });
});
