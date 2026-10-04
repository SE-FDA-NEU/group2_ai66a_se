import apiClient from './config';

/**
 * Interface mô tả dữ liệu trả về từ API Login
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

/**
 * Gọi API Đăng nhập (/auth/login)
 * Lưu ý: Backend FastAPI dùng OAuth2PasswordRequestForm nên phải gửi dữ liệu dưới dạng URLSearchParams
 */
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  // Vì `apiClient` đã được cấu hình interceptor trả về `response.data`, 
  // ta chỉ cần định kiểu trực tiếp cho hàm này.
  return await apiClient.post<any, LoginResponse>('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

/**
 * Gọi API Đăng ký bằng Google (/auth/google)
 */
export const loginWithGoogle = async (idToken: string): Promise<LoginResponse> => {
  return await apiClient.post<any, LoginResponse>('/auth/google', {
    id_token: idToken
  });
};

/**
 * Gửi mã OTP xác nhận email (/otp/send)
 */
export const sendVerifyEmailOTP = async (email: string) => {
  return await apiClient.post(`/otp/send?email=${email}&reason=verify-email`);
};
