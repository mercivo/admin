import axios from 'axios';
import { message } from 'antd';
import { getStoredLocale } from '../i18n/translations';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
});

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
  (error) => {
    if (error.response?.status === 401 && location.pathname !== '/login') {
      localStorage.removeItem('mercivo_access_token');
      location.assign('/login');
    }
    const msg = error.response?.data?.message || (getStoredLocale() === 'en-US' ? 'Request failed' : '请求失败');
    message.error(msg);
    return Promise.reject(error);
  },
);

export default api;
