import { HttpInterceptorFn } from '@angular/common/http';

export const adminAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('shopkeeperAdminToken');
  if (!token || request.url.endsWith('/admin/login')) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};