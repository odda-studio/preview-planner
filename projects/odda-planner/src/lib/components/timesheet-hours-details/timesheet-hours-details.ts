import { Component, computed, inject, input } from '@angular/core';
import { DataTableComponent, IBaseColumn } from '../../../../../../dist/core-library/types/core-library';
import { TimeSheetDataModel, UiFieldMetadata, UiTableColumnMetadata } from '../../api';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from "@angular/router";
import { ExportComponent } from "../export/export.component";
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'lib-timesheet-hours-details',
  imports: [CurrencyPipe, RouterLink, ExportComponent],
  template: `
  <app-export #exporter class="!hidden" />
  <div class="flex flex-col gap-2">
     <div>
    {{workedHours()}} su {{availableHours()}} ore
  </div>
  <div>
    Fatturato: {{actualAmount() | currency : 'EUR'}} su {{maxAmount() | currency : 'EUR'}}  
</div>
@if(showMoreAvailable()) {
  <div class="flex gap-4">
    <a class="text-blue-500 underline" [routerLink]="['/','management','timesheets', this.timesheet().id]">Mostra Dettagli</a>
<svg xmlns="http://www.w3.org/2000/svg" (click)="preview()" viewBox="0 0 24 24" fill="currentColor" class="size-5 cursor-pointer">
  <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
  <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
</svg>
</div>

}
@if(hasProforma() && isExternal()) {
  <div class="flex items-center gap-1 text-green-500">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
      <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.06-1.06l-3.5 3.5-1.5-1.5a.75.75 0 0 0-1.06 1.06l2.03 2.03a.75.75 0 0 0 1.06 0l4.03-4.03Z" clip-rule="evenodd" />
    </svg>
    <span class="text-black">Proforma caricata</span>
  </div>
}
@if(documentCounts()) {
<div>
  <span class="">{{documentCounts()}} documenti aggiuntivi</span>
</div>

}



 
  `,
  styleUrl: './timesheet-hours-details.scss',
})
export class TimesheetHoursDetails {
  
  private readonly dialog = inject(MatDialog);
  showMoreAvailable = input<boolean>(true);
  timesheet = input.required<TimeSheetDataModel>();

  workedHours = computed(() => {
    const sheet = this.timesheet();
    return sheet.workingDays.reduce((total, day) => {
      return total + (day.hours ?? 0);
    }, 0)
  })

  availableHours = computed(() => {
    const sheet = this.timesheet();
    const all = sheet.workingDays.filter(x => !x.isHoliday).reduce((total, day) => {
      return total + (sheet.order?.hours ?? 8)
    }, 0)
    return all;
  })

  actualAmount = computed(() => {
    const workedHours = this.workedHours();
    return workedHours * (this.timesheet().order?.hourRate ?? 0);
  })

  maxAmount = computed(() => {
    const availableHours = this.availableHours();
    return availableHours * (this.timesheet().order?.hourRate ?? 0);
  })

  hasProforma = computed(() => {
    const media = this.timesheet().medias?.find(x => x.isProforma);
    return !!media;
  })

  documentCounts = computed(() => {
    const media = this.timesheet().medias?.filter(x => !x.isProforma);
    return media?.length;
  })

  isExternal = computed(() => {
    const user = this.timesheet().user;
    return !!user?.roles.find(x => x.name === 'EXTERNAL');
  })

  preview() {
     const ref = this.dialog.open(ExportComponent, {
      width: '1200px',
      maxWidth: '90vw',
      height: '80vh',
      panelClass: 'pdf-preview-dialog',
    });

    ref.componentInstance.export([this.timesheet()], true);
  }
}

@Component({
  selector: 'lib-timesheet-hours-details-column',
  imports: [TimesheetHoursDetails],
  templateUrl: './timesheet-hours-details.html',
  styleUrl: './timesheet-hours-details.scss',
})
export class TimesheetHoursDetailsColumn implements IBaseColumn<TimeSheetDataModel> {
  field = input.required<UiFieldMetadata>();
  tableField = input.required<UiTableColumnMetadata>();
  textValue = computed(() => {
    return ""
  })
  context = input.required<TimeSheetDataModel>();
  value = input.required<any>();
  componentContext = input.required<DataTableComponent<any>>();
}
