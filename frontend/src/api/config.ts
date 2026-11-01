import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { clearAuthStorage } from '../utils/auth';
import { showToast } from '../utils/toast';

// Only user-initiated writes produce feedback; polling and seen acknowledgements stay silent.
const operationMessage = (method?: string, url = ''): string | null => {
  if (!method || ['get', 'head', 'options'].includes(method.toLowerCase()) || url.endsWith('/seen')) return null;
  if (url.includes('/password') || url.includes('/reset-password')) return 'Đã cập nhật mật khẩu.';
  if (url.includes('/auth/login') || url.includes('/auth/google')) return 'Đăng nhập thành công.';
  if (url.includes('/auth/register')) return 'Đăng ký tài khoản thành công.';
  if (url.includes('/otp/send')) return 'Đã gửi mã xác thực đến email của bạn.';
  if (url.includes('/otp/verify')) return 'Xác thực mã thành công.';
  if (url.includes('/user/me')) return 'Đã cập nhật hồ sơ cá nhân.';
  if (url.includes('/notifications/settings')) return 'Đã lưu cài đặt thông báo.';
  if (url.includes('/target-price')) return 'Đã lưu giá mục tiêu.';
  if (url.includes('/watchlist')) return method.toLowerCase() === 'delete' ? 'Đã ngừng theo dõi sản phẩm.' : 'Đã thêm sản phẩm vào danh sách theo dõi.';
  return 'Thao tác đã hoàn tất.';
};

// Khởi tạo một đối tượng axios với các cấu hình mặc định
const apiClient = axios.create({
  // URL gốc sẽ được lấy từ biến môi trường VITE_API_URL (ví dụ: http://localhost:8000/api/v1)
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Hủy request nếu quá 10 giây không có phản hồi
});

// Interceptor cho REQUEST (Gắn thêm token nếu có)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lấy token từ localStorage (nếu người dùng đã đăng nhập)
    const token = localStorage.getItem('access_token');
    
    // Nếu có token thì tự động gắn vào Header của mọi request
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor cho RESPONSE (Xử lý lỗi chung)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const message = operationMessage(response.config.method, response.config.url);
    if (message) showToast('success', message);
    // Nếu API trả về thành công, lấy luôn phần dữ liệu (data) bên trong
    return response.data;
  },
  (error: AxiosError) => {
    // Nếu API trả về lỗi 401 (Hết hạn token hoặc chưa đăng nhập)
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized! Phiên đăng nhập hết hạn hoặc không hợp lệ.');
      clearAuthStorage();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));

        const currentPath = window.location.pathname;
        const publicPaths = ['/login', '/register', '/otp', '/forgot-password', '/'];
        if (!publicPaths.includes(currentPath)) {
          window.location.replace('/login');
        }
      }
    }
    
    const errorData = (error.response?.data as Record<string, unknown>) || {};
    const backendError = errorData.error as Record<string, unknown> | undefined;
    const errorMessage =
      (backendError?.message as string) ||
      (errorData.detail as string) ||
      (errorData.message as string) ||
      error.message;

    if (operationMessage(error.config?.method, error.config?.url)) {
      const detail = typeof errorMessage === 'string' && /[À-ỹ]/.test(errorMessage)
        ? errorMessage : 'Thao tác chưa hoàn tất. Vui lòng kiểm tra thông tin và thử lại.';
      showToast('error', detail);
    }

    return Promise.reject({
      status: error.response?.status,
      ...errorData,
      detail: errorMessage,
      message: errorMessage,
    });
  }
);

export default apiClient;
