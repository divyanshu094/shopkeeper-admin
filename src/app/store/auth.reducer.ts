import { createReducer, on } from '@ngrx/store';
import { AdminUser } from '../models/admin.models';
import * as AuthActions from './auth.actions';

const readAdminUser = (): AdminUser | null => {
  try {
    return JSON.parse(localStorage.getItem('shopkeeperAdminUser') || 'null');
  } catch {
    return null;
  }
};

export interface AdminAuthState {
  token: string | null;
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  recoveryLoading: boolean;
  recoveryMessage: string | null;
  recoveryLink: string | null;
  passwordResetComplete: boolean;
}

export const initialAdminAuthState: AdminAuthState = {
  token: typeof localStorage === 'undefined' ? null : localStorage.getItem('shopkeeperAdminToken'),
  user: typeof localStorage === 'undefined' ? null : readAdminUser(),
  loading: false,
  error: null,
  recoveryLoading: false,
  recoveryMessage: null,
  recoveryLink: null,
  passwordResetComplete: false,
};

export const adminAuthReducer = createReducer(
  initialAdminAuthState,
  on(AuthActions.adminLogin, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.adminLoginSuccess, (state, { token, user }) => ({
    ...state,
    token,
    user,
    loading: false,
    error: null,
  })),
  on(AuthActions.adminLoginFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(AuthActions.clearAdminAuthError, (state) => ({ ...state, error: null })),
  on(AuthActions.requestAdminPasswordReset, (state) => ({
    ...state,
    recoveryLoading: true,
    recoveryMessage: null,
    recoveryLink: null,
    passwordResetComplete: false,
    error: null,
  })),
  on(AuthActions.requestAdminPasswordResetSuccess, (state, { message, resetLink }) => ({
    ...state,
    recoveryLoading: false,
    recoveryMessage: message,
    recoveryLink: resetLink || null,
    error: null,
  })),
  on(AuthActions.resetAdminPassword, (state) => ({
    ...state,
    recoveryLoading: true,
    recoveryMessage: null,
    recoveryLink: null,
    passwordResetComplete: false,
    error: null,
  })),
  on(AuthActions.resetAdminPasswordSuccess, (state) => ({
    ...state,
    recoveryLoading: false,
    recoveryMessage: 'Password updated. Sign in with your new password.',
    recoveryLink: null,
    passwordResetComplete: true,
    error: null,
  })),
  on(AuthActions.requestAdminPasswordResetFailure, AuthActions.resetAdminPasswordFailure, (state, { error }) => ({
    ...state,
    recoveryLoading: false,
    error,
  })),
  on(AuthActions.adminLogout, () => ({
    token: null,
    user: null,
    loading: false,
    error: null,
    recoveryLoading: false,
    recoveryMessage: null,
    recoveryLink: null,
    passwordResetComplete: false,
  })),
);