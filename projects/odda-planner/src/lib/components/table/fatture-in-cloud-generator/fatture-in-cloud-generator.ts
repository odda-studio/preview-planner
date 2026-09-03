import { Component, computed, inject, input, linkedSignal, model, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataTableComponent, IBaseColumn } from '../../../../../../../dist/core-library/types/core-library';
import { UiFieldMetadata, UiTableColumnMetadata, TimeSheetDataModel, InvoicesDataModel, InvoicesService, CompanyDataModel } from '../../../api';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { PdfPreviewDialogComponent } from '../fatture-in-cloud-downloader/pdf-preview-dialog.component';
import { ExportComponent } from "../../export/export.component";
import { lastValueFrom } from 'rxjs';
import JSZip from "jszip";

@Component({
  selector: 'lib-fatture-in-cloud-generator',
  imports: [CommonModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatSlideToggleModule, FormsModule, MatDialogActions, MatDialogContent, MatDialogTitle, ExportComponent],
  template: `
  <app-export class="!hidden" #fullExporter></app-export>
    <h2 mat-dialog-title class="!text-2xl !font-bold !px-8 !py-4">
      <div class="flex items-center justify-between">
        <div>

          Seleziona Righe per Proforma
        </div>
        <div class="flex items-center gap-4">
          <button (click)="previewTimesheets()" class="text-black-600 hover:text-black-800 bg-gray-200 hover:bg-gray-300 px-3 py-1 text-sm">
            Anteprima Timesheets
          </button>
          <button (click)="exportAll(exporter)" [disabled]="exporting()" class="text-black-600 hover:text-black-800 bg-gray-200 hover:bg-gray-300 px-3 py-1 text-sm">
             @if(!exporting()) {
            Scarica tutti i timesheet (PDF)
          
          } @else {
            {{processing().progress}} / {{processing().total}} Attendi...
          }

          </button>
          <button (click)="downloadAll()">
            Scarica tutto
        </button>
         
          <app-export [(processing)]="processing" class="!hidden" #exporter></app-export>
        </div>
      </div>
      @if (client()) {
        <div class="text-base font-normal text-gray-600 mt-2">Cliente: <span class="font-semibold text-gray-900">{{ client() }}</span></div>
        @if (grouped()) {
        <div class="text-base font-normal text-gray-600 mt-2">Attenzione questo cliente richiede una sola fattura per tutti i consulenti</div>          
        }
      }
    </h2>
    
    <mat-dialog-content class="!px-8 !py-4">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-black">
            @if(!grouped()) {
            <th class="px-6  text-left w-12">
              <mat-checkbox 
                class="[&_.mdc-checkbox]:!border-white [&_.mdc-label]:!text-white"
                [checked]="selectableCount() > 0 && selectedRows().size === selectableCount()"
                [indeterminate]="selectedRows().size > 0 && selectedRows().size < selectableCount()"
                (change)="$event.checked ? selectAll() : deselectAll()">
              </mat-checkbox>
            </th>
            }
            
            <th class="px-6 py-3 text-left font-bold text-white text-base uppercase tracking-wide">Periodo</th>
            <th class="px-6 py-3 text-left font-bold text-white text-base uppercase tracking-wide">Descrizione</th>
            <th class="px-6 py-3 text-left font-bold text-white text-base uppercase tracking-wide">Ore</th>
            <th class="px-6 py-3 text-right font-bold text-white text-base uppercase tracking-wide">Importo</th>
            <th class="px-6 py-3 text-center font-bold text-white text-base uppercase tracking-wide">PDF Timesheet</th>
            <th class="px-6 py-3 text-center font-bold text-white text-base uppercase tracking-wide">Documento</th>
            <th class="px-6 py-3 text-center font-bold text-white text-base uppercase tracking-wide"></th>
          </tr>
        </thead>
        <tbody>
          @for (row of values(); track $index) {
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                [class.bg-blue-50]="isRowSelected($index)"
                (click)="toggleRowSelection($index)">
                @if(!grouped()) {

              <td class="px-6 py-2">
<mat-checkbox 
                  [checked]="isRowSelected($index)"
                  (change)="toggleRowSelection($index)"
                  (click)="$event.stopPropagation()">
                </mat-checkbox>
                
              </td>
                }

              <td class="px-6 py-2 text-base text-gray-900 font-medium">{{ row.period }}</td>
              <td class="px-6 py-2 text-base text-gray-900">
                Consulente {{row.worker}}
                @if (!row.submitted) {
                  <span class="ml-2 text-xs text-red-600 font-semibold">(Non confermato dal consulente)</span>
                }
              </td>
              <td class="px-6 py-2 text-base text-gray-900 font-medium">{{ row.hours }}</td>
              <td class="px-6 py-2 text-base text-right text-gray-900 font-semibold">{{ row.amount | currency:'EUR' }}</td>
              <td class="px-6 py-2 text-center">
                <button class="text-blue-600 hover:text-blue-800" (click)="$event.stopPropagation(); previewTimesheet(row.timesheet)">
                  Preview
                </button>
              
              </td>
              <td class="px-6 py-2 text-center">
                @if (row.documentId) {
                  <button class="text-blue-600 hover:text-blue-800" (click)="$event.stopPropagation(); viewDocument(row.documentId, $event)">
                    Apri PDF (proforma)
                  </button>
                } @else {
                  <span class="text-gray-400">-</span>
                }
              </td>
              <td>
                @if (row.documentId) {
                  <button class="text-blue-600 hover:text-blue-800" (click)="$event.stopPropagation(); deleteProforma(row.documentId)">
                    Elimina Proforma
                  </button>
                } @else {
                  <span class="text-gray-400">-</span>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="px-6 py-12 text-center text-gray-500 text-base">
                Nessuna riga disponibile
              </td>
            </tr>
          }
        </tbody>
      </table>
    </mat-dialog-content>
  
    <mat-dialog-actions align="end" class="!px-8 !py-6 !gap-4">
      @if (selectedRows().size > 1) {
        <mat-slide-toggle class="mr-auto" [(ngModel)]="merge">
          Unisci selezione in un'unica fattura
        </mat-slide-toggle>
      }
      <button mat-stroked-button mat-dialog-close (click)="closeModal()" class="!px-6 !py-2">Annulla</button>
      @if (selectedRows().size > 0) {
        <button mat-raised-button
                class="!bg-black hover:!bg-gray-900 !text-white !px-6 !py-2"
                (click)="confirm()">
          Conferma ({{ selectedRows().size }}) {{merge()}}
        </button>
      }
    </mat-dialog-actions>
  `
})
export class FattureInCloudGeneratorModalComponent {


