import { AdminAuthState } from './auth.reducer';
import { AdminDataState } from './admin.reducer';

export interface AdminAppState {
  auth: AdminAuthState;
  data: AdminDataState;
}