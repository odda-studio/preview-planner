import {
  ApplicationConfig,
  inject,
  mergeApplicationConfig,
  PLATFORM_ID,
  provideBrowserGlobalErrorListeners, REQUEST
} from '@angular/core';
import {provideRouter, Router} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {HttpHandlerFn, HttpRequest, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {plannerAppConfig} from 'odda-planner'
import {provideAnimations} from '@angular/platform-browser/animations';
import {isPlatformBrowser, isPlatformServer} from '@angular/common';
import {environment} from '../environments/environment';
import {LayoutService, PREVENT_SPINNER} from 'core-library';
import {catchError, finalize, throwError} from 'rxjs';

export const appConfig: ApplicationConfig = mergeApplicationConfig(plannerAppConfig, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([
      // Spinner interceptor (must be first to track all requests)
      (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
        const layoutService = inject(LayoutService);
        const platform = inject(PLATFORM_ID);
        const router = inject(Router);
        const preventSpinner = req.context.get(PREVENT_SPINNER);

        // Only show spinner on browser
        if (isPlatformBrowser(platform)) {
          // @ts-ignore
          if(!(req.body?.sorting || req.body?.filters) && !preventSpinner) {
            layoutService.showSpinner();
          }

          return next(req).pipe(
            catchError((er) => {
              layoutService.hideSpinner();
              return throwError(() => {
                if(er.status === 401)
                  router.navigate(['/auth/login']);
                return er;
              })
            }),
            finalize(() => {
              if(!preventSpinner)
                layoutService.hideSpinner();
            })
          );
        }

        return next(req).pipe(
          catchError((er) => throwError(() => {
            if(er.status === 401)
              router.navigate(['/auth/login']);
            return er;
          }))
        );
      },
      // Base path and credentials interceptor
      (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
        const platform = inject(PLATFORM_ID);
        const request = inject<any>(REQUEST);
        req = req.clone({
          url: req.url.startsWith("http") ? req.url : environment.basePath + req.url,
          setHeaders: {
            'X-App': 'Planner'
          }
        })
        if(isPlatformServer(platform)) {
          console.log(request);
          const cookie = request?.headers?.['cookie'];

          if (cookie) {
            req = req.clone({
              headers: req.headers.set('Cookie', cookie)
            });
          }
          return next(req);
        }
        return next(req.clone({
          withCredentials: true
        }));
      }
    ])),
    provideAnimations()
  ]
});
