import { Component, computed, effect, ElementRef, inject, input, linkedSignal, model, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from "@angular/common";
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { dataRouteInfo } from '../routes';
import { lastValueFrom, Observable } from 'rxjs';
import {
  EntityManagerComponent,
  FilterConfig,
  FilterGroup,
  FilterSidenavComponent,
  LayoutService,
  PREVENT_SPINNER,
  RightActionSidenavComponent,
  SavedQuery
} from 'core-library'
import { FilterNodeDto, FormKind, InvoicesDataModel, InvoicesService, TimeSheetDataModel, TimesheetService, UiResourceMetadata, UserService } from '../../../api';
import { FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportComponent } from '../../../components/export/export.component';
import jspreadsheet, { ToolbarItem } from "jspreadsheet-ce";
import JSZip from "jszip";
import { HttpContext } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { DocumentUploadDialogComponent } from '../dashboard-home/document-upload-dialog';
import { TimesheetHoursDetails } from "../../../components/timesheet-hours-details/timesheet-hours-details";

@Component({
  selector: 'lib-base-entity',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    EntityManagerComponent,
    RightActionSidenavComponent,
    FilterSidenavComponent,
    ExportComponent,
    RouterOutlet,
    TimesheetHoursDetails
  ],
  templateUrl: './base-entity.component.html',
  styleUrl: './base-entity.component.scss'
})
export class BaseEntityComponent {
  private readonly invoicesService = inject(InvoicesService);

  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  public readonly router = inject(Router);
  public readonly timesheetService = inject(TimesheetService);
  private readonly userService = inject(UserService);

  public readonly layoutService = inject(LayoutService)
  readonly panelOpenState = signal(false);
  public readonly activatedRoute = inject(ActivatedRoute);

  private fullExporter = viewChild.required<ExportComponent>("fullExporter")

  isModalOpen = signal(false);

  closeModal() {
    this.router.navigate(['.'], { relativeTo: this.activatedRoute });
  }


  customData: unknown & { uuid: string } | null = null;

  get timesheet() {
    return this.customData as TimeSheetDataModel;
  }

  header = signal(" ")

  isUpdating = signal(false)

  data = toSignal<dataRouteInfo>(this.activatedRoute.data as Observable<dataRouteInfo>)

  selectedQuery = signal('');
  show = signal(false);
  showFilterSidenav = signal(false);
  queries = model<SavedQuery[]>([]);

  currentRow = signal(undefined);
  selectedRowsData = model<{ selectedRows?: Array<any>, selectedAll?: boolean }>()
  allowSelection = computed(() => {
    return this.data()?.allowSelection || false;
  })

  filters: FilterConfig[] = [];

  currentFilters = linkedSignal(() => {
    const _ = this.data()?.baseFilters;
    if (_) {
      if (typeof _ === 'function') {
        return _(this);
      }
      return _;
    }
    return {};
  })

  filtersNode = model<FilterNodeDto>();

  sorting = linkedSignal(() => {
    const _ = this.data()?.baseSorting;
    if (_) {
      if (typeof _ === 'function') {
        return _(this);
      }
      return _;
    }
    return [];
  })

  queriesLoaded = linkedSignal(() => {
    const _ = this.data()?.baseQueries;
    if (_) {
      if (typeof _ === 'function') {
        return _(this);
      }
      return _;
    }
    return [];
  })


  constructor() {
    const titleData = this.data()?.title;
    if (titleData) {
      if (typeof titleData === 'function') {
        const observableTitle = titleData(this);
        observableTitle.subscribe(title => this.header.set(title));
      } else {
        this.header.set(titleData);
      }
    }

    effect(() => {
      const queries = this.queries();
      console.log('queries', queries);
    });

    effect(() => {
      const data = this.data();
      this.queries.set(this.loadSavedQueries())
    });

  }


  showUpdateForm($event: any) {
    this.currentRow.set($event)
    this.show.set(true)
    this.isUpdating.set(true)
  }

  onShowFilters() {
    this.showFilterSidenav.set(true);
  }

  onFiltersApplied(groups: FilterGroup[]) {
    // Costruisci FilterNodeDto per API
    const filterNode: FilterNodeDto = {
      type: 'Group',
      logic: 'And', // Gruppi combinati con AND
      children: groups.map(group => ({
        type: 'Group',
        logic: group.logic === 'And' ? 'And' : 'Or',
        children: group.filters.map(f => ({
          type: 'Condition',
          property: f.field,
          operator: f.operator,
          value: f.value
        }))
      }))
    };

    this.filtersNode.set(filterNode);
  }

  private getFieldLabel(fieldKey: string): string {
    const field = this.filters.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  }

