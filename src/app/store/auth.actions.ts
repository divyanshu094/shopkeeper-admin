import { createAction, props } from '@ngrx/store';
import { AdminUser } from '../models/admin.models';

export const adminLogin = createAction(
  '[Admin Auth] Login',
  props<{ email: string; password: string }>(),
);
export const adminLoginSuccess = createAction(
  '[Admin Auth] Login Success',
  props<{ token: string; user: AdminUser }>(),
);
export const adminLoginFailure = createAction(
  '[Admin Auth] Login Failure',
  props<{ error: string }>(),
);
export const adminLogout = createAction('[Admin Auth] Logout');
export const clearAdminAuthError = createAction('[Admin Auth] Clear Error');

export const requestAdminPasswordReset = createAction(
  '[Admin Auth] Request Password Reset',
  props<{ email: string }>(),
);
export const requestAdminPasswordResetSuccess = createAction(
  '[Admin Auth] Request Password Reset Success',
  props<{ message: string; resetLink?: string }>(),
);
export const requestAdminPasswordResetFailure = createAction(
  '[Admin Auth] Request Password Reset Failure',
  props<{ error: string }>(),
);
export const resetAdminPassword = createAction(
  '[Admin Auth] Reset Password',
  props<{ token: string; password: string }>(),
);
export const resetAdminPasswordSuccess = createAction('[Admin Auth] Reset Password Success');
export const resetAdminPasswordFailure = createAction(
  '[Admin Auth] Reset Password Failure',
  props<{ error: string }>(),
);