import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { routes } from './app.routes';
import { adminAuthInterceptor } from './interceptors/admin-auth.interceptor';
import { AdminEffects } from './store/admin.effects';
import { adminAuthReducer } from './store/auth.reducer';
import { adminDataReducer } from './store/admin.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([adminAuthInterceptor])),
    provideStore({ auth: adminAuthReducer, data: adminDataReducer }),
    provideEffects([AdminEffects]),
  ]
};
