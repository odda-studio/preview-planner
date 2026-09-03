import { PLATFORM_ID, InjectionToken, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Injection token for the window object. This provides a way to safely access
 * the window object in Angular applications, especially those using server-side
 * rendering (SSR).
 *
 * In browser environments, this will provide the actual window object.
 * In server environments, this will provide a mock object to prevent errors.
 */
export const WINDOW = new InjectionToken<Window | object>('Window object token', {
  factory: () => {
    const platformId = inject(PLATFORM_ID);

    if (isPlatformBrowser(platformId)) {
      return window;
    }

    // Return a mock object for server-side rendering
    return {
      innerWidth: 1024,
      innerHeight: 768,
      document: {
        documentElement: {
          clientWidth: 1024,
          clientHeight: 768
        }
      }
    };
  }
});
