import api from './api';
import { cachedRequest, invalidateCachedRequest } from './requestCache';

export interface CurrentSession {
  permissions?: string[];
}

export const getCurrentSession = () =>
  cachedRequest('auth/me', () => api.get<unknown, CurrentSession>('/auth/me'), 60_000);

export const invalidateCurrentSession = () => invalidateCachedRequest('auth/me');
