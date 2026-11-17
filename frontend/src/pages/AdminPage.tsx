import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BellRing,
  Calendar,
  CheckCircle2,
  Pencil,
  RotateCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CleanupExpiredData,
  SaleEvent,
  SystemInfoData,
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
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InlinePending, PendingButton, SectionLoadingState } from '../components/LoadingState';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import styles from './AdminPage.module.css';

interface SaleFormState {
  name: string;
  marketplace: string;
  startAt: string;
  endAt: string;
  description: string;
  isActive: boolean;
}

const EMPTY_SALE_FORM: SaleFormState = {
  name: '',
  marketplace: '',
  startAt: '',
  endAt: '',
  description: '',
  isActive: true,
};

const MARKETPLACE_LABELS: Record<string, string> = {
  '': 'Tất cả sàn',
  amazon: 'Amazon',
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object') {
    const obj = err as { detail?: unknown; message?: unknown };
    if (typeof obj.detail === 'string' && obj.detail.trim()) return obj.detail;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  }
  return fallback;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const toDateTimeLocalInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatMarketplace = (marketplace?: string | null): string => {
  if (!marketplace) return MARKETPLACE_LABELS[''];
  return MARKETPLACE_LABELS[marketplace.toLowerCase()] ?? marketplace;
};

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_developer);

  // System info state
  const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);
  const [systemInfoStatus, setSystemInfoStatus] = useState<string>('');
  const [loadingSystemInfo, setLoadingSystemInfo] = useState(false);
  const [systemInfoError, setSystemInfoError] = useState<string | null>(null);

  // Health state
  const [healthStatus, setHealthStatus] = useState<'idle' | 'healthy' | 'error'>('idle');
  const [healthMessage, setHealthMessage] = useState<string>('Chưa kiểm tra');
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Set admin state
  const [adminEmail, setAdminEmail] = useState('');
  const [settingAdmin, setSettingAdmin] = useState(false);
  const [setAdminFeedback, setSetAdminFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Cleanup expired products state
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ kind: 'success' | 'error'; message: string; data?: CleanupExpiredData } | null>(null);

  // Sale calendar state
  const [sales, setSales] = useState<SaleEvent[]>([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Sale form state
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [saleForm, setSaleForm] = useState<SaleFormState>(EMPTY_SALE_FORM);
  const [saleFormError, setSaleFormError] = useState<string | null>(null);
  const [savingSale, setSavingSale] = useState(false);

  // Sale actions state
  const [togglingSaleId, setTogglingSaleId] = useState<number | null>(null);
  const [deletingSale, setDeletingSale] = useState<SaleEvent | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [triggeringAlerts, setTriggeringAlerts] = useState(false);
  const [triggerAlertFeedback, setTriggerAlertFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadSystemInfo = useCallback(async () => {
    setLoadingSystemInfo(true);
    setSystemInfoError(null);
    try {
      const res = await getSystemInfo();
      if (!mounted.current) return;
      setSystemInfo(res.data ?? null);
      setSystemInfoStatus(res.message || 'Hệ thống ổn định');
    } catch (err) {
      if (!mounted.current) return;
      setSystemInfoError(getErrorMessage(err, 'Không thể tải thông tin hệ thống.'));
    } finally {
      if (mounted.current) setLoadingSystemInfo(false);
    }
  }, []);

  const runHealthCheck = useCallback(async (notifyUser = false) => {
    setCheckingHealth(true);
    try {
      const res = await checkSystemHealth();
      if (!mounted.current) return;
      const msg = res.message || 'Mọi thứ kết nối ổn định';
      setHealthStatus('healthy');
      setHealthMessage(msg);
      if (notifyUser) showToast('success', msg);
    } catch (err) {
      if (!mounted.current) return;
      const msg = getErrorMessage(err, 'Mất kết nối tới cơ sở dữ liệu hoặc Redis.');
      setHealthStatus('error');
      setHealthMessage(msg);
      if (notifyUser) showToast('error', msg);
    } finally {
      if (mounted.current) setCheckingHealth(false);
    }
  }, []);

  const loadSales = useCallback(async (filterActiveOnly: boolean) => {
    setLoadingSales(true);
    setSalesError(null);
    try {
      const items = await getSaleEvents(filterActiveOnly);
      if (!mounted.current) return;
      setSales(items);
    } catch (err) {
      if (!mounted.current) return;
      setSalesError(getErrorMessage(err, 'Không thể tải danh sách lịch ngày hội sale.'));
    } finally {
      if (mounted.current) setLoadingSales(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadSystemInfo();
    void runHealthCheck(false);
  }, [isAdmin, loadSystemInfo, runHealthCheck]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadSales(activeOnly);
  }, [isAdmin, activeOnly, loadSales]);

  const handleSetAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (settingAdmin) return;
    const trimmedEmail = adminEmail.trim();
    if (!trimmedEmail) {
      setSetAdminFeedback({ kind: 'error', text: 'Vui lòng nhập email người dùng.' });
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setSetAdminFeedback({ kind: 'error', text: 'Địa chỉ email không hợp lệ.' });
      return;
    }

    setSettingAdmin(true);
    setSetAdminFeedback(null);
    try {
      const res = await setAdminByEmail(trimmedEmail);
      if (!mounted.current) return;
      setSetAdminFeedback({
        kind: 'success',
        text: res.message || `Đã cấp quyền admin cho email ${trimmedEmail}.`,
      });
      setAdminEmail('');
    } catch (err) {
      if (!mounted.current) return;
      setSetAdminFeedback({
        kind: 'error',
        text: getErrorMessage(err, 'Không thể cấp quyền admin cho email này.'),
      });
    } finally {
      if (mounted.current) setSettingAdmin(false);
    }
  };

  const handleCleanupExpired = async () => {
    if (cleaningUp) return;
    setCleaningUp(true);
    setCleanupResult(null);
    try {
      const res = await cleanupExpiredProducts();
      if (!mounted.current) return;
      setCleanupResult({
        kind: 'success',
        message: res.message || `Đã dọn dẹp ${res.data?.count ?? 0} sản phẩm hết hạn.`,
        data: res.data,
      });
    } catch (err) {
      if (!mounted.current) return;
      setCleanupResult({
        kind: 'error',
        message: getErrorMessage(err, 'Không thể chạy tác vụ dọn dẹp sản phẩm hết hạn.'),
      });
    } finally {
      if (mounted.current) setCleaningUp(false);
    }
  };

  const resetSaleForm = () => {
    setEditingSaleId(null);
    setSaleForm(EMPTY_SALE_FORM);
    setSaleFormError(null);
  };

  const handleStartEditSale = (sale: SaleEvent) => {
    setEditingSaleId(sale.id);
    setSaleForm({
      name: sale.name,
      marketplace: sale.marketplace ?? '',
      startAt: toDateTimeLocalInput(sale.start_at),
      endAt: toDateTimeLocalInput(sale.end_at),
      description: sale.description ?? '',
      isActive: sale.is_active,
    });
    setSaleFormError(null);
  };

  const handleSaleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingSale) return;

    const trimmedName = saleForm.name.trim();
    if (!trimmedName) {
      setSaleFormError('Vui lòng nhập tên sự kiện sale.');
      return;
    }
    if (!saleForm.startAt) {
      setSaleFormError('Vui lòng chọn thời gian bắt đầu.');
      return;
    }

    const startDate = new Date(saleForm.startAt);
    if (Number.isNaN(startDate.getTime())) {
      setSaleFormError('Thời gian bắt đầu không hợp lệ.');
      return;
    }

    let endIso: string | null = null;
    if (saleForm.endAt) {
      const endDate = new Date(saleForm.endAt);
      if (Number.isNaN(endDate.getTime())) {
        setSaleFormError('Thời gian kết thúc không hợp lệ.');
        return;
      }
      if (endDate.getTime() <= startDate.getTime()) {
        setSaleFormError('Ngày kết thúc phải sau ngày bắt đầu (End date must be after the start date).');
        return;
      }
      endIso = endDate.toISOString();
    }

    const payload = {
      name: trimmedName,
      marketplace: saleForm.marketplace.trim() ? saleForm.marketplace.trim() : null,
      start_at: startDate.toISOString(),
      end_at: endIso,
      description: saleForm.description.trim() ? saleForm.description.trim() : null,
      is_active: saleForm.isActive,
    };

    setSavingSale(true);
    setSaleFormError(null);
    try {
      if (editingSaleId !== null) {
        await updateSaleEvent(editingSaleId, payload);
      } else {
        await createSaleEvent(payload);
      }
      if (!mounted.current) return;
      resetSaleForm();
      await loadSales(activeOnly);
    } catch (err) {
      if (!mounted.current) return;
      setSaleFormError(getErrorMessage(err, 'Không thể lưu sự kiện sale. Vui lòng thử lại.'));
    } finally {
      if (mounted.current) setSavingSale(false);
    }
  };

  const handleToggleSaleActive = async (sale: SaleEvent) => {
    if (togglingSaleId !== null) return;
    setTogglingSaleId(sale.id);
    try {
      const updated = await updateSaleEvent(sale.id, { is_active: !sale.is_active });
      if (!mounted.current) return;
      setSales((current) => {
        const next = current.map((item) => (item.id === sale.id ? updated : item));
        return activeOnly ? next.filter((item) => item.is_active) : next;
      });
    } catch (err) {
      if (!mounted.current) return;
      setSalesError(getErrorMessage(err, 'Không thể cập nhật trạng thái sự kiện sale.'));
    } finally {
      if (mounted.current) setTogglingSaleId(null);
    }
  };

  const handleConfirmDeleteSale = async () => {
    if (!deletingSale || isDeletingSale) return;
    setIsDeletingSale(true);
    try {
      await deleteSaleEvent(deletingSale.id);
      if (!mounted.current) return;
      if (editingSaleId === deletingSale.id) resetSaleForm();
      setSales((current) => current.filter((item) => item.id !== deletingSale.id));
      setDeletingSale(null);
    } catch (err) {
      if (!mounted.current) return;
      setSalesError(getErrorMessage(err, 'Không thể xóa sự kiện sale.'));
      setDeletingSale(null);
    } finally {
      if (mounted.current) setIsDeletingSale(false);
    }
  };

  const handleTriggerAlerts = async () => {
    if (triggeringAlerts) return;
    setTriggeringAlerts(true);
    setTriggerAlertFeedback(null);
    try {
      const count = await triggerSaleAlerts();
      if (!mounted.current) return;
      setTriggerAlertFeedback({
        kind: 'success',
        text: `Đã kích hoạt gửi ${count} cảnh báo đợt giảm giá lớn.`,
      });
    } catch (err) {
      if (!mounted.current) return;
      setTriggerAlertFeedback({
        kind: 'error',
        text: getErrorMessage(err, 'Không thể kích hoạt gửi cảnh báo sale.'),
      });
    } finally {
      if (mounted.current) setTriggeringAlerts(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.pageContainer}>
        <section className={styles.forbiddenCard} role="alert" aria-labelledby="forbidden-title">
          <div className={styles.forbiddenIcon}>
            <ShieldAlert size={26} aria-hidden="true" />
          </div>
          <span className={styles.forbiddenCode}>403 Forbidden</span>
          <h1 id="forbidden-title" className={styles.forbiddenTitle}>
            Bạn không có quyền truy cập trang này
          </h1>
          <p className={styles.forbiddenEn}>You do not have permission to view this page</p>
          <p className={styles.forbiddenDesc}>
            Khu vực quản trị hệ thống và lịch sự kiện sale chỉ dành cho tài khoản có quyền quản trị viên.
          </p>
          <Link to="/watchlist" className={styles.primaryBtn}>
            Quay về Danh sách theo dõi
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>
            <ShieldCheck size={24} aria-hidden="true" />
            <span>Bảng điều khiển Quản trị</span>
          </h1>
          <p className={styles.headerDescription}>
            Giám sát trạng thái hệ thống, phân quyền quản trị viên, dọn dẹp dữ liệu hết hạn và quản lý lịch ngày hội sale.
          </p>
        </div>
        <span className={styles.headerBadge}>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Quản trị viên: {user?.email}</span>
        </span>
      </header>

      {/* Khu vực 1: Quản trị Hệ thống (/api/v1/dev/*) */}
      <section className={styles.section} aria-labelledby="system-admin-heading">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="system-admin-heading" className={styles.sectionTitle}>
              Quản trị Hệ thống
            </h2>
            <p className={styles.sectionSubtitle}>
              Thao tác trực tiếp với các API quản trị hệ thống (System Info, Health Check, Set Admin, Cleanup).
            </p>
          </div>
        </div>

        <div className={styles.adminGrid}>
          {/* Card 1: Thông tin hệ thống */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrap}>
                <span className={styles.cardIcon}>
                  <Server size={18} aria-hidden="true" />
                </span>
                <h3 className={styles.cardTitle}>Thông tin hệ thống</h3>
              </div>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void loadSystemInfo()}
                disabled={loadingSystemInfo}
              >
                {loadingSystemInfo ? (
                  <InlinePending message="Đang tải..." />
                ) : (
                  <>
                    <RotateCw size={14} aria-hidden="true" />
                    <span>Làm mới</span>
                  </>
                )}
              </button>
            </div>

            {systemInfoError ? (
              <div className={`${styles.feedbackBox} ${styles.feedbackError}`} role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{systemInfoError}</span>
              </div>
            ) : systemInfo ? (
              <dl className={styles.infoList}>
                <div className={styles.infoRow}>
                  <dt>Ứng dụng</dt>
                  <dd>{systemInfo.app_name}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Phiên bản</dt>
                  <dd>{systemInfo.version}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Quản trị viên</dt>
                  <dd>{systemInfo.developer}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt>Trạng thái</dt>
                  <dd>{systemInfoStatus || 'Hệ thống ổn định'}</dd>
                </div>
              </dl>
            ) : (
              <SectionLoadingState message="Đang tải thông tin hệ thống..." />
            )}
          </article>

          {/* Card 2: Kiểm tra kết nối Database & Redis */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrap}>
                <span className={styles.cardIcon}>
                  <Activity size={18} aria-hidden="true" />
                </span>
                <h3 className={styles.cardTitle}>Kiểm tra kết nối Database &amp; Redis</h3>
              </div>
              <span
                className={`${styles.statusPill} ${
                  healthStatus === 'healthy'
                    ? styles.statusSuccess
                    : healthStatus === 'error'
                      ? styles.statusError
                      : styles.statusNeutral
                }`}
              >
                {healthStatus === 'healthy'
                  ? 'Ổn định'
                  : healthStatus === 'error'
                    ? 'Lỗi kết nối'
                    : 'Chưa kiểm tra'}
              </span>
            </div>

            <p className={styles.cardDescription}>
              Kiểm tra kết nối trực tiếp tới PostgreSQL và Redis bằng endpoint <code>/dev/health</code>.
            </p>

            <div
              className={`${styles.feedbackBox} ${
                healthStatus === 'healthy'
                  ? styles.feedbackSuccess
                  : healthStatus === 'error'
                    ? styles.feedbackError
                    : styles.feedbackNeutral
              }`}
              role={healthStatus === 'error' ? 'alert' : 'status'}
            >
              {healthStatus === 'healthy' ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <AlertCircle size={16} aria-hidden="true" />
              )}
              <span>{healthMessage}</span>
            </div>

            <div className={styles.buttonRow}>
              <PendingButton
                type="button"
                className={styles.primaryBtn}
                pending={checkingHealth}
                pendingLabel="Đang kiểm tra..."
                onClick={() => void runHealthCheck(true)}
              >
                <Activity size={15} aria-hidden="true" />
                <span>Kiểm tra kết nối</span>
              </PendingButton>
            </div>
          </article>

          {/* Card 3: Cấp quyền Quản trị viên */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrap}>
                <span className={styles.cardIcon}>
                  <UserPlus size={18} aria-hidden="true" />
                </span>
                <h3 className={styles.cardTitle}>Cấp quyền Quản trị viên</h3>
              </div>
            </div>

            <p className={styles.cardDescription}>
              Nhập email tài khoản đã đăng ký để nâng quyền thành quản trị viên hệ thống.
            </p>

            <form className={styles.form} onSubmit={handleSetAdminSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="admin-email-input" className={styles.label}>
                  Email người dùng
                </label>
                <div className={styles.inlineFormRow}>
                  <div className={styles.inlineFormInputWrap}>
                    <input
                      id="admin-email-input"
                      type="email"
                      className={styles.input}
                      placeholder="user@example.com"
                      value={adminEmail}
                      disabled={settingAdmin}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                  </div>
                  <PendingButton
                    type="submit"
                    className={styles.primaryBtn}
                    pending={settingAdmin}
                    pendingLabel="Đang cấp quyền..."
                  >
                    <UserPlus size={15} aria-hidden="true" />
                    <span>Cấp quyền Admin</span>
                  </PendingButton>
                </div>
              </div>
            </form>

            {setAdminFeedback && (
              <div
                className={`${styles.feedbackBox} ${
                  setAdminFeedback.kind === 'success' ? styles.feedbackSuccess : styles.feedbackError
                }`}
                role={setAdminFeedback.kind === 'error' ? 'alert' : 'status'}
              >
                {setAdminFeedback.kind === 'success' ? (
                  <CheckCircle2 size={16} aria-hidden="true" />
                ) : (
                  <AlertCircle size={16} aria-hidden="true" />
                )}
                <span>{setAdminFeedback.text}</span>
              </div>
            )}
          </article>

          {/* Card 4: Dọn dẹp sản phẩm hết hạn */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrap}>
                <span className={styles.cardIcon}>
                  <Trash2 size={18} aria-hidden="true" />
                </span>
                <h3 className={styles.cardTitle}>Dọn dẹp sản phẩm hết hạn</h3>
              </div>
            </div>

            <p className={styles.cardDescription}>
              Kích hoạt ngay tác vụ dọn dẹp các sản phẩm đã ngừng theo dõi quá 7 ngày (theo quy tắc BR15).
            </p>

            <div className={styles.buttonRow}>
              <PendingButton
                type="button"
                className={styles.secondaryBtn}
                pending={cleaningUp}
                pendingLabel="Đang dọn dẹp..."
                onClick={() => void handleCleanupExpired()}
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>Chạy dọn dẹp ngay</span>
              </PendingButton>
            </div>

            {cleanupResult && (
              <div
                className={`${styles.feedbackBox} ${
                  cleanupResult.kind === 'success' ? styles.feedbackSuccess : styles.feedbackError
                }`}
                role={cleanupResult.kind === 'error' ? 'alert' : 'status'}
              >
                {cleanupResult.kind === 'success' ? (
                  <CheckCircle2 size={16} aria-hidden="true" />
                ) : (
                  <AlertCircle size={16} aria-hidden="true" />
                )}
                <div>
                  <div>{cleanupResult.message}</div>
                  {cleanupResult.data && (
                    <div>
                      Đã xóa: <strong>{cleanupResult.data.count}</strong> sản phẩm
                      {cleanupResult.data.deleted_product_ids.length > 0 && (
                        <> (ID: {cleanupResult.data.deleted_product_ids.join(', ')})</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>
      </section>

      {/* Khu vực 2: Quản lý Lịch Ngày hội Sale (sale_router) */}
      <section className={styles.section} aria-labelledby="sale-calendar-heading">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="sale-calendar-heading" className={styles.sectionTitle}>
              Quản lý Lịch Ngày hội Sale
            </h2>
            <p className={styles.sectionSubtitle}>
              Tạo, chỉnh sửa, bật/tắt, xóa sự kiện sale và kích hoạt gửi cảnh báo trước 48 giờ cho người dùng.
            </p>
          </div>
          <div className={styles.toolbar}>
            <div className={styles.filterGroup} role="group" aria-label="Bộ lọc sự kiện sale">
              <button
                type="button"
                className={`${styles.filterBtn} ${!activeOnly ? styles.filterBtnActive : ''}`}
                aria-pressed={!activeOnly}
                onClick={() => setActiveOnly(false)}
              >
                Tất cả sự kiện
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${activeOnly ? styles.filterBtnActive : ''}`}
                aria-pressed={activeOnly}
                onClick={() => setActiveOnly(true)}
              >
                Đang kích hoạt
              </button>
            </div>
            <PendingButton
              type="button"
              className={styles.primaryBtn}
              pending={triggeringAlerts}
              pendingLabel="Đang gửi cảnh báo..."
              onClick={() => void handleTriggerAlerts()}
            >
              <BellRing size={15} aria-hidden="true" />
              <span>Kích hoạt cảnh báo 48h ngay</span>
            </PendingButton>
          </div>
        </div>

        {triggerAlertFeedback && (
          <div
            className={`${styles.feedbackBox} ${
              triggerAlertFeedback.kind === 'success' ? styles.feedbackSuccess : styles.feedbackError
            }`}
            style={{ marginBottom: '16px' }}
            role={triggerAlertFeedback.kind === 'error' ? 'alert' : 'status'}
          >
            {triggerAlertFeedback.kind === 'success' ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} aria-hidden="true" />
            )}
            <span>{triggerAlertFeedback.text}</span>
          </div>
        )}

        <div className={styles.salesLayout}>
          {/* Form tạo/sửa sự kiện sale */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrap}>
                <span className={styles.cardIcon}>
                  <Calendar size={18} aria-hidden="true" />
                </span>
                <h3 className={styles.cardTitle}>
                  {editingSaleId !== null ? 'Chỉnh sửa sự kiện sale' : 'Tạo lịch ngày hội sale mới'}
                </h3>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSaleFormSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="sale-name" className={styles.label}>
                  Tên sự kiện sale
                </label>
                <input
                  id="sale-name"
                  type="text"
                  className={styles.input}
                  placeholder="Ví dụ: 11.11 Mega Sale"
                  value={saleForm.name}
                  disabled={savingSale}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="sale-marketplace" className={styles.label}>
                  Sàn thương mại điện tử
                </label>
                <select
                  id="sale-marketplace"
                  className={styles.select}
                  value={saleForm.marketplace}
                  disabled={savingSale}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, marketplace: e.target.value }))}
                >
                  <option value="">Tất cả sàn</option>
                  <option value="amazon">Amazon</option>
                  <option value="shopee">Shopee</option>
                  <option value="tiktok">TikTok Shop</option>
                </select>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label htmlFor="sale-start-at" className={styles.label}>
                    Thời gian bắt đầu
                  </label>
                  <input
                    id="sale-start-at"
                    type="datetime-local"
                    className={styles.input}
                    value={saleForm.startAt}
                    disabled={savingSale}
                    onChange={(e) => setSaleForm((prev) => ({ ...prev, startAt: e.target.value }))}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="sale-end-at" className={styles.label}>
                    Thời gian kết thúc
                  </label>
                  <input
                    id="sale-end-at"
                    type="datetime-local"
                    className={styles.input}
                    value={saleForm.endAt}
                    disabled={savingSale}
                    onChange={(e) => setSaleForm((prev) => ({ ...prev, endAt: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="sale-description" className={styles.label}>
                  Mô tả sự kiện
                </label>
                <textarea
                  id="sale-description"
                  className={styles.textarea}
                  placeholder="Ghi chú nội dung khuyến mãi..."
                  value={saleForm.description}
                  disabled={savingSale}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={saleForm.isActive}
                  disabled={savingSale}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <span>Kích hoạt sự kiện ngay</span>
              </label>

              {saleFormError && (
                <div className={`${styles.feedbackBox} ${styles.feedbackError}`} role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{saleFormError}</span>
                </div>
              )}

              <div className={styles.buttonRow}>
                <PendingButton
                  type="submit"
                  className={styles.primaryBtn}
                  pending={savingSale}
                  pendingLabel={editingSaleId !== null ? 'Đang cập nhật...' : 'Đang tạo...'}
                >
                  {editingSaleId !== null ? 'Lưu cập nhật' : 'Tạo sự kiện'}
                </PendingButton>
                {editingSaleId !== null && (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={savingSale}
                    onClick={resetSaleForm}
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
            </form>
          </article>

          {/* Danh sách sự kiện sale */}
          <article className={styles.card} aria-busy={loadingSales}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrap}>
                <h3 className={styles.cardTitle}>
                  Danh sách sự kiện sale ({sales.length})
                </h3>
              </div>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={loadingSales}
                onClick={() => void loadSales(activeOnly)}
              >
                <RotateCw size={14} aria-hidden="true" />
                <span>Tải lại</span>
              </button>
            </div>

            {salesError && (
              <div className={`${styles.feedbackBox} ${styles.feedbackError}`} role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{salesError}</span>
              </div>
            )}

            {loadingSales && sales.length === 0 ? (
              <SectionLoadingState message="Đang tải danh sách sự kiện sale..." />
            ) : sales.length === 0 ? (
              <div className={styles.emptyState}>
                <Calendar size={32} aria-hidden="true" />
                <h3>Chưa có sự kiện sale nào</h3>
                <p>Hãy tạo sự kiện ngày hội sale ở biểu mẫu bên cạnh để bắt đầu nhắc lịch người dùng.</p>
              </div>
            ) : (
              <ul className={styles.saleList}>
                {sales.map((sale) => (
                  <li key={sale.id} className={styles.saleItem}>
                    <div className={styles.saleItemHeader}>
                      <div className={styles.saleTitleRow}>
                        <h4 className={styles.saleTitle}>{sale.name}</h4>
                        <span className={styles.marketplaceBadge}>
                          {formatMarketplace(sale.marketplace)}
                        </span>
                      </div>
                      <span
                        className={`${styles.statusPill} ${
                          sale.is_active ? styles.statusSuccess : styles.statusNeutral
                        }`}
                      >
                        {sale.is_active ? 'Đang bật' : 'Đã tắt'}
                      </span>
                    </div>

                    {sale.description && (
                      <p className={styles.saleDescription}>{sale.description}</p>
                    )}

                    <div className={styles.saleMeta}>
                      <span>Bắt đầu: {formatDateTime(sale.start_at)}</span>
                      <span>Kết thúc: {formatDateTime(sale.end_at)}</span>
                    </div>

                    <div className={styles.saleActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={togglingSaleId === sale.id}
                        onClick={() => void handleToggleSaleActive(sale)}
                      >
                        {togglingSaleId === sale.id
                          ? 'Đang lưu...'
                          : sale.is_active
                            ? 'Tạm tắt'
                            : 'Kích hoạt'}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => handleStartEditSale(sale)}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => setDeletingSale(sale)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      <ConfirmDialog
        isOpen={deletingSale !== null}
        title="Xóa sự kiện sale?"
        description={
          deletingSale
            ? `Bạn có chắc chắn muốn xóa sự kiện "${deletingSale.name}" không? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmLabel={isDeletingSale ? 'Đang xóa...' : 'Xóa sự kiện'}
        danger
        onConfirm={() => void handleConfirmDeleteSale()}
        onClose={() => {
          if (!isDeletingSale) setDeletingSale(null);
        }}
      />
    </div>
  );
};

export default AdminPage;
