import { Component, Input, OnInit, HostBinding, HostListener, inject, ElementRef, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LayoutService } from '../layout-service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { WINDOW } from '../../../tokens/window.token';

@Component({
  selector: 'lib-sidenav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.css',
  animations: [
    trigger('slideInOut', [
      state('open', style({
        transform: 'translateX(0)'
      })),
      state('closed-left', style({
        transform: 'translateX(-100%)'
      })),
      state('closed-right', style({
        transform: 'translateX(100%)'
      })),
      transition('open <=> closed-left', animate('300ms ease-in-out')),
      transition('open <=> closed-right', animate('300ms ease-in-out'))
    ])
  ]
})
export class SidenavComponent implements OnInit {
  public layoutService = inject(LayoutService);
  private elementRef = inject(ElementRef);
  private windowRef = inject<Window | any>(WINDOW);
  private platformId = inject(PLATFORM_ID);

  // Input for sidenav position (left or right)
  @Input() position: 'left' | 'right' = 'left';

  // Input for sidenav width (overrides CSS variable)
  @Input() set width(value: string) {
    if (value) {
      this.elementRef.nativeElement.style.setProperty('--sidenav-width', value);
    }
  }

  // Track if sidenav is open using the signal directly
  get isOpen(): boolean {
    return this.layoutService.sidenavOpen();
  }

  // Apply animation state based on open state and position (only in browser environment)
  @HostBinding('@slideInOut') get slideInOut() {
    // Only apply animations in browser environment
    if (isPlatformBrowser(this.platformId)) {
      return this.isOpen ? 'open' : `closed-${this.position}`;
    }
    // Return a default state for SSR
    return 'open';
  }

  // Apply position class
  @HostBinding('class.right') get isRight() {
    return this.position === 'right';
  }

  // Listen for window resize to auto-close on mobile
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    // Only respond to resize events in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.checkMobileAndClose();
    }
  }

  constructor() {
    // Use effect to respond to changes in the sidenav state
    effect(() => {
      // This will re-run whenever the signal value changes
      const isOpen = this.layoutService.sidenavOpen();
      // No need to do anything here, the template will update automatically
    });
  }

  ngOnInit() {
    // Check if mobile on init (only in browser environment)
    if (isPlatformBrowser(this.platformId)) {
      this.checkMobileAndClose();
    }
  }

  // Check if on mobile device and close sidenav if needed
  private checkMobileAndClose() {
    // Only check window size in browser environment
    if (isPlatformBrowser(this.platformId) && this.windowRef.innerWidth < 768) { // 768px is a common breakpoint for mobile
      this.layoutService.closeSidenav();
    }
  }

  isMobile() {
    return this.windowRef.innerWidth < 768;
  }
}
