import { createAction, props } from '@ngrx/store';
import { AdminSection } from '../models/admin.models';

export const loadAdminSection = createAction(
  '[Admin] Load Section',
  props<{ section: AdminSection }>(),
);
export const loadAdminSectionSuccess = createAction(
  '[Admin] Load Section Success',
  props<{ section: AdminSection; data: unknown }>(),
);
export const loadAdminSectionFailure = createAction(
  '[Admin] Load Section Failure',
  props<{ error: string }>(),
);
export const clearAdminError = createAction('[Admin] Clear Error');