  readonly dialogRef = inject(MatDialogRef<FattureInCloudGeneratorModalComponent>);
  readonly dialog = inject(MatDialog);
  private readonly invoicesService = inject(InvoicesService);
  private readonly snackBar = inject(MatSnackBar);
  private fullExporter = viewChild.required<ExportComponent>("fullExporter")
  readonly data = inject<{ typedValue: TimeSheetDataModel[], client?: CompanyDataModel, grouped?: boolean, status?: string }>(MAT_DIALOG_DATA);
  exporting = signal(false);

  processing = signal<{ progress: number, total: number }>({ progress: 0, total: 0 });

  typedValue = model<TimeSheetDataModel[]>(this.data.typedValue);
  client = input<string | undefined>(this.data.client?.businessName!);
  clientId = input<number>(this.data.client?.id ?? 0);
  grouped = input<boolean>(this.data.grouped || false);
  status = input<string>(this.data.status ?? '');

  deletedTimesheetIds = signal<Set<number>>(new Set());
  merge = signal(false);

  values = computed(() => {
    const items = this.typedValue();
    return items.map(item => {
      const month = (item.month || 0) + 1;
      const year = item.year || new Date().getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      let endDay = lastDayOfMonth;
      if (item.order?.endDate) {
        const orderEndDate = new Date(item.order.endDate);
        if (orderEndDate.getFullYear() === year && orderEndDate.getMonth() === month - 1) {
          endDay = Math.min(orderEndDate.getDate(), lastDayOfMonth);
        }
      }

      const period = `${startDate.getDate()}/${month}/${year} - ${endDay}/${month}/${year}`;

      return {
        period,
        client: item.client?.businessName,
        worker: `${item.order?.worker?.firstName} ${item.order?.worker?.lastName}`,
        hours: item.workingDays.reduce((sum, wd) => sum + (wd.hours || 0) + (wd.extra || 0), 0),
        amount: item.workingDays.reduce((sum, wd) => sum + ((wd.hours || 0) + (wd.extra || 0)) * (item.order?.hourRate || 0), 0),
        submitted: item.submitted || false,
        documentId: item.documentId,
        timesheet: item
      }
    })
  });

  selectableCount = computed(() => {
    return this.values().filter(row => row.submitted).length;
  });

