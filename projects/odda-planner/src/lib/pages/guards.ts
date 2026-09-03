import {inject, PLATFORM_ID, REQUEST} from '@angular/core';
import {AuthenticationService} from '../services/authentication.service';
import {filter, map, take} from 'rxjs';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {isPlatformServer} from '@angular/common';

export const isAdmin = (childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authenticationService = inject(AuthenticationService);
  const router = inject(Router);

  // Attende il completamento di getMe e poi verifica se è admin
  return authenticationService.me$.pipe(
      filter(isAdmin => isAdmin !== null && isAdmin !== undefined), // Filtra i valori nulli
      take(1), // Prende solo il primo valore emesso
      map(isAdmin => {
        const canUse = authenticationService.canUsePlanner();
        return canUse || router.createUrlTree(['/new-app-info']);
      })
    );
}

export const isAuthenticated = (childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const request = inject<any>(REQUEST);
  const platform = inject(PLATFORM_ID);
  if(isPlatformServer(platform)) {
    const cookie = request?.headers?.['cookie'];

    if (!cookie) {
      alert()
    }
  }
  const authenticationService = inject(AuthenticationService);
  // Attende il completamento di getMe e poi verifica se è autenticato
  return authenticationService.me$.pipe(
    filter(user => user !== undefined), // Filtra i valori nulli
    take(1),
    map(user =>
      user ? true : router.createUrlTree(['/auth/login'])
    )
  );
}
