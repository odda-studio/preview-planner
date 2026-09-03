import { Component, computed, effect, ElementRef, inject, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatSnackBar } from '@angular/material/snack-bar'
import { MatDialog } from '@angular/material/dialog'
import { rxResource } from '@angular/core/rxjs-interop';
import { ComparisonOperator, FilterNodeDto, InvoicesService, ModelSupplierDataModel, TimeSheetDataModel, TimeSheetDataModelIPaginatedResponse, TimesheetService } from '../../../api';
import { map, of, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { debouncedSignal } from '../../../signals';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from "@angular/forms";
import { InvoicePreviewDialogComponent } from './invoice-preview-dialog';
import { InvoicesListDialogComponent, TimesheetInvoiceManagerService } from './invoices-list-dialog';
import { ExportComponent } from "../../../components/export/export.component";
import { FattureInCloudDownloaderButton } from "../../../components/table/fatture-in-cloud-downloader/fatture-in-cloud-downloader";
import { MatChipsModule } from "@angular/material/chips";
import { HttpContext } from '@angular/common/http';
import { PREVENT_SPINNER } from 'core-library';

interface TimesheetWithTotals extends TimeSheetDataModel {
  totalHours: number;
  consultantInvoice: number;
  clientInvoice: number;
  vat: number;
  margin: number;
  dueInvoiceDate?: Date;
  isConsultant: boolean;
  visible: boolean; // Aggiunta proprietà per gestire la visibilità
  paid: boolean;
  invoiceReceived?: boolean;
}

type DomTimesheets = {
  year: number,
  yearShort: string,
  timesheetsByMonth: Array<{
    month: number,
    monthName: string,
    grouped: Array<{
      companyName: string,
      timesheets: TimesheetWithTotals[],
      visible: boolean; // Aggiunta proprietà per gestire la visibilità
      totals: {
        totalHours: number;
        consultantInvoice: number;
        clientInvoice: number;
        vat: number;
        margin: number;
      }
    }>,
    monthTotals: {
      totalHours: number;
      consultantInvoice: number;
      clientInvoice: number;
      vat: number;
      margin: number;
    }
  }>
}

@Component({
  selector: 'lib-monthly-consultant-overview',
  imports: [MatMenuModule, MatCheckboxModule, CommonModule, MatSlideToggleModule, FormsModule, FattureInCloudDownloaderButton, MatChipsModule],
  templateUrl: './monthly-consultant-overview.html',
  styleUrl: './monthly-consultant-overview.scss',
})
export class MonthlyConsultantOverview {


  private invoiceService = inject(InvoicesService);
  private readonly timesheetService = inject(TimesheetService);
  private readonly timesheetInvoiceManager = inject(TimesheetInvoiceManagerService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  currentMonthRef = viewChild<ElementRef>('currentMonth');

  // Dati per identificare il mese corrente
  private readonly now = new Date();
  readonly currentMonthNumber = this.now.getMonth();
  readonly currentYearNumber = this.now.getFullYear();

  // Signal per gestire l'espansione del floating badge
  expandedMonthKey = signal<string | null>(null);
  expandedInvoiceMonthKey = signal<string | null>(null);
  showAll = signal<boolean>(false);
  notPayed = signal<boolean>(false);
  disableSyncButton = signal<boolean>(false);
  selectedExternalTimesheetIds = signal<number[]>([]);

  selectedExternalCount = computed(() => this.selectedExternalTimesheetIds().length);

  selectedExternalInvoicesTotal = computed(() => {
    const selectedIds = new Set(this.selectedExternalTimesheetIds());
    if (selectedIds.size === 0) {
      return 0;
    }

    let total = 0;
    for (const year of this.timesheets()) {
      for (const month of year.timesheetsByMonth) {
        for (const group of month.grouped) {
          for (const ts of group.timesheets) {
            if (selectedIds.has(ts.id || -1) && ts.isConsultant) {
              total += ts.consultantInvoice || 0;
            }
          }
        }
      }
    }

    return total;
  });

  public timesheets = signal<DomTimesheets[]>([]);
  constructor() {
    effect(() => {
      const timesheetUpdated = this.timesheetInvoiceManager.timesheetUpdated();
      if (timesheetUpdated) {
        untracked(() => {
          const ts = this.__dataTimesheets().items?.find(ts => ts.id === timesheetUpdated.id);
          if (ts) {
            const sheets = this.__dataTimesheets().items?.filter(ts => ts.id !== timesheetUpdated.id);
            if (sheets && ts) {
              ts.accountingInfo = timesheetUpdated.accountingInfo;
              this.__dataTimesheets.set({
                items: [...sheets, ts]
              });
            }
          }
        })

      }
    })
    effect(() => {
      const ref = this.currentMonthRef();
      if (ref) {
        setTimeout(() => {
          ref.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    });

    effect(() => {
      const showsAll = this.showAll();
      const notPayed = this.notPayed();
      const x = this.__dataTimesheets();
      if (x) {

        const group: Record<number, Record<number, Record<number, TimeSheetDataModel[]>>> = {};

        x.items?.forEach(timesheet => {
          const year = timesheet.year!;
          const month = timesheet.month!;
          const userId = timesheet.order?.company?.id!;

          if (!group[year]) {
            group[year] = {};
          }
          if (!group[year][month]) {
            group[year][month] = {};
          }
          if (!group[year][month][userId]) {
            group[year][month][userId] = [];
          }

          group[year][month][userId].push(timesheet);
        });

        const result: Array<DomTimesheets> = [];

        for (const [year, months] of Object.entries(group)) {
          for (const [month, users] of Object.entries(months)) {
            const monthName = this.months()[+month].name;
            const timesheetsByCompany = Object.entries(users).map(([_, timesheets]) => {
              // Calcola i totali per ogni timesheet
              const timesheetsWithTotals: TimesheetWithTotals[] = timesheets.map(ts => {
                // Somma ore normali + straordinari
                const totalHours = ts.workingDays?.reduce((sum, day) => sum + (day.hours || 0) + (day.extra || 0), 0) || 0;
                const resourceCosts = ts.order?.resourceCosts || 0;
                const hourRate = ts.order?.hourRate || 0;
                const consultantInvoice = (resourceCosts / ((ts.order?.hours || 8)) * totalHours);
                const clientInvoice = totalHours * hourRate;

                // Calcola IVA se vatType contiene "22%"
                const vatDescription = ts.order?.company?.vatType?.description || '';
                const vatRate = vatDescription.includes('22%') ? 0.22 : 0;
                const vat = clientInvoice * vatRate;


                const isConsultant = this.isConsultantTimesheet(ts);
                const margin = isConsultant ? clientInvoice - consultantInvoice : clientInvoice;
                return {
                  ...ts,
                  totalHours,
                  consultantInvoice,
                  clientInvoice,
                  vat,
                  margin,
                  dueInvoiceDate: isConsultant ? new Date(ts.year!, ts.month! + 1, ts.user?.paymentTerms || 60) : undefined,
                  isConsultant: isConsultant,
                  paid: ts.accountingInfo?.paid || false,
                  visible: showsAll || isConsultant ? (!notPayed || !ts.accountingInfo?.consultantPaymentDate) : false,
                  invoiceReceived: !!ts.accountingInfo
                };
              });

              // Calcola i totali per il cliente
              const totals = timesheetsWithTotals.reduce((acc, ts) => ({
                totalHours: acc.totalHours + ts.totalHours,
                consultantInvoice: acc.consultantInvoice + (ts.isConsultant ? ts.consultantInvoice : 0),
                clientInvoice: acc.clientInvoice + ts.clientInvoice,
                vat: acc.vat + ts.vat,
                margin: acc.margin + ts.margin
              }), {
                totalHours: 0,
                consultantInvoice: 0,
                clientInvoice: 0,
                vat: 0,
                margin: 0
              });

              return {
                companyName: timesheets[0].order?.company?.businessName || '',
                timesheets: timesheetsWithTotals,
                totals,
                visible: timesheetsWithTotals.some(f => f.visible)
              }
            });

            let yearGroup = result.find(r => r.year === +year);
            if (!yearGroup) {
              yearGroup = {
                year: +year,
                yearShort: year.slice(2),
                timesheetsByMonth: []
              };
              result.push(yearGroup);
            }

            // Calcola i totali per il mese
            const monthTotals = timesheetsByCompany.reduce((acc, company) => ({
              totalHours: acc.totalHours + company.totals.totalHours,
              consultantInvoice: acc.consultantInvoice + company.totals.consultantInvoice,
              clientInvoice: acc.clientInvoice + company.totals.clientInvoice,
              vat: acc.vat + company.totals.vat,
              margin: acc.margin + company.totals.margin
            }), {
              totalHours: 0,
              consultantInvoice: 0,
              clientInvoice: 0,
              vat: 0,
              margin: 0
            });

            yearGroup.timesheetsByMonth.push({
              month: +month,
              monthName,
              grouped: timesheetsByCompany,
              monthTotals
            });
          }
        }

        this.timesheets.set(result);
      }
    })

    effect(() => {
      const selectedIds = this.selectedExternalTimesheetIds();
      if (selectedIds.length === 0) {
        return;
      }

      const validIds = new Set<number>();
      for (const year of this.timesheets()) {
        for (const month of year.timesheetsByMonth) {
          for (const group of month.grouped) {
            for (const ts of group.timesheets) {
              if (ts.isConsultant && ts.id) {
                validIds.add(ts.id);
              }
            }
          }
        }
      }

      const filteredIds = selectedIds.filter(id => validIds.has(id));
      if (filteredIds.length !== selectedIds.length) {
        this.selectedExternalTimesheetIds.set(filteredIds);
      }
    });
  }

  months = computed(() => {
    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const currentMonth = new Date().getMonth();
    return monthNames.map((name, index) => ({
      name,
      value: index,
      disabled: false
    }));
  })

  currentMonth = linkedSignal(() => {
    const month = new Date().getMonth();
    return this.months()[month];
  });

  selectedMonths = signal<number[]>((() => {
    const month = new Date().getMonth();
    return [month - 1].filter(m => m >= 0);
  })());

  debouncedSelectedMonths = debouncedSignal(this.selectedMonths, 300);

  currentYear = signal(new Date().getFullYear());

  selectedYears = signal<number[]>((() => {
    const currentYear = new Date().getFullYear();
    if (new Date().getMonth() < 2) {
      return [currentYear, currentYear - 1];
    }
    return [currentYear];
  })());

  debouncedSelectedYears = debouncedSignal(this.selectedYears, 300);


  years = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5, currentYear - 6, currentYear - 7, currentYear - 8, currentYear - 9];
  })

  // Metodi per gestire il toggle delle selezioni
  toggleYear(year: number) {
    const current = this.selectedYears();
    if (current.includes(year)) {
      this.selectedYears.set(current.filter(y => y !== year));
    } else {
      this.selectedYears.set([...current, year]);
    }
  }

  toggleMonth(monthValue: number) {
    const current = this.selectedMonths();
    if (current.includes(monthValue)) {
      this.selectedMonths.set(current.filter(m => m !== monthValue));
    } else {
      this.selectedMonths.set([...current, monthValue]);
    }
  }

  isYearSelected(year: number): boolean {
    return this.selectedYears().includes(year);
  }

  isMonthSelected(monthValue: number): boolean {
    return this.selectedMonths().includes(monthValue);
  }

  // Label per i pulsanti
  selectedYearsLabel = computed(() => {
    const years = this.selectedYears();
    if (years.length === 0) return 'Seleziona anni';
    return years.sort((a, b) => b - a).join(', ');
  });

  selectedMonthsLabel = computed(() => {
    const months = this.selectedMonths();
    if (months.length === 0) return 'Seleziona mesi';
    const monthNames = this.months();
    return months
      .sort((a, b) => b - a)
      .map(m => monthNames[m].name)
      .join(', ');
  });

  filters = computed<FilterNodeDto>(() => {

    const result: FilterNodeDto = {
      logic: 'Or',
      type: 'Group',
      children: []
    };

    for (const year of this.debouncedSelectedYears()) {
      result.children?.push({
        type: 'Group',
        logic: 'And',
        children: [
          {
            type: 'Condition',
            property: 'year',
            operator: ComparisonOperator.Eq,
            value: year
          },
          {
            type: 'Condition',
            property: 'month',
            operator: ComparisonOperator.In,
            value: this.debouncedSelectedMonths()
          }
        ]
      })
    }

    return result;

  });

  private readonly __dataTimesheets = signal<TimeSheetDataModelIPaginatedResponse>({ items: [] });

  private readonly _timesheets = rxResource({
    params: () => this.filters(),
    stream: (p) => p.params.children?.length == 0 ? of([]) : this.timesheetService.timesheetsSearchPost({
      page: 1,
      pageSize: 10000,
      includes: 'user.roles.role,order.company,workingDays,accountingInfo,user.paymentTerms',
      paginatedRequestDto: {
        filters: this.filters()
      }
    }).pipe(tap(f => this.__dataTimesheets.set(f))) as any
  })


  markAsPaid(timesheet: TimeSheetDataModel) {
    if (!timesheet.id) return;

    this.timesheetService.markTimesheetAsPaid({
      id: timesheet.id
    }).subscribe({
      next: (x) => {
        timesheet.accountingInfo = x.accountingInfo;
        const ts = this.__dataTimesheets().items?.find(ts => ts.id === timesheet.id);
        if (ts) {
          ts.accountingInfo = x.accountingInfo; // Aggiorna anche nella lista principale
        }
        this.snackBar.open(`✓ ${timesheet.user?.fullName} segnato come pagato`, 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snack']
        });
      },
      error: (err) => {
        console.error('Errore durante la marcatura come pagato:', err);
        this.snackBar.open('❌ Errore durante il pagamento', 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  markAsUnpaid(timesheet: TimeSheetDataModel) {
    if (!timesheet.id) return;

    this.timesheetService.markTimesheetAsUnpaid({ id: timesheet.id }).subscribe({
      next: () => {
        timesheet.accountingInfo = undefined;
        const ts = this.__dataTimesheets().items?.find(ts => ts.id === timesheet.id);
        if (ts) {
          ts.accountingInfo = undefined; // Aggiorna anche nella lista principale
        }
        this.snackBar.open(`↩ ${timesheet.user?.fullName} segnato come non pagato`, 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['warning-snackbar']
        });
      },
      error: (err) => {
        console.error('Errore durante la marcatura come non pagato:', err);
        this.snackBar.open('❌ Errore durante l\'operazione', 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Metodo per ottenere i consulenti non pagati per un mese (esclusi EMPLOYEE)
  getUnpaidConsultants(month: any): TimesheetWithTotals[] {
    const unpaid: TimesheetWithTotals[] = [];
    month.grouped.forEach((group: any) => {
      group.timesheets.forEach((ts: TimesheetWithTotals) => {
        // Escludi utenti con ruolo EMPLOYEE
        if (!ts.accountingInfo?.paid && this.isConsultantTimesheet(ts)) {
          unpaid.push(ts);
        }
      });
    });
    return unpaid;
  }

  isConsultantTimesheet(ts: TimeSheetDataModel): boolean {
    return ts.user?.roles?.some(role => role.name === 'EXTERNAL') || false;
  }

  toggleExternalSelection(timesheet: TimesheetWithTotals, checked: boolean) {
    if (!timesheet.id || !timesheet.isConsultant) {
      return;
    }

    const current = this.selectedExternalTimesheetIds();
    const alreadySelected = current.includes(timesheet.id);

    if (checked && !alreadySelected) {
      this.selectedExternalTimesheetIds.set([...current, timesheet.id]);
    }

    if (!checked && alreadySelected) {
      this.selectedExternalTimesheetIds.set(current.filter(id => id !== timesheet.id));
    }
  }

  isExternalSelected(timesheet: TimesheetWithTotals): boolean {
    if (!timesheet.id || !timesheet.isConsultant) {
      return false;
    }

    return this.selectedExternalTimesheetIds().includes(timesheet.id);
  }

  // Metodo per ottenere i consulenti con fattura associata per un mese
  getConsultantsWithInvoice(month: any): TimesheetWithTotals[] {
    const withInvoice: TimesheetWithTotals[] = [];
    month.grouped.forEach((group: any) => {
      group.timesheets.forEach((ts: TimesheetWithTotals) => {
        if (ts.invoiceReceived && this.isConsultantTimesheet(ts)) {
          withInvoice.push(ts);
        }
      });
    });
    return withInvoice;
  }

  countConsultantsWithInvoice(month: any): number {
    return this.getConsultantsWithInvoice(month).length;
  }

  toggleInvoiceMonthBadge(year: number, month: number) {
    const key = `${year}-${month}`;
    if (this.expandedInvoiceMonthKey() === key) {
      this.expandedInvoiceMonthKey.set(null);
    } else {
      this.expandedInvoiceMonthKey.set(key);
    }
  }

  isInvoiceMonthBadgeExpanded(year: number, month: number): boolean {
    return this.expandedInvoiceMonthKey() === `${year}-${month}`;
  }

  // Metodo per contare i consulenti non pagati
  countUnpaidConsultants(month: any): number {
    return this.getUnpaidConsultants(month).length;
  }

  // Toggle espansione badge
  toggleMonthBadge(year: number, month: number) {
    const key = `${year}-${month}`;
    if (this.expandedMonthKey() === key) {
      this.expandedMonthKey.set(null);
    } else {
      this.expandedMonthKey.set(key);
    }
  }

  // Verifica se il badge è espanso
  isMonthBadgeExpanded(year: number, month: number): boolean {
    return this.expandedMonthKey() === `${year}-${month}`;
  }

  getDocument(timesheet: TimesheetWithTotals) {
    if (!timesheet.paidDocumentId) {
      this.snackBar.open('Il documento non é stato ancora generato', 'Chiudi', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    };
    this.invoiceService.getInvoice({
      id: timesheet.paidDocumentId
    }).subscribe(d => {
      const xmlString = d.attachment;
      const fileName = `Fattura_${timesheet.user?.fullName || 'Sconosciuto'}_${timesheet.year}_${timesheet.month}.xml`;

      // Apri la modale con la preview
      this.dialog.open(InvoicePreviewDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        data: {
          xmlContent: xmlString,
          fileName: fileName
        }
      });
    })
  }

  showTimesheet(_t133: TimesheetWithTotals) {
    const ref = this.dialog.open(ExportComponent, {
      width: '1200px',
      maxWidth: '90vw',
      height: '80vh',
      panelClass: 'pdf-preview-dialog',
    });

    ref.componentInstance.export([_t133], true);
  }

  copySupplierId(arg0: ModelSupplierDataModel | undefined) {
    if (!arg0?.id) return;
    this.invoiceService.assignInvoices({
      supplierId: arg0?.id
    }).subscribe(x => {

    })
  }

  showInvoices(timesheet: TimesheetWithTotals) {
    this.invoiceService.getInvoices({
      supplierIds: [timesheet.user?.supplierDataModel?.id!],
    }).subscribe(invoices => {
      this.dialog.open(InvoicesListDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        data: {
          invoices: invoices,
          consultantName: timesheet.user?.fullName || 'Consulente',
          timesheet
        }
      });
    });
  }

  syncSelectedMonths() {
    this.disableSyncButton.set(true);
    this.snackBar.open('Sincronizzazione avviata', 'Chiudi', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['success-snack']
      });
    this.invoiceService.invoicesSyncMonthsPost({
      months: this.selectedMonths().map(x => x + 1),
    }, undefined, undefined, {context: new HttpContext().set(PREVENT_SPINNER, true)}).subscribe((f) => {
  
      this.snackBar.open('Sincronizzazione avvenuta con successo', 'Chiudi', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['success-snack']
      });

      this.disableSyncButton.set(false);
      this._timesheets.reload();
    });
  }
}
