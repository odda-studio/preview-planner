import { Component, computed, inject, input, InputSignal, signal } from '@angular/core';
import { DataTableComponent, IBaseColumn } from '../../../../../../../dist/core-library/types/core-library';
import { UiFieldMetadata, UiTableColumnMetadata } from '../../../api';
import { InvoicesService } from '../../../api';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PdfPreviewDialogComponent } from './pdf-preview-dialog.component';

@Component({
  selector: 'lib-fatture-in-cloud-downloader',
  imports: [],
  templateUrl: './fatture-in-cloud-downloader.html',
  styleUrl: './fatture-in-cloud-downloader.scss',
})
export class FattureInCloudDownloader implements IBaseColumn {
  private readonly invoicesService = inject(InvoicesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  field = input.required<UiFieldMetadata>();
  tableField = input.required<UiTableColumnMetadata>();
  context = input.required();
  textValue = computed(() => {
    return 'Genera Proforma';
  });
  componentContext = input.required<DataTableComponent<any>>();
  value = input.required<any>();


  download() {
    if (this.value()) {
      const openDialg = (url: string) => {
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
        return;
      }

      this.invoicesService.getProforma({
        id: this.value() as any as number
      }).subscribe({
        next: (data) => {
          openDialg(data.url);
        },
        error: (error) => {
          this.snackBar.open(
            'Errore nel caricamento del documento. Riprova.',
            'Chiudi',
            { duration: 3000, panelClass: 'error-snack' }
          );
          console.error('Errore caricamento proforma', error);
        }
      });
    }
  }

}


@Component({
  selector: 'lib-fatture-in-cloud-downloader-button',
  template: `
  @let id = this.value();
@if (id) {
    <button (click)="download()"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                                            fill="none" stroke="currentColor" stroke-width="1.8"
                                                            class="size-6" stroke-linecap="round"
                                                            stroke-linejoin="round">
                                                            <path
                                                                d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                                                            <path d="M14 3v5h5" />
                                                            <path d="M8.5 12.5h4" />
                                                            <path d="M8.5 16h3" />
                                                            <path d="M15 14v4" />
                                                            <path d="M13 16l2 2 2-2" />
                                                            <path d="M14.5 20.5l1.5 1.5 3-3" />
                                                        </svg></button>
} 

  `
})
export class FattureInCloudDownloaderButton {
  private readonly invoicesService = inject(InvoicesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  value = input.required<any>();

  download() {
    if (this.value()) {
      const openDialg = (url: string) => {
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
        return;
      }

      this.invoicesService.getProforma({
        id: this.value() as any as number
      }).subscribe({
        next: (data) => {
          openDialg(data.url);
        },
        error: (error) => {
          this.snackBar.open(
            'Errore nel caricamento del documento. Riprova.',
            'Chiudi',
            { duration: 3000, panelClass: 'error-snack' }
          );
          console.error('Errore caricamento proforma', error);
        }
      });
    }
  }
}