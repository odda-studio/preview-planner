import { Component, ElementRef, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../layout-service';
import { WINDOW } from '../../../tokens/window.token';
import { SpinnerOverlayService } from './spinner.overlay.service';

@Component({
  selector: 'lib-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent {
  private window = inject<Window>(WINDOW);
  private layoutService = inject(LayoutService);
  private readonly spinnerOverlay = inject(SpinnerOverlayService);

  private el = inject(ElementRef);

  public readonly spinnerVisible$ = this.layoutService.spinnerVisible$;
  public readonly spinnerCounter$ = this.layoutService.spinnerCounter$;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  constructor() {

    this.spinnerVisible$.subscribe(visible => {
      if (visible) {
        this.spinnerOverlay.show();
      } else {
        this.spinnerOverlay.hide();
      }
    });
  }
}
