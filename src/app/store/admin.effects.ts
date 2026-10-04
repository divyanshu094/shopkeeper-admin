import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap, tap } from 'rxjs';
import { AdminApiService } from '../services/admin-api.service';
import { AdminLoginResponse } from '../models/admin.models';
import * as AuthActions from './auth.actions';
import * as AdminActions from './admin.actions';

@Injectable()
export class AdminEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(AdminApiService);

  login$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.adminLogin),
    exhaustMap(({ email, password }) => this.api.post<AdminLoginResponse>('admin/login', { email, password }).pipe(
      map((response) => response?.success && response.token && response.user?.isAdmin
        ? AuthActions.adminLoginSuccess({ token: response.token, user: response.user })
        : AuthActions.adminLoginFailure({ error: 'This account does not have administrator access.' })),
      catchError((error) => of(AuthActions.adminLoginFailure({
        error: error?.error?.message || 'Unable to sign in. Check the administrator credentials.',
      }))),
    )),
  ));

  persistLogin$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.adminLoginSuccess),
    tap(({ token, user }) => {
      localStorage.setItem('shopkeeperAdminToken', token);
      localStorage.setItem('shopkeeperAdminUser', JSON.stringify(user));
    }),
  ), { dispatch: false });

  clearSession$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.adminLogout),
    tap(() => {
      localStorage.removeItem('shopkeeperAdminToken');
      localStorage.removeItem('shopkeeperAdminUser');
    }),
  ), { dispatch: false });

  loadOverviewAfterLogin$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.adminLoginSuccess),
    map(() => AdminActions.loadAdminSection({ section: 'overview' })),
  ));

  loadSection$ = createEffect(() => this.actions$.pipe(
    ofType(AdminActions.loadAdminSection),
    switchMap(({ section }) => this.api.get<any>(this.pathFor(section)).pipe(
      map((response) => AdminActions.loadAdminSectionSuccess({
        section,
        data: this.dataFor(section, response),
      })),
      catchError((error) => of(AdminActions.loadAdminSectionFailure({
        error: error?.error?.message || `Unable to load ${section}.`,
      }))),
    )),
  ));

  requestAdminPasswordReset$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.requestAdminPasswordReset),
    exhaustMap(({ email }) => this.api.post<any>('auth/forgot-password', { email }).pipe(
      map((response) => AuthActions.requestAdminPasswordResetSuccess({
        message: response?.message || 'If an account exists, a reset link has been sent.',
        resetLink: response?.resetLink,
      })),
      catchError((error) => of(AuthActions.requestAdminPasswordResetFailure({
        error: error?.error?.message || 'Unable to request a password reset.',
      }))),
    )),
  ));

  resetAdminPassword$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.resetAdminPassword),
    exhaustMap(({ token, password }) => this.api.post<any>('auth/reset-password', { token, password }).pipe(
      map(() => AuthActions.resetAdminPasswordSuccess()),
      catchError((error) => of(AuthActions.resetAdminPasswordFailure({
        error: error?.error?.message || 'This reset link is invalid or expired.',
      }))),
    )),
  ));

  private pathFor(section: string): string {
    const paths: Record<string, string> = {
      overview: 'admin/analytics?period=30d',
      orders: 'admin/orders?page=1&limit=100',
      products: 'admin/products?page=1&limit=100',
      categories: 'admin/categories',
      customers: 'admin/users?page=1&limit=100',
      delivery: 'admin/delivery-agents',
      payments: 'payments/admin/transactions?page=1&limit=100',
    };
    return paths[section] || paths['overview'];
  }

  private dataFor(section: string, response: any): unknown {
    if (section === 'overview') return response;
    const responseFields: Record<string, string> = {
      orders: 'orders',
      products: 'products',
      categories: 'categories',
      customers: 'users',
      delivery: 'deliveryAgents',
      payments: 'transactions',
    };
    return response?.[responseFields[section]] ?? [];
  }
}