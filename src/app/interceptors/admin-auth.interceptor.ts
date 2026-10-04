import { HttpInterceptorFn } from '@angular/common/http';
import { ADMIN_API_ENDPOINTS, ADMIN_STORAGE_KEYS } from '../constants/app.constants';

export const adminAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem(ADMIN_STORAGE_KEYS.accessToken);
  if (!token || request.url.endsWith(`/${ADMIN_API_ENDPOINTS.login}`)) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};