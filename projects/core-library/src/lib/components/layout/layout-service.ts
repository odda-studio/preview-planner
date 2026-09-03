import {inject, Injectable, signal} from '@angular/core';
import {WINDOW} from '../../tokens/window.token';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  private windowRef = inject<Window | any>(WINDOW);

  // Signal to track sidenav open/closed state
  private _sidenavOpen = signal<boolean>(true);

  // Readonly accessor for the sidenav state
  public readonly sidenavOpen = this._sidenavOpen.asReadonly();

  // BehaviorSubject to track spinner counter (prevents flickering with multiple requests)
  private _spinnerCounter$ = new BehaviorSubject<number>(0);
  public readonly spinnerCounter$ = this._spinnerCounter$.asObservable();

  // BehaviorSubject to determine if spinner should be shown
  private _spinnerVisible$ = new BehaviorSubject<boolean>(false);
  public readonly spinnerVisible$ = this._spinnerVisible$.asObservable();

  // Method to toggle sidenav state
  public toggleSidenav(): void {
    this._sidenavOpen.update(state => !state);
  }

  // Method to open sidenav
  public openSidenav(): void {
    this._sidenavOpen.set(true);
  }

  // Method to close sidenav
  public closeSidenav(): void {
    this._sidenavOpen.set(false);
  }

  // Method to show spinner (increments counter)
  public showSpinner(): void {
    const newCount = this._spinnerCounter$.value + 1;
    this._spinnerCounter$.next(newCount);
    if (newCount > 0) {
      this._spinnerVisible$.next(true);
    }
  }

  // Method to hide spinner (decrements counter)
  public hideSpinner(): void {
    const newCount = Math.max(0, this._spinnerCounter$.value - 1);
    this._spinnerCounter$.next(newCount);
    if (newCount === 0) {
      this._spinnerVisible$.next(false);
    }
  }

  // Method to reset spinner counter
  public resetSpinner(): void {
    this._spinnerCounter$.next(0);
    this._spinnerVisible$.next(false);
  }

  isMobile() {
    return this.windowRef.innerWidth < 768;
  }
}