  private getOperatorHumanLabel(operator: string): string {
    const labels: Record<string, string> = {
      'equals': 'è uguale a',
      'notEquals': 'è diverso da',
      'contains': 'contiene',
      'startsWith': 'inizia con',
      'endsWith': 'finisce con',
      'greaterThan': 'è maggiore di',
      'lessThan': 'è minore di',
      'greaterOrEqual': 'è maggiore o uguale a',
      'lessOrEqual': 'è minore o uguale a'
    };
    return labels[operator] || operator;
  }

  protected entityReady($event: UiResourceMetadata) {
    this.filters = [];
    const table = $event.tables?.[this.data()?.tableName || 'default'];
    if (table) {
      const fields = table.columns || {};
      Object.entries(fields).filter(([k, v]) => v.filterable && !v.hidden).forEach(([k, v]) => {
        const field = $event.fields![v.name!];
        const fieldType: 'text' | 'number' | 'boolean' | 'date' | 'select' =
          field.type === 'string' ? 'text' :
            field.type === 'number' ? 'number' :
              field.type === 'boolean' ? 'boolean' :
                (field.type === 'date' || field.type === 'datetime-local') ? 'date' :
                  (field.type === 'enum' || field.isEnum) ? 'select' : 'text';

        this.filters.push({
          key: k,
          label: v.label || field.label || k,
          type: fieldType,
          options: field.isEnum ? (field.options || []).filter(opt => opt.label && opt.value).map((opt) => ({
            label: opt.label!.toString(),
            value: opt.value!
          })) : undefined
        } as FilterConfig);
      });
    }
  }

