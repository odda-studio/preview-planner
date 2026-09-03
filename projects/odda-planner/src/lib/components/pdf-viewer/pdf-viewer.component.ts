import { Component, input, AfterViewInit, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerComponent, NgxExtendedPdfViewerModule, PdfDownloadedEvent, PdfSrcType } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'lib-pdf-viewer',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.scss',
})
export class PdfViewerComponent implements AfterViewInit {

  pdfUrl = input<PdfSrcType | null>(null);
  visible = input<boolean>(true);

  private el = inject(ElementRef);

  ngAfterViewInit() {
    // Impedisce alla libreria PDF di chiamare preventDefault() su Ctrl+scroll,
    // che bloccherebbe lo zoom di pagina del browser.
    // La fase di cattura garantisce che questo handler giri prima dei listener interni
    // della libreria, fermando la propagazione verso il basso senza prevenire l'azione
    // di default del browser (= zoom di pagina).
    this.el.nativeElement.addEventListener(
      'wheel',
      (e: WheelEvent) => { if (e.ctrlKey) e.stopPropagation(); },
      { capture: true }
    );
  }
}
