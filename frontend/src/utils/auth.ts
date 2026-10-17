/**
 * Tiện ích kiểm tra và xử lý token xác thực
 */

export interface JwtPayload {
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Kiểm tra xem token có hợp lệ về mặt định dạng và còn hạn sử dụng hay không
 */
export const isTokenValid = (token: string | null | undefined): boolean => {
  if (!token) return false;
  if (token === 'undefined' || token === 'null' || token.trim() === '') return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode phần payload của JWT (Base64Url -> Base64 -> string)
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload: JwtPayload = JSON.parse(jsonPayload);

    // Kiểm tra thời gian hết hạn (exp tính bằng giây)
    if (typeof payload.exp === 'number') {
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime >= payload.exp) {
        return false; // Token đã hết hạn
      }
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Dọn dẹp toàn bộ dữ liệu xác thực lưu trữ ở client
 */
export const clearAuthStorage = (): void => {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
  } catch (err) {
    console.error('Không thể xóa dữ liệu xác thực khỏi localStorage:', err);
  }
};

