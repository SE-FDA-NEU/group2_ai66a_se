import apiClient from './config';
import { ApiResponse, UserResponse } from './authApi';

export const getUserProfile = async (): Promise<ApiResponse<UserResponse>> => {
  return await apiClient.get<any, ApiResponse<UserResponse>>('/user/me');
};

export const updateNickname = async (nickname: string): Promise<ApiResponse<UserResponse>> => {
  return await apiClient.patch<any, ApiResponse<UserResponse>>('/user/me', { nickname });
};

export const changePassword = async (oldPassword: string, newPassword: string): Promise<ApiResponse<UserResponse>> => {
  return await apiClient.patch<any, ApiResponse<UserResponse>>('/user/me/password', { 
    old_password: oldPassword, 
    new_password: newPassword 
  });
};
