import apiClient from './config';
import { ApiResponse } from './authApi';

export type { SaleEvent, SaleEventPayload } from './notificationApi';
export {
  getSaleEvents,
  createSaleEvent,
  updateSaleEvent,
  deleteSaleEvent,
  triggerSaleAlerts,
} from './notificationApi';

export interface SystemInfoData {
  app_name: string;
  version: string;
  developer: string;
}

export interface CleanupExpiredData {
  deleted_product_ids: number[];
  count: number;
}

export const getSystemInfo = async (): Promise<ApiResponse<SystemInfoData>> => {
  return await apiClient.get<never, ApiResponse<SystemInfoData>>('/dev/system-info');
};

export const checkSystemHealth = async (): Promise<ApiResponse<null>> => {
  return await apiClient.get<never, ApiResponse<null>>('/dev/health');
};

export const setAdminByEmail = async (email: string): Promise<ApiResponse<null>> => {
  return await apiClient.patch<never, ApiResponse<null>>('/dev/set-admin', { email });
};

export const cleanupExpiredProducts = async (): Promise<ApiResponse<CleanupExpiredData>> => {
  return await apiClient.post<never, ApiResponse<CleanupExpiredData>>('/dev/cleanup-expired-products');
};
