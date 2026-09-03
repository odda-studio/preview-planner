import { computed, effect, inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { AuthService, DashboardService, UserDataModel } from '../api';
import { BehaviorSubject, catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { isPlatformServer } from '@angular/common';

const acceptedRoles = [
  'ADMIN',
  'HR',
  'BUSINESS ADMINISTRATION'
]

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private readonly platform = inject(PLATFORM_ID);
  private readonly request = inject<any>(REQUEST);
  private readonly dashboardService = inject(DashboardService);

  private readonly authenticationService = inject(AuthService);
  private refresh$ = new BehaviorSubject<void>(undefined);

  private meSubject$ =
    new BehaviorSubject<UserDataModel | null | undefined>(undefined);


  accessToken = signal<string | null>(null);

  me$ = this.meSubject$.asObservable();

  me = toSignal(this.me$);

  isHr = computed(() => {
    return this.me()?.roles?.find(x => x.name === 'HR') || false;
  })

  isExternal = computed(() => {
    return this.me()?.roles?.find(x => x.name === 'EXTERNAL') || false;
  })

  isAdmin = computed(() => {
    return this.me()?.roles?.find(x => x.name === 'ADMIN') || false;
  })

  isBusinessAdministrator = computed(() => {
    return this.me()?.roles?.find(x => x.name === 'BUSINESS ADMINISTRATION') || false;
  })

  canUsePlanner = computed(() => {
    return this.isAdmin() || this.isBusinessAdministrator() || this.isHr();
  }) 

  constructor() {
    this.init();
  }

  private init() {
    this.refresh$.pipe(
      switchMap(() =>
        this.authenticationService.me('response').pipe(
          tap(user => {
            this.meSubject$.next(user.body);
            this.accessToken.set(user.headers.get('access_token'));
          }),
          catchError((er) => {
            this.meSubject$.next(null);
            return of(null);
          })
        )
      )
    ).subscribe();
  }

  login(value: { username: string; password: string }) {
    this.meSubject$.next(undefined);
    return this.authenticationService.login({
      authLoginDto: {
        ...value
      }
    }).pipe(
      tap(
        res => {
          this.refresh$.next();
          this.accessToken.set(res);
        }
      ));
  }

  links = rxResource({
    params: () => this.me(),
    stream: () => this.dashboardService.getDashboardLinks().pipe(
      map((links: Record<string, Record<string, string>>) => {
        return Object.entries(links).map(([group, linksObject]) => ({
          group,
          links: Object.entries(linksObject).map(([key, value]) => ({ key, value, internal: value.startsWith('/')}))
        }));
      })
    )
  })

  getAuthToken() {

    if (isPlatformServer(this.platform)) {
      console.log(this.request);
      const cookie = this.request?.headers?.['cookie'];
      return cookie;
    }
    return this.accessToken();
  }

  logout() {
    return this.authenticationService.logout().pipe(tap(() => {
      this.meSubject$.next(null);
      this.accessToken.set(null);
      sessionStorage.removeItem('odda_auth_token');
    }))
  }
}
