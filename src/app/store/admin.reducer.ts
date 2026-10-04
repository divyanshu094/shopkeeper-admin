import { createReducer, on } from '@ngrx/store';
import {
  AdminCategory,
  AdminOrder,
  AdminProduct,
  AdminSection,
  AnalyticsSummary,
  DeliveryAgent,
  PaymentTransaction,
} from '../models/admin.models';
import * as AdminActions from './admin.actions';

export interface AdminDataState {
  overview: AnalyticsSummary | null;
  orders: AdminOrder[];
  products: AdminProduct[];
  categories: AdminCategory[];
  customers: Array<{ _id: string; name: string; email: string; phone?: string; createdAt?: string; isVerified?: boolean }>;
  deliveryAgents: DeliveryAgent[];
  payments: PaymentTransaction[];
  loading: boolean;
  loadingSection: AdminSection | null;
  error: string | null;
}

export const initialAdminDataState: AdminDataState = {
  overview: null,
  orders: [],
  products: [],
  categories: [],
  customers: [],
  deliveryAgents: [],
  payments: [],
  loading: false,
  loadingSection: null,
  error: null,
};

export const adminDataReducer = createReducer(
  initialAdminDataState,
  on(AdminActions.loadAdminSection, (state, { section }) => ({
    ...state,
    loading: true,
    loadingSection: section,
    error: null,
  })),
  on(AdminActions.loadAdminSectionSuccess, (state, { section, data }) => ({
    ...state,
    [section]: data,
    loading: false,
    loadingSection: null,
  })),
  on(AdminActions.loadAdminSectionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    loadingSection: null,
    error,
  })),
  on(AdminActions.clearAdminError, (state) => ({ ...state, error: null })),
);