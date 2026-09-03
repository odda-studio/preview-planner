import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PdfPreviewData {
  pdfUrl: string;
  fileName?: string;
}

@Component({
  selector: 'lib-pdf-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      {{ data.fileName || 'Anteprima PDF' }}
      <button mat-icon-button mat-dialog-close style="float: right;">
      </button>
    </h2>
    <mat-dialog-content>
      <iframe 
        [src]="safePdfUrl" 
        style="width: 100%; height: 70vh; border: none;">
      </iframe>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Chiudi</button>
      <button mat-raised-button color="primary" (click)="downloadPdf()">
        Scarica
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    ::ng-deep .pdf-preview-dialog {
      max-width: 90vw !important;
      width: 900px;
    }
    
    mat-dialog-content {
      padding: 0 !important;
      margin: 0 !important;
    }
  `]
})
export class PdfPreviewDialogComponent {
  private dialogRef = inject(MatDialogRef<PdfPreviewDialogComponent>);
  data = inject<PdfPreviewData>(MAT_DIALOG_DATA);
  private sanitizer = inject(DomSanitizer);

  safePdfUrl: SafeResourceUrl;

  constructor() {
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.pdfUrl);
  }

  downloadPdf() {
    const a = document.createElement('a');
    a.target = '_blank';
    a.href = this.data.pdfUrl;
    a.download = this.data.fileName || 'proforma.pdf';
    a.click();
  }
}
