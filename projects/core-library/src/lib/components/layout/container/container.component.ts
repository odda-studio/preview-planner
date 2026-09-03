import { Component, Input, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../layout-service';

@Component({
  selector: 'lib-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './container.component.html',
  styleUrl: './container.component.scss'
})
export class ContainerComponent {
  public layoutService = inject(LayoutService);

  // Input for sidenav position
  @Input() sidenavPosition: 'left' | 'right' = 'left';

  // Track if sidenav is open using the signal directly
  get isSidenavOpen(): boolean {
    return this.layoutService.sidenavOpen();
  }

  constructor() {
    // Use effect to respond to changes in the sidenav state
    effect(() => {
      // This will re-run whenever the signal value changes
      const isOpen = this.layoutService.sidenavOpen();
      // No need to do anything here, the template will update automatically
    });
  }
}
