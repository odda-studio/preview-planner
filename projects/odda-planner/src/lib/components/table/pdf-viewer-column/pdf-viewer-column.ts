import { Component, computed, inject, input } from '@angular/core';
import { DataTableComponent, IBaseColumn } from '../../../../../../../dist/core-library/types/core-library';
import { UiFieldMetadata, UiTableColumnMetadata } from '../../../api';
import { InvoicesService } from '../../../api';
import { MatDialog } from '@angular/material/dialog';
import { PdfPreviewDialogComponent } from '../fatture-in-cloud-downloader/pdf-preview-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'lib-pdf-viewer-column',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    @let id = this.value();
    @if (id) {
      <button mat-icon-button (click)="viewPdf()" color="primary">
        <mat-icon>visibility</mat-icon>
      </button>
    } @else {
      <span>-</span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class PdfViewerColumn implements IBaseColumn {
  private readonly invoicesService = inject(InvoicesService);
  private readonly dialog = inject(MatDialog);
  
  field = input.required<UiFieldMetadata>();
  tableField = input.required<UiTableColumnMetadata>();
  context = input.required();
  value = input.required();
  componentContext = input.required<DataTableComponent<any>>();
  textValue = computed(() => {
    return this.value() ? 'Visualizza PDF' : '-';
  });

  viewPdf() {
    if (this.value()) {
      this.invoicesService.getProforma({
        id: this.value() as any as number
      }).subscribe((data) => {
        this.openDialog(data.url);
      });
    }
  }

  private openDialog(url: string) {
    this.dialog.open(PdfPreviewDialogComponent, {
      width: '1200px',
      maxWidth: '90vw',
      height: '80vh',
      panelClass: 'pdf-preview-dialog',
      data: {
        pdfUrl: url,
        fileName: 'proforma.pdf'
      }
    });
  }
}
