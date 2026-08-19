import axios, { AxiosError } from 'axios';
import { message } from 'antd';
import { getStoredLocale } from '../i18n/translations';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
});

type ApiErrorPayload = { message?: string | string[] };

const statusFallback = (status?: number) => {
  const en = getStoredLocale() === 'en-US';
  if (status === 400) return en ? 'The submitted information is invalid. Please check and try again' : '提交信息有误，请检查后重试';
  if (status === 401) return en ? 'Incorrect account or password, or your session has expired' : '账号或密码错误，或登录已过期';
  if (status === 403) return en ? 'Your account does not have permission to perform this action' : '当前账号无权执行此操作';
  if (status === 404) return en ? 'The requested content does not exist or has been removed' : '请求的内容不存在或已被移除';
  if (status === 409) return en ? 'The data already exists or has changed. Refresh and try again' : '数据已存在或状态冲突，请刷新后重试';
  if (status === 413) return en ? 'The upload is too large. Reduce the file size and try again' : '上传内容过大，请减小文件后重试';
  if (status === 429) return en ? 'Too many requests. Please try again later' : '操作过于频繁，请稍后再试';
  if (status && status >= 500) return en ? 'The service is temporarily unavailable. Please try again later' : '服务暂时开小差，请稍后重试';
  return en ? 'The request failed. Please try again' : '请求未能完成，请稍后重试';
};

export const getApiErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return statusFallback();
  const axiosError = error as AxiosError<ApiErrorPayload>;
  if (axiosError.code === 'ECONNABORTED') return getStoredLocale() === 'en-US' ? 'The request timed out. Please check your network and try again' : '请求超时，请检查网络后重试';
  if (!axiosError.response) return getStoredLocale() === 'en-US' ? 'Unable to connect to the service. Check your network and try again' : '无法连接服务，请检查网络后重试';
  const status = axiosError.response.status;
  const raw = axiosError.response.data?.message;
  if (status >= 500) return statusFallback(status);
  if (Array.isArray(raw)) return raw.filter(Boolean).join('；') || statusFallback(status);
  return typeof raw === 'string' && raw.trim() && !/^internal server error$/i.test(raw.trim()) ? raw.trim() : statusFallback(status);
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mercivo_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const locale = getStoredLocale();
  config.headers['Accept-Language'] = locale;
  config.headers['X-Locale'] = locale;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data;
    return payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : payload;
  },
  (error: unknown) => {
    const axiosError = axios.isAxiosError(error) ? error : undefined;
    if (axiosError?.response?.status === 401 && location.pathname !== '/login') {
      localStorage.removeItem('mercivo_access_token');
      location.assign('/login');
    }
    message.error(getApiErrorMessage(error));
    return Promise.reject(error);
  },
);

export default api;
