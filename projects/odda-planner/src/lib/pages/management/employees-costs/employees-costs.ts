import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LayoutService } from 'core-library'
import { EmployeeCostGroupDataModel, UserService } from '../../../api'

@Component({
  selector: 'app-employees-costs',
  imports: [FormsModule, CurrencyPipe, MatMenuModule, MatCheckboxModule],
  templateUrl: './employees-costs.html',
  styleUrl: './employees-costs.scss',
})
export class EmployeesCosts {
  private readonly snackBar = inject(MatSnackBar);
  public readonly layoutService = inject(LayoutService)

  private readonly userService = inject(UserService);

  // I mesi partono da 0 (Gennaio = 0) come nel resto dell'app
  readonly monthOptions = [
    { value: 0, label: 'Gennaio' },
    { value: 1, label: 'Febbraio' },
    { value: 2, label: 'Marzo' },
    { value: 3, label: 'Aprile' },
    { value: 4, label: 'Maggio' },
    { value: 5, label: 'Giugno' },
    { value: 6, label: 'Luglio' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Settembre' },
    { value: 9, label: 'Ottobre' },
    { value: 10, label: 'Novembre' },
    { value: 11, label: 'Dicembre' },
  ];

  readonly yearOptions = (() => {
    const currentYear = new Date().getFullYear();
    const options = [{ value: 0, label: 'Tutti gli anni' }];
    for (let year = currentYear + 1; year >= currentYear - 5; year--) {
      options.push({ value: year, label: year.toString() });
    }
    return options;
  })();

  // Array vuoto = tutti i mesi
  selectedMonths = signal<number[]>([]);
  selectedYear = signal<number>(new Date().getFullYear());

  expandedGroups = signal<Set<string>>(new Set());

  data = rxResource({
    params: () => ({
      months: this.selectedMonths(),
      year: this.selectedYear()
    }),
    stream: ({ params }) => this.userService.getEmployeeCosts({
      month: params.months.length ? params.months : [0,1,2,3,4,5,6,7,8,9,10,11],
      year: params.year || undefined
    })
  })

  toggleMonth(monthValue: number) {
    const current = this.selectedMonths();
    if (current.includes(monthValue)) {
      this.selectedMonths.set(current.filter(m => m !== monthValue));
    } else {
      this.selectedMonths.set([...current, monthValue]);
    }
  }

  isMonthSelected(monthValue: number): boolean {
    return this.selectedMonths().includes(monthValue);
  }

  selectedMonthsLabel = computed(() => {
    const months = this.selectedMonths();
    if (months.length === 0) return 'Tutti i mesi';
    return months
      .slice()
      .sort((a, b) => a - b)
      .map(m => this.monthOptions[m]?.label)
      .join(', ');
  });

  groups = computed(() => this.data.value()?.items || []);

  totalGrossCosts = computed(() => this.groups().reduce((sum, group) => sum + (group.totals?.grossCosts || 0), 0));

  groupKey(group: EmployeeCostGroupDataModel): string {
    return group.fiscalCode || `${group.name}-${group.surname}`;
  }

  isExpanded(group: EmployeeCostGroupDataModel): boolean {
    return this.expandedGroups().has(this.groupKey(group));
  }

  toggleExpand(group: EmployeeCostGroupDataModel) {
    const key = this.groupKey(group);
    const next = new Set(this.expandedGroups());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expandedGroups.set(next);
  }

  monthLabel(month?: number | null): string {
    return this.monthOptions.find(m => m.value === month)?.label || (month ?? '-').toString();
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
        this.data.reload();
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
