import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap, tap } from 'rxjs';
import { AdminApiService } from '../services/admin-api.service';
import { AdminLoginResponse, AdminSection } from '../models/admin.models';
import { ADMIN_API_ENDPOINTS, ADMIN_APP_TEXT, ADMIN_CONFIG, ADMIN_STORAGE_KEYS } from '../constants/app.constants';
import * as AuthActions from './auth.actions';
import * as AdminActions from './admin.actions';

@Injectable()
export class AdminEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(AdminApiService);

  login$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.adminLogin),
    exhaustMap(({ email, password }) => this.api.post<AdminLoginResponse>(ADMIN_API_ENDPOINTS.login, { email, password }).pipe(
      map((response) => response?.success && response.token && response.user?.isAdmin
        ? AuthActions.adminLoginSuccess({ token: response.token, user: response.user })
        : AuthActions.adminLoginFailure({ error: ADMIN_APP_TEXT.messages.accountAccessRequired })),
      catchError((error) => of(AuthActions.adminLoginFailure({
        error: error?.error?.message || ADMIN_APP_TEXT.messages.unableSignIn,
      }))),
    )),
  ));

  persistLogin$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.adminLoginSuccess),
    tap(({ token, user }) => {
      localStorage.setItem(ADMIN_STORAGE_KEYS.accessToken, token);
      localStorage.setItem(ADMIN_STORAGE_KEYS.user, JSON.stringify(user));
    }),
  ), { dispatch: false });

  clearSession$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.adminLogout),
    tap(() => {
      localStorage.removeItem(ADMIN_STORAGE_KEYS.accessToken);
      localStorage.removeItem(ADMIN_STORAGE_KEYS.user);
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
        error: error?.error?.message || ADMIN_APP_TEXT.messages.unableLoadSection.replace('{{section}}', section),
      }))),
    )),
  ));

  requestAdminPasswordReset$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.requestAdminPasswordReset),
    exhaustMap(({ email }) => this.api.post<any>(ADMIN_API_ENDPOINTS.forgotPassword, { email }).pipe(
      map((response) => AuthActions.requestAdminPasswordResetSuccess({
        message: response?.message || ADMIN_APP_TEXT.recovery.requestFallback,
        resetLink: response?.resetLink,
      })),
      catchError((error) => of(AuthActions.requestAdminPasswordResetFailure({
        error: error?.error?.message || ADMIN_APP_TEXT.messages.unableRequestReset,
      }))),
    )),
  ));

  resetAdminPassword$ = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.resetAdminPassword),
    exhaustMap(({ token, password }) => this.api.post<any>(ADMIN_API_ENDPOINTS.resetPassword, { token, password }).pipe(
      map(() => AuthActions.resetAdminPasswordSuccess()),
      catchError((error) => of(AuthActions.resetAdminPasswordFailure({
        error: error?.error?.message || ADMIN_APP_TEXT.messages.invalidResetLink,
      }))),
    )),
  ));

  private pathFor(section: AdminSection): string {
    const paths: Record<AdminSection, string> = {
      overview: ADMIN_API_ENDPOINTS.section.overview(ADMIN_CONFIG.defaultAnalyticsPeriod),
      orders: ADMIN_API_ENDPOINTS.section.orders(ADMIN_CONFIG.defaultPage, ADMIN_CONFIG.defaultPageSize),
      products: ADMIN_API_ENDPOINTS.section.products(ADMIN_CONFIG.defaultPage, ADMIN_CONFIG.defaultPageSize),
      categories: ADMIN_API_ENDPOINTS.section.categories,
      customers: ADMIN_API_ENDPOINTS.section.customers(ADMIN_CONFIG.defaultPage, ADMIN_CONFIG.defaultPageSize),
      delivery: ADMIN_API_ENDPOINTS.section.delivery,
      payments: ADMIN_API_ENDPOINTS.section.payments(ADMIN_CONFIG.defaultPage, ADMIN_CONFIG.defaultPageSize),
    };
    return paths[section];
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