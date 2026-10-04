import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateNickname, changePassword } from '../api/userApi';
import styles from './ProfilePage.module.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  // User state
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [authProvider, setAuthProvider] = useState('');

  // Form states
  const [editNickname, setEditNickname] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status states
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await getUserProfile();
      if (res.data) {
        setEmail(res.data.email);
        setNickname(res.data.nickname);
        setEditNickname(res.data.nickname);
        // If auth_provider exists in the future response, it can be set here.
      }
    } catch (err: any) {
      console.error('Failed to fetch profile', err);
      // Assuming 401 Unauthorized if token is invalid
      if (err === 'Unauthorized' || err?.detail?.includes('Expired')) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNickname.trim()) {
      setProfileMsg({ type: 'error', text: 'Tên hiển thị không được để trống.' });
      return;
    }

    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await updateNickname(editNickname);
      if (res.data) {
        setNickname(res.data.nickname);
        setProfileMsg({ type: 'success', text: 'Cập nhật tên hiển thị thành công.' });
        
        // Cập nhật lại Sidebar nếu cần
        localStorage.setItem('user_email', res.data.email); 
        window.dispatchEvent(new Event('storage')); // trigger update for other components
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.message || err?.detail || 'Lỗi cập nhật hồ sơ.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng điền đầy đủ các trường.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Xác nhận mật khẩu không khớp.' });
      return;
    }

    setIsSavingPassword(true);
    setPasswordMsg(null);
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err?.message || err?.detail || 'Mật khẩu cũ không đúng hoặc có lỗi xảy ra.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    const confirm = window.confirm('Bạn có chắc chắn muốn xóa tài khoản này không? Mọi dữ liệu sẽ bị xóa vĩnh viễn.');
    if (confirm) {
      alert('Chức năng xóa tài khoản đang được phát triển.');
    }
  };

  if (isLoading) {
    return <div className={styles.pageContainer}>Đang tải dữ liệu...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Cài đặt tài khoản</h1>

      {/* Cập nhật thông tin cá nhân */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Hồ sơ cá nhân</h2>
        </div>
        
        {profileMsg && (
          <div className={`${styles.alertBanner} ${profileMsg.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
            {profileMsg.type === 'success' ? '✓ ' : '⚠️ '}{profileMsg.text}
          </div>
        )}

        <form onSubmit={handleUpdateProfile}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email đăng nhập</label>
            <input 
              type="email" 
              className={styles.input} 
              value={email} 
              disabled 
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
            <span className={styles.infoText}>Email không thể thay đổi.</span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="nickname" className={styles.label}>Tên hiển thị</label>
            <input 
              id="nickname"
              type="text" 
              className={styles.input} 
              value={editNickname} 
              onChange={(e) => setEditNickname(e.target.value)}
              placeholder="Nhập tên hiển thị"
            />
          </div>

          <div className={styles.buttonRow}>
            <button 
              type="button" 
              className={styles.btnOutline}
              onClick={() => setEditNickname(nickname)}
              disabled={editNickname === nickname}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className={styles.btnPrimary}
              disabled={isSavingProfile || editNickname === nickname || !editNickname.trim()}
            >
              {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>

      {/* Đổi mật khẩu */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Đổi mật khẩu</h2>
        </div>

        {passwordMsg && (
          <div className={`${styles.alertBanner} ${passwordMsg.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
            {passwordMsg.type === 'success' ? '✓ ' : '⚠️ '}{passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className={styles.formGroup}>
            <label htmlFor="oldPassword" className={styles.label}>Mật khẩu hiện tại</label>
            <input 
              id="oldPassword"
              type="password" 
              className={styles.input} 
              value={oldPassword} 
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
              value={newPassword} 
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
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          <div className={styles.buttonRow}>
            <button 
              type="submit" 
              className={styles.btnPrimary}
              disabled={isSavingPassword || !oldPassword || !newPassword || !confirmPassword}
            >
              {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </section>

      {/* Phiên đăng nhập */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Phiên đăng nhập</h2>
        </div>
        <p className={styles.infoText} style={{ marginBottom: '1.5rem' }}>
          Đăng xuất khỏi thiết bị hiện tại. Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Trakora.
        </p>
        <button type="button" className={styles.btnOutline} onClick={handleLogout}>
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
        <button type="button" className={styles.btnDanger} onClick={handleDeleteAccount}>
          Xóa tài khoản vĩnh viễn
        </button>
      </section>
    </div>
  );
};

export default ProfilePage;