  selectedRows = signal(new Set<number>());
  isRowSelected(index: number): boolean {
    return this.selectedRows().has(index);
  }
  toggleRowSelection(index: number) {
    const row = this.values()[index];

    const selected = new Set(this.selectedRows());
    if (selected.has(index)) {
      selected.delete(index);
    } else {
      selected.add(index);
    }
    this.selectedRows.set(selected);
  }

  selectAll() {
    const selectableIndexes = this.values()
      .map((row, index) => row.submitted ? index : -1)
      .filter(index => index !== -1);
    this.selectedRows.set(new Set(selectableIndexes));
  }

  deselectAll() {
    this.selectedRows.set(new Set());
  }

  confirm() {
    const selectedData = Array.from(this.selectedRows())
      .map(index => this.typedValue()[index]);
    this.dialogRef.close({ selectedData, deletedIds: [...this.deletedTimesheetIds()], merge: this.merge() });
  }

  previewTimesheet(timesheet: TimeSheetDataModel) {
    const ref = this.dialog.open(ExportComponent, {
      data: {
        typedValue: [timesheet],
        onlyPreview: true
      },
      width: '1200px',
      maxWidth: '90vw',
      height: '80vh',
      panelClass: 'pdf-preview-dialog',
    });

    ref.componentInstance.export([timesheet], true);
  }
  previewTimesheets() {
    const ref = this.dialog.open(ExportComponent, {
      data: {
        typedValue: this.typedValue(),
        onlyPreview: true
      },
      width: '1200px',
      maxWidth: '90vw',
      height: '80vh',
      panelClass: 'pdf-preview-dialog',
    });

    ref.componentInstance.export(this.typedValue(), true);
  }

