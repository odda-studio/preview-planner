import { Component, inject, Injectable, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
// import { InvoicesService, ReceivedDocument, TimeSheetDataModel } from '../../../api';
import { InvoicesService, TimeSheetDataModel } from '../../../api';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface InvoicesListDialogData {
  // fix ReceivedDocument
    invoices: (any & { paid: boolean, suggested: boolean })[];
    consultantName: string;
    timesheet: TimeSheetDataModel
}

@Injectable({
    providedIn: 'root'
})
export class TimesheetInvoiceManagerService {
    public readonly timesheetUpdated = signal<TimeSheetDataModel | undefined>(undefined);
}

@Component({
    selector: 'lib-invoices-list-dialog',
    standalone: true,
    imports: [MatDialogModule, CommonModule],
    template: `
    <div class="invoices-list-dialog">
      <h2 mat-dialog-title class="text-xl font-bold border-b pb-3 mb-4">
        Fatture - {{ data.consultantName }}
      </h2>
      <mat-dialog-content class="overflow-auto max-h-[70vh]">
        <div *ngIf="data.invoices.length === 0" class="text-center py-8 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto w-16 h-16 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-lg">Nessuna fattura trovata</p>
        </div>

        <div class="grid gap-4">
          <div 
            *ngFor="let invoice of data.invoices"
            [class.suggested-invoice]="invoice.suggested"
            class="invoice-card bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold text-gray-800">{{ invoice.invoiceNumber || 'N/A' }}</span>
                  <span 
                    *ngIf="invoice.eInvoice"
                    class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                    E-Invoice
                  </span>
                  <span 
                    *ngIf="invoice.suggested"
                    class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                    ✓ Suggerita per timesheet corrente
                  </span>
                </div>
                <p *ngIf="invoice.description" class="text-sm text-gray-600 line-clamp-2">
                  {{ invoice.description }}
                </p>
              </div>
              <div class="text-right ml-4">
                <div class="text-lg font-bold text-gray-900">
                  {{ formatAmount(invoice.amountGross) }}
                </div>
                <div class="text-xs text-gray-500">
                  Lordo
                </div>
              </div>
            </div>

            @for (item of invoice.itemsList; track $index) {
                <div>
                    {{item.name}} - {{item.qty}} x {{formatAmount(item.netPrice)}}
                </div>
            }
            
            <div class="flex justify-between items-center pt-3 border-t border-gray-100">
              <div class="flex items-center text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(invoice.date) }}
              </div>
              
              <div class="flex gap-2 text-xs">
                <div *ngIf="invoice.amountNet !== null && invoice.amountNet !== undefined" 
                     class="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  Netto: {{ formatAmount(invoice.amountNet) }}
                </div>
                <div *ngIf="invoice.amountVat !== null && invoice.amountVat !== undefined" 
                     class="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  IVA: {{ formatAmount(invoice.amountVat) }}
                </div>
              </div>
            </div>
            
             <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
              <div class="flex items-center text-sm text-orange-600">
               
              @if(invoice.paid) {
               Pagata
            }
                
              </div>
              <button (click)="assignToTimesheet(invoice)">
                Assegna a timesheet {{data.timesheet.month! + 1}}/{{data.timesheet.year}}
              </button>
            </div>

            

            <div *ngIf="invoice.nextDueDate" class="mt-2 pt-2 border-t border-gray-100">
              <div class="flex items-center text-sm text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Scadenza: {{ formatDate(invoice.nextDueDate) }}
              </div>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="border-t pt-3 mt-4">
        <button 
          mat-button 
          (click)="close()"
          class="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
          Chiudi
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .invoices-list-dialog {
      min-width: 600px;
      max-width: 90vw;
    }

    .invoice-card {
      cursor: default;
    }

    .invoice-card:hover {
      transform: translateY(-2px);
    }

    .suggested-invoice {
      border-color: #10b981 !important;
      border-width: 2px !important;
      box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06) !important;
    }

    .line-clamp-2 {
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  `]
})
export class InvoicesListDialogComponent {

    private readonly invoiceService = inject(InvoicesService)
    private readonly timesheetInvoiceManager = inject(TimesheetInvoiceManagerService);
    private dialogRef = inject(MatDialogRef<InvoicesListDialogComponent>);
    private readonly snackBar = inject(MatSnackBar);

    data = inject<InvoicesListDialogData>(MAT_DIALOG_DATA);

    constructor() {
        const timesheetTotal = (this.data.timesheet as any).consultantInvoice ?? 0;
        this.data.invoices = this.data.invoices.map(inv => {
            const amountNet = inv.amountNet ?? 0;
            const difference = Math.abs(amountNet - timesheetTotal);
            return {
                ...inv,
                // TODO: fix with paymentsList => receivedDocument.paymentsList
                paid: !!inv.paymentsList?.find((x: any) => x.status === 'paid'),
                suggested: difference <= 50
            };
        }).sort((a, b) => {
            // Prima le suggerite, poi ordina per data
            if (a.suggested !== b.suggested) {
                return a.suggested ? -1 : 1;
            }
            return new Date(b.date!).getTime() - new Date(a.date!).getTime();
        });
    }

    close() {
        this.dialogRef.close();
    }

    formatAmount(amount: number | null | undefined): string {
        if (amount === null || amount === undefined) return 'N/A';
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    formatDate(date: string | null | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // TODO: fix with ReceivedDocument
    assignToTimesheet(_t16: any & { paid: boolean; suggested: boolean; }) {
        const snackBarRef = this.snackBar.open(
            `Assegnare la fattura ${_t16.invoiceNumber} al timesheet ${this.data.timesheet.month! + 1}/${this.data.timesheet.year}?`,
            'Conferma',
            {
                duration: 10000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
                panelClass: ['success-snack']
            }
        );

        snackBarRef.onAction().subscribe(() => {
            this.invoiceService.invoicesAssignInvoiceToTimesheetIdPost({
                id: this.data.timesheet.id!,
                invoiceId: _t16.id!
            }).subscribe(x => {
                this.timesheetInvoiceManager.timesheetUpdated.set(x);
                this.snackBar.open(`✓ Timesheet segnato come pagato con fattura ${_t16.invoiceNumber}`, 'Chiudi', {
                    duration: 3000,
                    horizontalPosition: 'center',
                    verticalPosition: 'bottom',
                    panelClass: ['success-snack']
                });
                this.close();
            });
        });
    }
}