  handleOnSubmit($event: {
    valid: boolean,
    value: any,
    formGroup: FormGroup,
    kind: FormKind, error?: any,
    submitted: boolean
  }) {
    if (!$event.submitted) {
      this.snackBar.open('Verifica i dati inseriti', 'Chiudi', { duration: 3000, panelClass: 'error-snack' });
      return;
    }
    if ($event.valid) {
      this.snackBar.open('Dati salvati con successo!', 'Chiudi', { duration: 3000, panelClass: 'success-snack' });
      this.show.set(false);
    } else {
      this.snackBar.open('Errore nel salvataggio dei dati. Controlla il modulo.', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
    }
  }

  onDeleteForm($event: { value: any, id: any, entity: UiResourceMetadata }) {

  }

  confirmTimesheet() {
    if (!this.customData?.uuid) {
      this.snackBar.open('UUID timesheet mancante', 'Chiudi', { duration: 3000, panelClass: 'error-snack' });
      return;
    }

    this.snackBar.open('Confermi l\'approvazione del timesheet? Attenzione verrá inviata un\'email di conferma al consulente', 'Conferma', {
      duration: 10000,
      panelClass: 'success-snack'
    }).onAction().subscribe(() => {
      this.timesheetService.approveTimesheet({
        id: this.customData?.uuid!
      }).subscribe({
        next: () => {
          this.snackBar.open('Timesheet confermato con successo!', 'Chiudi', { duration: 3000, panelClass: 'success-snack' });
          this.show.set(false);
          (this.customData as any).approved = true;
        }
      });
    });


  }
  rejectTimesheet() {

  }
  resetTimesheet() {
    if (!this.customData?.uuid) {
      this.snackBar.open('UUID timesheet mancante', 'Chiudi', { duration: 3000, panelClass: 'error-snack' });
      return;
    }

    this.snackBar.open('Confermi di voler rigettare il timesheet? Il consulente riceverá una notifica email', 'Conferma', {
      duration: 10000,
      panelClass: 'error-snack'
    }).onAction().subscribe(() => {
      this.timesheetService.resetTimesheet({
        id: this.customData?.uuid!
      }).subscribe({
        next: () => {
          this.snackBar.open('Timesheet resettato con successo!', 'Chiudi', { duration: 3000, panelClass: 'success-snack' });
          this.show.set(false);
          (this.customData as any).approved = false;
          (this.customData as any).submitted = false;
        }
      });
    });


  }

  toArrayFromSet(timesheets: Set<any>) {
    return [...timesheets];
  }


  // LocalStorage persistence
  filtersGroup = signal<FilterGroup[]>([]);
  private loadSavedQueries(): SavedQuery[] {
    const data = this.data();
    if (!data) return [];
    try {
      const stored = localStorage.getItem('filter_saved_queries_' + data.entityName);
      const custom = this.queriesLoaded();
      if (stored) {
        const parsed = JSON.parse(stored);
        return [custom, ...parsed.map((q: any) => ({
          ...q,
          createdAt: new Date(q.createdAt)
        }))];
      } else if (custom && custom.length > 0) {
        return custom;
      }

    } catch (e) {
      console.error('Error loading saved queries:', e);
    }
    return [];
  }

  private saveSavedQueries(queries: SavedQuery[]): void {
    try {
      localStorage.setItem('filter_saved_queries', JSON.stringify(queries));
    } catch (e) {
      console.error('Error saving queries:', e);
    }
  }

  async exportAll(items: { data: InvoicesDataModel[] }) {
    this.layoutService.showSpinner();
    let hasError = false;
    let missingProforma = false;
    const zip = new JSZip();

    const processDoc = async (timesheet: TimeSheetDataModel) => {
      if (!timesheet.documentId) return null;
      try {
        const data = await lastValueFrom(this.invoicesService.getProforma({ id: timesheet.documentId }, 'body', false, { context: new HttpContext().set(PREVENT_SPINNER, true) }));
        const proformaBlob = await fetch(data.url)
          .then(response => response.blob())
          .then(blob => {
            return blob;
          })

        return proformaBlob;
      } catch (error) {
        hasError = true;
        console.error(`Errore nel recupero della proforma per documento ${timesheet.documentId}`, error);
        return null;
      }
    }

    let month = null;
    let year = null;
    for (const row of items.data) {
      month ??= row.month;
      year ??= row.year;
      const _data = await lastValueFrom(this.invoicesService.invoicesAvailableCustomerGet({ customer: row.company!.id!, year: row.year!, month: row.month! }, 'body', false, { context: new HttpContext().set(PREVENT_SPINNER, true) }));
      const grouped = _data.grouped;
      const folder = zip.folder(row.company!.businessName!!);

      if (grouped) {
        const first = _data.timesheets?.[0];
        if (first?.documentId) {
          const proforma = await processDoc(first);
          if (proforma)
            folder?.file(`proforma_${row.company!.businessName}.pdf`, proforma);
        } else {
          missingProforma = true;
        }
        for (const timesheet of (_data.timesheets || []).filter(x => x.total && x.total > 0)) {
          const timesheetBlob = await this.fullExporter().export([timesheet], true);
          for (const blob of Object.entries(timesheetBlob[row.company!.id!])) {
            folder?.file(`timesheet_${timesheet.user?.fullName}.pdf`, blob[1]);
          }
        }
      } else {
        for (const timesheet of (_data.timesheets || []).filter(x => x.total && x.total > 0)) {
          year ??= timesheet.year;
          month ??= timesheet.month;

          try {
            const timesheetExport = await this.fullExporter().export([timesheet], true);
            if (timesheet.documentId) {
              const proformaBlob = await processDoc(timesheet);

              if (proformaBlob) {
                folder?.file(`proforma_${timesheet.user?.fullName}.pdf`, proformaBlob);
              }
            } else
              missingProforma = true;
            for (const blob of Object.entries(timesheetExport[row.company!.id!])) {
              folder?.file(`timesheet_${timesheet.user?.fullName}.pdf`, blob[1]);
            }
          } catch (error) {
            hasError = true;
            console.error(`Errore nel download del documento ${timesheet.documentId}`, error);
          }
        }

      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Proforma e Timesheet ${month}/${year}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    this.layoutService.hideSpinner();
    if (hasError)
      this.snackBar.open('Uno o piú documenti non sono piú disponibili. Se hai giá trasformato le proforma in fatture queste non sono più disponibili.', 'Chiudi', { duration: 5000, panelClass: 'error-snack' });
    if (missingProforma)
      this.snackBar.open('Una o piú proforma non sono disponibili.', 'Chiudi', { duration: 5000, panelClass: 'error-snack' });
  }

  openUploadModal() {
    // TODO: Caricare i documenti già esistenti dal backend

    const timesheet = this.customData as TimeSheetDataModel;
    const dialogRef = this.dialog.open(DocumentUploadDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: {
        timesheet
      }
    });
  }

  updateEmployeesCosts(inputFileEvent: Event) {
    const input = inputFileEvent.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.layoutService.showSpinner();
    this.userService.updateCosts({ file }).subscribe({
      next: (result) => {
        this.layoutService.hideSpinner();
        const skippedInfo = result.skippedFiscalCodes?.length
          ? ` Codici fiscali saltati: ${result.skippedFiscalCodes.join(', ')}`
          : '';
        this.snackBar.open(
          `Costi importati: ${result.imported ?? 0}, saltati: ${result.skipped ?? 0}.${skippedInfo}`,
          'Chiudi',
          { duration: 5000, panelClass: 'success-snack' }
        );
      },
      error: (error) => {
        this.layoutService.hideSpinner();
        console.error('Errore nel caricamento dei costi dipendenti', error);
        this.snackBar.open('Errore nel caricamento dei costi dipendenti.', 'Chiudi', { duration: 5000, panelClass: 'error-snack' });
      }
    });

    // Consente di ricaricare lo stesso file in caso di nuovo upload
    input.value = '';
  }
}
