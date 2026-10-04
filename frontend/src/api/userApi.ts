import apiClient from './config';
import { ApiResponse, UserResponse } from './authApi';

export const getUserProfile = async (): Promise<ApiResponse<UserResponse>> => {
  return await apiClient.get<any, ApiResponse<UserResponse>>('/user/me');
};
