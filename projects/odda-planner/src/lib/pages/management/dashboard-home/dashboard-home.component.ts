import { Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TimesheetService, WorkingDayDataModel, WorkingDayService, UserService, OrderDataModel, TimeSheetDataModel } from '../../../api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarComponent, CalendarEventTemplate, CalendarEvent, TEMPLATES_TOKEN, PREVENT_SPINNER, Day } from 'core-library';
import { map, of, switchMap, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from '../../../services/authentication.service';
import { watchParam, watchQueryParam } from '../../../signals';
import { DomSanitizer } from '@angular/platform-browser';
import { StateService } from '../../../services/state.service';
import { RouterLink } from "@angular/router";
import { HttpContext } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { DocumentUploadDialogComponent, DocumentUploadResult } from './document-upload-dialog';


@Component({
  selector: 'hour-selector',
  standalone: true,
  imports: [FormsModule],
  template: `
  
  @if (checkDays(data().date, data().data.order.endDate!)) {
<div class="flex justify-center items-center w-full h-full overflow-hidden text-sm"><select
                  [(ngModel)]="data().data.hours"
                  (ngModelChange)="setValue($event, data().data)"
                  class="text-white text-lg px-2 py-1 rounded outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option [value]="0">0</option>
                  <option [value]="1">1</option>
                  <option [value]="2">2</option>
                  <option [value]="3">3</option>
                  <option [value]="4">4</option>
                  <option [value]="5">5</option>
                  <option [value]="6">6</option>
                  <option [value]="7">7</option>
                  <option [value]="8">8</option>
                  <option [value]="9">9</option>
                  <option [value]="10">10</option>
                </select></div>
  }
  `
})
export class HourSelectorComponent {
  data = input.required<CalendarEvent<WorkingDayDataModel & { order: OrderDataModel }>>();
  private readonly workingDayService = inject(WorkingDayService);
  valueChanged = output<number>();


  checkDays(date: Date, _: string) {

    if (!date || !_) return false;
    const endDate = new Date(_);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()) <= new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  }

  setValue($event: any, item: any) {
    this.workingDayService.patchWorkingDay({
      id: item.id,
      workingDayDataModel: {
        hours: $event
      }
    }, 'body', false, {
      context: new HttpContext().set(PREVENT_SPINNER, true)
    }).subscribe(x => {
      this.valueChanged.emit($event);
      this.data().onChange?.(item);
    })
  }
}


@Component({
  selector: 'lib-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarComponent, CalendarEventTemplate, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  providers: [
    {
      provide: TEMPLATES_TOKEN,
      useValue: {
        day: HourSelectorComponent
      }
    }
  ]
})
export class DashboardHomeComponent {

  private readonly timesheetService = inject(TimesheetService);
  private readonly workingDayService = inject(WorkingDayService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthenticationService)
  private readonly sanitizer = inject(DomSanitizer);
  private readonly userService = inject(UserService);
  private readonly stateService = inject(StateService);
  private readonly sessionService = inject(AuthenticationService);
  private readonly dialog = inject(MatDialog);

  hidden = signal(true);

  isExternal = this.authService.isExternal;

  accessToken = this.sessionService.accessToken;

  dashboardIframe = viewChild<ElementRef<HTMLIFrameElement>>('dashboardIframe');

  _ = watchQueryParam('link');

  userId = watchParam('id');

  links = this.authService.links;

  watchingUser = rxResource({
    params: () => this.userId(),
    stream: (params) => {
      if (params.params)
        return this.userService.getUserById({ id: Number(params.params) }).pipe(tap(user => {
          if (user) {
            this.stateService.setUser(user);
          }
        }));
      return of(null);
    }
  })


  link = computed(() => {
    const link = this._();

    const foundLink = this.links.value()?.find(x => x.links.find((l: any) => l.key === link))?.links.find((l: any) => l.key === link);
    if (!foundLink) return null;

    return this.sanitizer.bypassSecurityTrustResourceUrl(foundLink.value);
  })

  isHr = computed(() => this.authService.isHr())

  // Signal per gestire il loading state del submit
  submittingTimesheetId = signal<string | null>(null);

  // Signal per gestire la modalità di visualizzazione (calendario o lista) per ogni timesheet
  viewModes = signal<Map<string, 'calendar' | 'list'>>(new Map());

