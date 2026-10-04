import apiClient from './config';

/**
 * Các Interface / Type dùng chung
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  is_activate: boolean;
  is_developer: boolean;
}

export interface OTPVerifyData {
  verified_token: string;
}

// Các lý do gửi OTP (Đăng ký / Quên mật khẩu)
export type OTPReason = 'verify-email' | 'reset-password';

// -------------------------------------------------------------
// 1. NHÓM ĐĂNG NHẬP / ĐĂNG KÝ MẶC ĐỊNH & GOOGLE
// -------------------------------------------------------------

/**
 * Đăng nhập bằng Email & Mật khẩu
 * Backend dùng OAuth2PasswordRequestForm -> Bắt buộc gửi dạng x-www-form-urlencoded
 */
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  return await apiClient.post<any, LoginResponse>('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

/**
 * Đăng nhập / Đăng ký bằng Google (Gửi token id từ frontend qua backend)
 */
export const loginWithGoogle = async (idToken: string): Promise<LoginResponse> => {
  return await apiClient.post<any, LoginResponse>('/auth/google', {
    id_token: idToken,
  });
};

// -------------------------------------------------------------
// 2. NHÓM XÁC THỰC OTP (Dùng cho cả Đăng ký và Quên mật khẩu)
// -------------------------------------------------------------

/**
 * Gửi mã OTP đến email
 */
export const sendOTP = async (email: string, reason: OTPReason): Promise<ApiResponse<null>> => {
  return await apiClient.post<any, ApiResponse<null>>('/otp/send', {
    email,
    reason,
  });
};

/**
 * Xác nhận mã OTP do người dùng nhập vào
 * Trả về `verified_token` để dùng cho bước tiếp theo (đăng ký / reset password)
 */
export const verifyOTP = async (
  email: string, 
  otp: string, 
  reason: OTPReason
): Promise<ApiResponse<OTPVerifyData>> => {
  return await apiClient.post<any, ApiResponse<OTPVerifyData>>('/otp/verify', {
    email,
    otp,
    reason,
  });
};

// -------------------------------------------------------------
// 3. NHÓM HOÀN TẤT ĐĂNG KÝ / ĐẶT LẠI MẬT KHẨU (Yêu cầu verified_token)
// -------------------------------------------------------------

/**
 * Đăng ký tài khoản (Cần mã verified_token từ bước verifyOTP)
 */
export const registerUser = async (
  userData: { email: string; nickname: string; password: string },
  verifyToken: string
): Promise<ApiResponse<UserResponse>> => {
  return await apiClient.post<any, ApiResponse<UserResponse>>('/auth/register', {
    ...userData,
    verify_token: verifyToken,
  });
};

/**
 * Đặt lại mật khẩu (Cần mã verified_token từ bước verifyOTP)
 */
export const resetPassword = async (
  email: string,
  newPassword: string,
  verifyToken: string
): Promise<ApiResponse<null>> => {
  return await apiClient.post<any, ApiResponse<null>>('/auth/reset-password', {
    email,
    new_password: newPassword,
    verify_token: verifyToken,
  });
};