  viewDocument(documentId: number, event: Event) {
    event.stopPropagation();
    this.invoicesService.getProforma({
      id: documentId
    }).subscribe({
      next: (data) => {
        this.dialog.open(PdfPreviewDialogComponent, {
          width: '1200px',
          maxWidth: '90vw',
          height: '80vh',
          panelClass: 'pdf-preview-dialog',
          data: {
            pdfUrl: data.url,
            fileName: 'proforma.pdf'
          }
        });
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
  deleteProforma(arg0: number) {
    const snackBarRef = this.snackBar.open('Confermi la cancellazione?', 'Conferma', {
      duration: 10000,
      panelClass: 'error-snack'
    });

    snackBarRef.onAction().subscribe(() => {
      this.invoicesService.deleteProforma({ id: arg0 }).subscribe(() => {
        this.deletedTimesheetIds().add(arg0);
        this.typedValue.update(timesheets => {
          return timesheets.map(ts => {
            if (ts.documentId === arg0) {
              return {
                ...ts,
                documentId: undefined
              }
            }
            return ts;
          })
        });
        this.snackBar.open('Elemento eliminato con successo', 'Chiudi', {
          duration: 3000,
          panelClass: 'success-snack'
        });
      });
    });
  }
  closeModal() {
    this.dialogRef.close({
      deletedIds: [...this.deletedTimesheetIds()]
    });
  }

  exportAll(exporter: ExportComponent) {
    debugger
    this.exporting.set(true);
    exporter.export(this.typedValue().filter(x => (x.total || 0) > 0), false).then(() => {
      this.exporting.set(false);
    }).catch(() => {
      this.exporting.set(false);
    });
  }


  async downloadAll() {
    const zip = new JSZip();

    const processDoc = async (timesheet: TimeSheetDataModel) => {
      if (!timesheet.documentId) return null;
      try {
        const data = await lastValueFrom(this.invoicesService.getProforma({ id: timesheet.documentId }));
        const proformaBlob = await fetch(data.url)
          .then(response => response.blob())
          .then(blob => {
            return blob;
          })

        return proformaBlob;
      } catch (error) {
        console.error(`Errore nel recupero della proforma per documento ${timesheet.documentId}`, error);
        return null;
      }
    }

    let month = null;
    let year = null;
    if (this.grouped()) {
      const first = this.values()[0];
      const folder = zip.folder(this.client()!);
      if (first) {
        month = first.timesheet.month || 0;
        year = first.timesheet.year || new Date().getFullYear();
        const proforma = await processDoc(first.timesheet);
        if (proforma)
          folder?.file(`proforma_${this.client()}.pdf`, proforma);
      }
      for (const row of this.values()) {
        const timesheetBlob = await this.fullExporter().export([row.timesheet], true);
        for (const blob of Object.entries(timesheetBlob[this.clientId()]!)) {
          folder?.file(`timesheet_${row.timesheet.user?.fullName}.pdf`, blob[1]);
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${this.client()}_${month}_${year}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    for (const row of this.values()) {
      month ??= row.timesheet.month || 0;
      year ??= row.timesheet.year || new Date().getFullYear();
      if (row.documentId) {
        try {
          const timesheet = await this.fullExporter().export([row.timesheet], true);
          try {
            const data = await lastValueFrom(this.invoicesService.getProforma({ id: row.documentId }));
            const proformaBlob = await fetch(data.url)
              .then(response => response.blob())
              .then(blob => {
                return blob;
              })

            zip.file(`proforma_${row.timesheet.user?.fullName}.pdf`, proformaBlob);
          } catch (proformaError) {
            console.error(`Errore nel recupero della proforma ${row.documentId}, procedo senza`, proformaError);
          }

          for (const blob of Object.entries(timesheet[this.clientId()]!)) {
            zip.file(`timesheet_${row.timesheet.user?.fullName}.pdf`, blob[1]);
          }


          // download

        } catch (error) {
          console.error(`Errore nel download del documento ${row.documentId}`, error);
        }
      }
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.client()}_${month}_${year}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

}



@Component({
  selector: 'lib-fatture-in-cloud-generator',
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule],
  templateUrl: './fatture-in-cloud-generator.html',
  styleUrl: './fatture-in-cloud-generator.scss',
})
export class FattureInCloudGenerator implements IBaseColumn {
  readonly dialog = inject(MatDialog);
  private readonly invoicesService = inject(InvoicesService);
  private readonly snackBar = inject(MatSnackBar);

  field = input.required<UiFieldMetadata>();
  tableField = input.required<UiTableColumnMetadata>();
  context = input.required();
  componentContext = input.required<DataTableComponent<any>>();
  typedContext = linkedSignal(() => {
    const ctx = this.context() as any as InvoicesDataModel;
    return ctx as any as InvoicesDataModel;
  });

  value = input.required();

  deletedTimesheetIds = signal<number[]>([]);

  typedValue = linkedSignal(() => {
    return this.value() as any as TimeSheetDataModel[];
  });


  textValue = computed(() => {
    return 'Genera Proforma';
  });

  // Righe selezionate dal modale
  selectedTimesheets = signal<TimeSheetDataModel[]>([]);

  openModal() {
    this.deletedTimesheetIds.set([]);
    this.invoicesService.invoicesAvailableCustomerGet({ customer: this.typedContext()?.company?.id!, year: this.typedContext().year!, month: this.typedContext().month! }).subscribe(availableData => {
      const dialogRef = this.dialog.open(FattureInCloudGeneratorModalComponent, {
        data: {
          typedValue: availableData.timesheets,
          client: availableData.company,
          grouped: availableData.grouped,
          status: availableData.status
        },
        minWidth: '1200px',
        maxWidth: '95vw',
        maxHeight: '90vh'
      });

      dialogRef.afterClosed().subscribe(_ => {

        const deleted = _.deletedIds as number[] | undefined;

        const result = _.selectedData as TimeSheetDataModel[] | undefined;

        const merge = _.merge as boolean | undefined;

        if (deleted && deleted.length > 0) {
          // Rimuovi i timesheet eliminati dalla visualizzazione
          this.deletedTimesheetIds.update(x => deleted);
          if (!result || result.length === 0) {
            this.componentContext().tableData.reload();
          }
        }

        if (result && result.length > 0) {
          // Salva le righe selezionate
          this.selectedTimesheets.set(result);

          this.invoicesService.generateProforma({
            createInvoiceRequest: {
              timesheetIds: result.map((ts: TimeSheetDataModel) => ts.id!),
              merge: merge ?? false,
            }
          }).subscribe({
            next: (response) => {
              this.componentContext().tableData.reload();
              this.snackBar.open(
                `Proforma generata con successo per ${result.length} timesheet${result.length > 1 ? 's' : ''}!`,
                'Chiudi',
                { duration: 3000, panelClass: 'success-snack' }
              );
              console.log('Proforma generata con successo', response);
            },
            error: (error) => {
              this.snackBar.open(
                'Errore nella generazione della proforma. Riprova.',
                'Chiudi',
                { duration: 3000, panelClass: 'error-snack' }
              );
              console.error('Errore generazione proforma', error);
            }
          });
        }
        // Se result è null/undefined/vuoto, il modale è stato chiuso senza conferma (Annulla)
      });
    });
  }

  generateProforma() {
    this.openModal();
  }

}
