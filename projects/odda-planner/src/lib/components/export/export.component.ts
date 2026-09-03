import { ChangeDetectorRef, Component, ElementRef, Input, model, output, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TimeSheetDataModel, WorkingDayDataModel } from '../../api/model/models'
declare const html2pdf: any;
@Component({
  selector: 'app-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss'],
  standalone: true,
  imports: [
    CommonModule
  ]
})
export class ExportComponent {
  timeSheets: Array<TimeSheetDataModel> = [];
  @ViewChild('content', { static: true }) content!: ElementRef;

  processing = model<{ progress: number, total: number }>({ progress: 0, total: 0 });

  constructor(private detect: ChangeDetectorRef) {
  }

  fillMissingDays(timesheet: TimeSheetDataModel): TimeSheetDataModel {
    if (!timesheet.month || !timesheet.year) {
      return timesheet;
    }

    // Crea un set di giorni esistenti per lookup veloce
    const existingDays = new Set(
      timesheet.workingDays.map(wd => {
        const date = new Date(wd.day!);
        return date.toISOString().split('T')[0];
      })
    );

    // Determina il primo e l'ultimo giorno del mese
    const year = timesheet.year;
    const month = timesheet.month; // month è 0-based (0 = gennaio)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Aggiungi i giorni mancanti
    const currentDate = new Date(firstDay);
    while (currentDate <= lastDay) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (!existingDays.has(dateStr)) {
        // Aggiungi il giorno mancante con 0 ore
        timesheet.workingDays.push({
          day: dateStr,
          hours: 0,
          extra: 0,
          isHoliday: false,
          timesheetId: timesheet.id
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timesheet;
  }

  getHours(timesheet: TimeSheetDataModel) {
    return timesheet.workingDays.filter(

      f => (f.hours || 0) > 0 || (f.extra || 0) > 0
    ).reduce(
      (tot, day) => {
        tot = tot + (day.hours || 0) + (day.extra || 0);
        return tot;
      }, 0
    );
  }

  getDays(timesheet: TimeSheetDataModel) {
    return timesheet.workingDays.filter(
      f => (f.hours || 0) > 0 || (f.extra || 0) > 0
    ).length;
  }

  dayName(dateString: string) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = new Date(dateString);
    const dayName = days[d.getDay()];
    return dayName;
  }

  monthName(month: number) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return monthNames[month]
  }

  getBackground(day: WorkingDayDataModel) {
    return day.isHoliday ? '#c9c9c9' : 'white'
  }

  async export(timeSheets: Array<TimeSheetDataModel>, onlyPreview = false, autoDownload: 'auto' | 'none' = 'auto'): Promise<Record<number, Record<number, Blob>>> {
    this.processing.set({ progress: 0, total: timeSheets.length });
    const dict: any = {};
    const blobs: Record<number, Record<number, Blob>> = {};

    timeSheets.forEach(f => {
      dict[f.client!.businessName!] = dict[f.client!.businessName!] || [];
      dict[f.client!.businessName!].push(f);
    })
    const groups = Object.values<TimeSheetDataModel[]>(dict);
    for (const group of groups) {
      blobs[group[0].client!.id!] = blobs[group[0].client!.id!] || {};
      if (group.length) {
        for (let j = 0; j < group.length; j++) {
          if (onlyPreview) {
            this.timeSheets ??= [];
            this.timeSheets[j] = group[j];
            this.fillMissingDays(this.timeSheets[j]);
            this.timeSheets[j].workingDays = this.timeSheets[j].workingDays.sort(
              (a, b) => new Date(a.day!).getTime() - new Date(b.day!).getTime()
            )
          } else {
            this.timeSheets = [group[j]];
            this.fillMissingDays(this.timeSheets[0]);
            this.timeSheets[0].workingDays = this.timeSheets[0].workingDays.sort(
              (a, b) => new Date(a.day!).getTime() - new Date(b.day!).getTime()
            )
          }
          this.detect.detectChanges();

          await new Promise((resolve) => {
            setTimeout(
              () => {
                resolve(true);
              }, 200
            );
          });

          // Crea un documento PDF separato per ogni timesheet/pagina
          const singlePageDoc = html2pdf().set({
            html2canvas: { scale: 2.5, useCORS: true },
            jsPDF: { compress: true, format: 'a4', orientation: 'portrait' },
            image: { type: 'jpeg', quality: 0.19 },
          }).from(this.content.nativeElement).toContainer().toCanvas().toPdf();
          
          const blobPage = await singlePageDoc.output('blob');
          blobs[group[0].client!.id!][group[j].id!] = blobPage;

          if (!onlyPreview && autoDownload !== 'none') {
            await singlePageDoc.save(`${group[0].client!.businessName}_${group[j].id}.pdf`);
          }

          this.processing.set({ progress: this.processing().progress + 1, total: this.processing().total });
        }
      }
    }

    return blobs;
  }

  getTotalInvoice(timesheet: TimeSheetDataModel) {
    const hourRate = timesheet.order!.hourRate!;
    const tot = this.getHours(timesheet);
    return hourRate * tot;
  }
}
