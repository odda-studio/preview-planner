import {
  AfterContentChecked,
  AfterViewInit,
  Component,
  contentChildren,
  ContentChildren, effect, EventEmitter,
  inject,
  input,
  Input,
  OnChanges,
  OnInit, Output,
  QueryList,
  SimpleChanges, TemplateRef,
  Type
} from '@angular/core';
import {CalendarEventTemplate} from "../calendar-event-template";
import {DayItem, Day, TEMPLATES_TOKEN} from "../models";
import { NgTemplateOutlet, NgComponentOutlet } from '@angular/common';

export const sameDay = (a: Date, b: Date) => {
  const day = a.getDate() === b.getDate();
  const month = a.getMonth() === b.getMonth();
  const year = a.getFullYear() === b.getFullYear();
  return day && month && year;
}
@Component({
  selector: 'app-calendar-month-view',
  templateUrl: './calendar-month-view.component.html',
  imports: [
    NgComponentOutlet
],
  styleUrls: ['./calendar-month-view.component.scss']
})
export class CalendarMonthViewComponent {
  calendarId = input<string>(Math.random().toString(36).substring(2));
  
  templateList = inject<Record<string, Type<any>>>(TEMPLATES_TOKEN)

  @Output() dayClicked: EventEmitter<DayItem> = new EventEmitter<DayItem>();
  @Output() dbClicked: EventEmitter<{ event: MouseEvent, item: Day }> = new EventEmitter<{event: MouseEvent; item: Day}>();
  
  @Input() items: Array<DayItem> = [];
  @Output() selectionChange: EventEmitter<Array<Day>> = new EventEmitter<Array<Day>>();

  days: Array<Day> = [];
  startsFrom: number = 1;
  dayWeek: string[] = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
  months: string[] = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  years: number[] = [];
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  @Output() contextMenu: EventEmitter<{ event: MouseEvent, item: Day }> = new EventEmitter<{ event: MouseEvent, item: Day }>();
  @Input() markAsDisabled: (date: Date) => boolean = (date: Date) => false;
  @Input() isHoliday: (date: Date) => boolean = (date: Date) => false;
  newItems: { [key: number]: Day } = {};
  private selecting: boolean = false;
  private startingDay?: number;
  private prevent: boolean = false;
  @Input() title: any;
  @Input() monthSelectorEnabled: boolean = true;
  month = input.required<number>();
  year = input.required<number>();

  constructor() {
    for(let i = 1900; i < new Date().getFullYear() + 1000; i++) {
      this.years.push(i)
    }


    effect(() => {
      const month = this.month();
      this.build();
    })
  }

  monthChanged($month: number) {
    this.build();
  }

  build() {
    this.days = [];
    
    const from = new Date(this.year(), this.month(), 1);

    const dayOfWeek = from.getDay() || 7;
    
    // Add days from previous month to fill the first week
    for (let i = dayOfWeek - 1; i > 0; i--) {
      const newDate = new Date(from);
      newDate.setDate(newDate.getDate() - i);
      this.days.push({
        id: this.calendarId() + '_' + newDate.getTime(),
        date: newDate, 
        day: newDate.getDate(),
        items: this.items?.filter(
          item => sameDay(item.date, newDate)
        ),
        enabled: !this.markAsDisabled(newDate),
        holiday: this.isHoliday(newDate),
        overflow: true
      });
    }
    
    // Add all days of the current month
    const firstDay = from.getDate();
    const lastDay = new Date(this.year(), this.month() + 1, 0).getDate();
    
    for (let day = firstDay; day <= lastDay; day++) {
      const newDate = new Date(from);
      newDate.setDate(day);
      this.days.push({
        id: this.calendarId() + '_' + newDate.getTime(),
        date: newDate,
        day: newDate.getDate(),
        enabled: !this.markAsDisabled(newDate),
        active: sameDay(new Date(), newDate),
        items: this.items?.filter(
          item => sameDay(item.date, newDate)
        ),
        holiday: this.isHoliday(newDate)
      })
    }
    
    // Add days from next month to complete the last week
    let nextMonthDay = 1;
    while (this.days.length % 7 !== 0) {
      const newDate = new Date(this.year(), this.month() + 1, nextMonthDay);
      this.days.push({
        id: this.calendarId() + '_' + newDate.getTime(),
        date: newDate,
        day: newDate.getDate(),
        items: this.items?.filter(
          item => sameDay(item.date, newDate)
        ),
        enabled: !this.markAsDisabled(newDate),
        holiday: this.isHoliday(newDate),
        overflow: true
      })
      nextMonthDay++;
    }
  }

  setEvents() {
    this.days.forEach(f => {
      f.items = [];
    })
    this.items?.forEach(
      item => {
        const day = this.days.find(day => sameDay(day.date, item.date));
        const items = day?.items || [];
        items.push(item);
        if (day) {
          day.items = items.sort((a, b) => a.order - b.order);
          day.enabled = !this.markAsDisabled(day.date)
        }
      }
    )
  }

  yearChanged($event: number) {
    this.currentYear = $event;
    this.monthChanged(this.currentMonth);
  }

  handleDayClick(day: { date: Date; template?: any; day: number; enabled?: boolean; active?: boolean; items?: any[] }) {
    this.dayClicked.next({
      date: day.date,
      data: null
    })
    this.prevent = false;
  }

  mouseDown(day: Day, i: number) {
    if(!day.enabled)return;
    this.newItems = {};
    this.startingDay = i;
    this.selecting = true;
  }

  mouseOver(day: Day, index: number) {
    if(!this.selecting || day.enabled === false)return;
    this.newItems = {};
    if(this.selecting) {
      const start = this.startingDay!;
      if(index >= start) {
        for(let i = start; i <= index; i++){
          if(this.days[i].enabled && !this.days[i].holiday)
            this.newItems[i] = this.days[i];
        }
      }
    }
  }

  mouseUp() {
    this.selecting = false;
    if(Object.values(this.newItems).length) {
      this.selectionChange.emit(
        Object.values(this.newItems)
      )
    }
  }

  reset($event?: MouseEvent) {
    $event?.preventDefault();
    this.newItems = {};
    this.selecting = false;
  }

  onContextMenu($event: MouseEvent, day: Day) {
    $event.preventDefault();
    if(!day.enabled) return ;
    this.reset($event); this.contextMenu.emit({event: $event, item: day})
  }

  previousMonth() {
    if(this.currentMonth === 0) {
      this.currentYear--;
      this.currentMonth = 11;
      this.yearChanged(this.currentYear)
      return;
    }
    this.currentMonth--;
    this.monthChanged(this.currentMonth);
  }

  nextMonth() {
    if(this.currentMonth === 11) {
      this.currentYear++;
      this.currentMonth = 0;
      this.yearChanged(this.currentYear);
      return
    }

    this.currentMonth++;
    this.monthChanged(this.currentMonth);
  }

  handleDbClick($event: MouseEvent, item: Day) {
    this.dbClicked.emit({
      item,
      event: $event
    })
  }
}
