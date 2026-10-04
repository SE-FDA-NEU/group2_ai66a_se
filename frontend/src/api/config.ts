import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

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
    // Nếu API trả về thành công, lấy luôn phần dữ liệu (data) bên trong
    return response.data;
  },
  (error: AxiosError) => {
    // Nếu API trả về lỗi 401 (Hết hạn token hoặc chưa đăng nhập)
    if (error.response && error.response.status === 401) {
      // Bạn có thể xử lý đăng xuất ở đây (ví dụ: xoá token và chuyển về trang chủ)
      console.warn("Unauthorized! Token hết hạn hoặc không hợp lệ.");
      localStorage.removeItem('access_token');
      // window.location.href = "/";
    }
    
    // Trả lỗi về để nơi gọi API (ví dụ: form đăng nhập) xử lý tiếp
    return Promise.reject((error.response?.data as Record<string, unknown>) || error.message);
  }
);

export default apiClient;