  timesheets = rxResource({
    params: () => ({ watch: this.userId(), me: this.authService.me() }),
    stream: (params) => {
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      const today = new Date();
      const show = (month: number) => {
        if (month === today.getMonth()) return true;
        if (month === today.getMonth() - 1) return today.getDate() < 15;
        return false;
      }
      if (params.params.watch)
        return this.timesheetService.getTimesheetsByUserId({ id: Number(params.params.watch), month, year }, 'body', false, { context: new HttpContext().set(PREVENT_SPINNER, true) }).pipe(
          map(timesheets => {

            return timesheets.filter(ts => show(ts.month!)).map(ts => {
              return {
                ...ts,
                from: new Date(ts.month!, ts.year!, 1),
                to: new Date(ts.month! + 1, ts.year!, 0),
                order: {
                  ...ts.order,
                  endDate: new Date(ts.order?.endDate!),
                  startDate: new Date(ts.order?.startDate!)
                },
                events: ts.workingDays.map(event => {
                  return {
                    date: new Date(event.day!),
                    data: { ...event, order: ts.order },
                    id: event.id,
                    template: 'day',
                    click: (data: WorkingDayDataModel & { order: OrderDataModel }) => {
                      console.log('Clicked on working day:', data);
                    },
                    order: 1,
                    onChange: (data: Day) => {
                      this.timesheets.reload();
                    }
                  } as CalendarEvent<WorkingDayDataModel & { order: OrderDataModel }>
                })
              }
            })
          }),
        );
      return this.timesheetService.getUserTimesheets({
        month,
        year
      }, 'body', false, { context: new HttpContext().set(PREVENT_SPINNER, true) }).pipe(
        map(timesheets => {
          return timesheets.filter(ts => show(ts.month!)).map(ts => {
            return {
              ...ts,
              from: new Date(ts.month!, ts.year!, 1),
              to: new Date(ts.month! + 1, ts.year!, 0),
              order: {
                ...ts.order,
                endDate: new Date(ts.order?.endDate!),
                startDate: new Date(ts.order?.startDate!)
              },
              events: ts.workingDays.map(event => {
                return {
                  date: new Date(event.day!),
                  data: { ...event, order: ts.order },
                  id: event.id,
                  template: 'day',
                  click: (data: WorkingDayDataModel & { order: OrderDataModel }) => {
                    console.log('Clicked on working day:', data);
                  },
                  order: 1,
                  onChange: (data: Day) => {
                    this.timesheets.reload();
                  }
                } as CalendarEvent<WorkingDayDataModel & { order: OrderDataModel }>
              })
            }
          })
        }),
      );
    }
  });


  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stateService.setUser(null);
    });

    effect(() => {
      const link = this.link();
      if (link) {
        this.hidden.set(true);
      }
    })
  }

  /**
   * Calcola la data della Pasqua per un dato anno usando l'algoritmo di Computus
   */
  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  /**
   * Verifica se una data è un giorno festivo in Italia
   */
  isHoliday: (date: Date) => boolean = (date: Date) => {
    const day = date.getDay();

    // Sabato e domenica
    if (day === 0 || day === 6) {
      return true;
    }

    const month = date.getMonth() + 1; // getMonth() ritorna 0-11
    const dayOfMonth = date.getDate();
    const year = date.getFullYear();

    // Festività fisse italiane
    const fixedHolidays = [
      { month: 1, day: 1 },   // Capodanno
      { month: 1, day: 6 },   // Epifania
      { month: 4, day: 25 },  // Festa della Liberazione
      { month: 5, day: 1 },   // Festa dei Lavoratori
      { month: 6, day: 2 },   // Festa della Repubblica
      { month: 8, day: 15 },  // Ferragosto
      { month: 11, day: 1 },  // Ognissanti
      { month: 12, day: 8 },  // Immacolata Concezione
      { month: 12, day: 25 }, // Natale
      { month: 12, day: 26 }  // Santo Stefano
    ];

    if (fixedHolidays.some(h => h.month === month && h.day === dayOfMonth)) {
      return true;
    }

    // Festività mobili: Pasqua e Lunedì dell'Angelo
    const easter = this.calculateEaster(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);

    // Verifica se la data corrisponde a Pasqua o Pasquetta
    if (
      (date.getDate() === easter.getDate() &&
        date.getMonth() === easter.getMonth() &&
        date.getFullYear() === easter.getFullYear()) ||
      (date.getDate() === easterMonday.getDate() &&
        date.getMonth() === easterMonday.getMonth() &&
        date.getFullYear() === easterMonday.getFullYear())
    ) {
      return true;
    }

    return false;
  };


  setValue($event: any, item: any) {
    this.workingDayService.patchWorkingDay({
      id: item.id,
      workingDayDataModel: {
        hours: $event
      }
    }, 'body', false, {
      context: new HttpContext().set(PREVENT_SPINNER, true)
    }).subscribe(x => {
      this.timesheets.reload();
    })
  }

  // Metodo per confermare/submit il timesheet
  confirmTimesheetSubmit(timesheetId: string) {
    if (!timesheetId) return;

    // Mostra snackbar di conferma
    const snackBarRef = this.snackBar.open(
      'Sei sicuro di voler confermare il timesheet? Conferma solo se sei certo che tutte le ore inserite siano corrette.',
      'Conferma',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: 'success-snack'
      }
    );

    // Ascolta l'azione di conferma
    snackBarRef.onAction().subscribe(() => {
      // Imposta il loading state
      this.submittingTimesheetId.set(timesheetId);

      this.timesheetService.confirmTimesheet({ id: timesheetId.toString() })
        .subscribe({
          next: () => {
            this.snackBar.open('Timesheet confermato con successo!' + (this.sessionService.isExternal() ? ' Ricordati di caricare i documenti necessari alla fatturazione, trovi il pulsante vicino il nome del cliente!' : ''), 'Chiudi', {
              duration: 4000,
              panelClass: 'success-snack',
            });
            // Ricarica i timesheets per aggiornare lo stato
            this.timesheets.reload();
            this.submittingTimesheetId.set(null);
          },
          error: (error) => {
            console.error('Errore durante la conferma del timesheet:', error);
            this.snackBar.open('Errore durante la conferma del timesheet', 'Chiudi', {
              duration: 5000,
              panelClass: 'error-snack'
            });
            this.submittingTimesheetId.set(null);
          }
        });
    });
  }

  getMonthName(month: number): string {
    if (month === new Date().getMonth()) return '';
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return monthNames[month] || '';
  }

  /**
   * Invia il token di autenticazione all'iframe tramite postMessage
   */
  sendAuthToken() {
    const iframe = this.dashboardIframe();
    if (!iframe?.nativeElement?.contentWindow) return;

    const token = this.sessionService.accessToken();
    if (!token) {
      console.warn('Token di autenticazione non trovato');
      return;
    }

    setTimeout(() => {
      // Invia il token all'iframe
      iframe.nativeElement.contentWindow!.postMessage(
        {
          type: 'AUTH_TOKEN',
          token: token
        },
        '*' // In produzione, specifica l'origin esatto dell'iframe per maggiore sicurezza
      );

      setTimeout(() => {
        this.hidden.set(false);
      }, 200)

    }, 100)


  }

  checkDays(date: Date, endDate: Date) {
    if (!date || !endDate) return false;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()) <= new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  }

  /**
   * Toggle tra vista calendario e lista per un timesheet
   */
  toggleViewMode(timesheetId: string) {
    const currentModes = this.viewModes();
    const currentMode = currentModes.get(timesheetId) || 'calendar';
    const newMode = currentMode === 'calendar' ? 'list' : 'calendar';
    currentModes.set(timesheetId, newMode);
    this.viewModes.set(new Map(currentModes));
  }

  /**
   * Ottiene la modalità di visualizzazione corrente per un timesheet
   */
  getViewMode(timesheetId: string): 'calendar' | 'list' {
    return this.viewModes().get(timesheetId) || 'calendar';
  }

  /**
   * Aggiorna la descrizione/note di un working day
   */
  setDescription(event: any, workingDayId: number) {
    const description = event.target.value;
    this.workingDayService.patchWorkingDay({
      id: workingDayId,
      workingDayDataModel: {
        description: description
      }
    }, 'body', false, {
      context: new HttpContext().set(PREVENT_SPINNER, true)
    }).subscribe(x => {
      this.timesheets.reload();
    });
  }

  /**
   * Ottiene tutti i giorni del mese per la vista lista
   */
  getMonthDays(timesheet: any): any[] {
    const year = timesheet.year;
    const month = timesheet.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const workingDay = timesheet.workingDays.find((wd: WorkingDayDataModel) => {
        const wdDate = new Date(wd.day!);
        return wdDate.getDate() === day && wdDate.getMonth() === month && wdDate.getFullYear() === year;
      });

      days.push({
        date: date,
        dayNumber: day,
        workingDay: workingDay,
        isHoliday: this.isHoliday(date),
        isAfterEndDate: !this.checkDays(date, timesheet.order.endDate)
      });
    }

    return days;
  }

  /**
   * Formatta la data per la visualizzazione
   */
  formatDate(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return `${days[date.getDay()]} ${date.getDate()}`;
  }

  /**
   * Verifica se un timesheet ha almeno un documento di tipo proforma caricato
   */
  hasProformaDocument(timesheet: any): boolean {
    return timesheet?.medias?.some((m: any) => m.isProforma) ?? false;
  }

  /**
   * Apre il dialog di upload per un timesheet specifico
   */
  openUploadModal(timesheetId: string) {
    // TODO: Caricare i documenti già esistenti dal backend

    const timesheet = this.timesheets.value()?.find(x => x.uuid === timesheetId);
    const dialogRef = this.dialog.open(DocumentUploadDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: {
        timesheet
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.timesheets.reload();
    })
  }
}
