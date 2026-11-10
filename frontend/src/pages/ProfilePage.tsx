import { SectionLoadingState, PendingButton } from '../components/LoadingState';
import React, { useEffect, useState, useRef } from 'react';
import { showToast } from '../utils/toast';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateNickname, changePassword } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import styles from './ProfilePage.module.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, logout } = useAuth();

  // User state
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [authProvider, setAuthProvider] = useState('email');

  // Form states
  const [editNickname, setEditNickname] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);


  useEffect(() => {
    void fetchProfile();
    return () => { requestId.current++; };
  }, []);

  const fetchProfile = async () => {
    const version = ++requestId.current;
    setLoadError(false);
    setIsLoading(true);
    try {
      const res = await getUserProfile();
      if (version !== requestId.current) return;
      if (!res.data) throw new Error('Missing profile');
      if (res.data) {
        setEmail(res.data.email);
        setNickname(res.data.nickname);
        setEditNickname(res.data.nickname);
        setAuthProvider(res.data.auth_provider || 'email');
      }
    } catch (err: any) {
      if (version !== requestId.current) return;
      setLoadError(true);
      console.error('Failed to fetch profile', err);
      if (err.status === 401 || err?.error_code === 'UNAUTHORIZED' || err === 'Unauthorized') {
        navigate('/login', { replace: true });
        return;
      }
    } finally {
      if (version === requestId.current) setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    if (!editNickname.trim()) {
      showToast('error', 'Tên hiển thị không được để trống.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateNickname(editNickname);
      if (res.data) {
        setNickname(res.data.nickname);
        setUser(res.data);

      }
    } catch (err: any) {
      console.error('Không thể cập nhật tài khoản:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPassword) return;
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('error', 'Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (newPassword.length < 8) {
      showToast('error', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Xác nhận mật khẩu không khớp.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Không thể cập nhật tài khoản:', err);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    showToast('success', 'Đã đăng xuất tài khoản.');
    navigate('/login');
  };

  const handleDeleted = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <SectionLoadingState message="Đang tải thông tin tài khoản..." />
      </div>
    );
  }

  if (loadError) return <div className={styles.pageContainer} role="alert"><h1>Không tải được hồ sơ</h1><p>Vui lòng kiểm tra kết nối và thử lại.</p><button className={styles.btnPrimary} onClick={() => void fetchProfile()}>Thử lại</button></div>;

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Cài đặt tài khoản</h1>

      {/* Cập nhật thông tin cá nhân */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Hồ sơ cá nhân</h2>
        </div>
        

        <form onSubmit={handleUpdateProfile}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email đăng nhập</label>
            <input 
              type="email" 
              className={`${styles.input} ${styles.inputDisabled}`} 
              value={email} 
              disabled 
            />
            <span className={styles.infoText}>Email không thể thay đổi.</span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="nickname" className={styles.label}>Tên hiển thị</label>
            <input 
              id="nickname"
              type="text" 
              className={styles.input} 
              disabled={isSavingProfile} value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
              placeholder="Nhập tên hiển thị"
            />
          </div>

          <div className={styles.buttonRow}>
            <button 
              type="button" 
              className={styles.btnOutline}
              onClick={() => setEditNickname(nickname)}
              disabled={isSavingProfile || editNickname === nickname}
            >
              Hủy
            </button>
            <PendingButton pending={isSavingProfile} pendingLabel="Đang lưu hồ sơ..."
              type="submit" 
              className={styles.btnPrimary}
              disabled={isSavingProfile || editNickname === nickname || !editNickname.trim()}
            >
              Lưu thay đổi
            </PendingButton>
          </div>
        </form>
      </section>

      {/* Đổi mật khẩu */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Đổi mật khẩu</h2>
        </div>


        <form onSubmit={handleChangePassword}>
          <div className={styles.formGroup}>
            <label htmlFor="oldPassword" className={styles.label}>Mật khẩu hiện tại</label>
            <input 
              id="oldPassword"
              type="password" 
              className={styles.input} 
              disabled={isSavingPassword} value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newPassword" className={styles.label}>Mật khẩu mới</label>
            <input 
              id="newPassword"
              type="password" 
              className={styles.input} 
              disabled={isSavingPassword} value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Xác nhận mật khẩu mới</label>
            <input 
              id="confirmPassword"
              type="password" 
              className={styles.input} 
              disabled={isSavingPassword} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          <div className={styles.buttonRow}>
            <PendingButton pending={isSavingPassword} pendingLabel="Đang cập nhật mật khẩu..."
              type="submit" 
              className={styles.btnPrimary}
              disabled={isSavingPassword || !oldPassword || !newPassword || !confirmPassword}
            >
              Cập nhật mật khẩu
            </PendingButton>
          </div>
        </form>
      </section>

      {/* Phiên đăng nhập */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Phiên đăng nhập</h2>
        </div>
        <p className={styles.sessionDesc}>
          Đăng xuất khỏi thiết bị hiện tại. Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Trakora.
        </p>
        <button type="button" className={styles.btnOutline} onClick={() => setShowLogoutConfirm(true)}>
          Đăng xuất
        </button>
      </section>
      {/* Xóa tài khoản */}
      <section className={`${styles.section} ${styles.dangerZone}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Xóa tài khoản</h2>
        </div>
        <p className={styles.dangerDescription}>
          Khi bạn xóa tài khoản, mọi dữ liệu danh sách theo dõi và lịch sử của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục.
        </p>
        <button type="button" className={styles.btnDanger} onClick={() => setShowDeleteModal(true)}>
          Xóa tài khoản vĩnh viễn
        </button>
      </section>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Đăng xuất?"
        description="Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Trakora."
        confirmLabel="Đăng xuất"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        email={email}
        hasPassword={authProvider !== 'google'}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

export default ProfilePage;
