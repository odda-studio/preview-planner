import { Injectable, Injector, TemplateRef, ComponentRef, ApplicationRef, EmbeddedViewRef } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { SpinnerComponent } from './spinner.component';

@Injectable({ providedIn: 'root' })
export class SpinnerOverlayService {
  private overlayRef: OverlayRef | null = null;

  constructor(private overlay: Overlay, private injector: Injector) {}

  show() {
    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-dark-backdrop',
        positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
        panelClass: 'spinner-overlay-panel'
      });
      const portal = new ComponentPortal(SpinnerComponent, null, this.injector);
      this.overlayRef.attach(portal);
    }
  }

  hide() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
