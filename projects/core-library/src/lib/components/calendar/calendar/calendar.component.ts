import {
  AfterContentChecked,
  AfterViewInit,
  Component,
  ContentChildren, effect, EventEmitter,
  input,
  OnChanges,
  OnInit, Output,
  QueryList,
  SimpleChanges, ViewChild
} from '@angular/core';
import {CalendarEvent, Day, DayItem} from "../models";
import {CalendarEventTemplate} from "../calendar-event-template";
import {CalendarMonthViewComponent} from "../calendar-month-view/calendar-month-view.component";
import {NgTemplateOutlet} from '@angular/common';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  imports: [
    CalendarMonthViewComponent,
    CalendarEventTemplate,
    NgTemplateOutlet
],
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit, OnChanges, AfterContentChecked {
  @Output() dayClicked: EventEmitter<DayItem> = new EventEmitter<DayItem>();
  @Output() dbClicked: EventEmitter<{ event: MouseEvent, item: Day }> = new EventEmitter<{event: MouseEvent; item: Day}>();
  @Output() selectionChange: EventEmitter<Array<Day>> = new EventEmitter<Array<Day>>();
  @ContentChildren(CalendarEventTemplate) templates!: QueryList<CalendarEventTemplate>;
  @ViewChild(CalendarMonthViewComponent) monthCalendar: CalendarMonthViewComponent | undefined;
  templateList: CalendarEventTemplate[] = [];
  viewType = input<'MONTH' | 'DAY' | 'WEEK'>('MONTH');

  id = input<string>(Math.random().toString(36).substring(2));
  
  items = input<Array<CalendarEvent<any>>>();
  @Output() contextMenu: EventEmitter<{ event: MouseEvent, item: Day }> = new EventEmitter<{event: MouseEvent; item: Day}>();
  render: boolean = true;
  markAsDisabled = input<(date: Date) => boolean>((date: Date) => false);
  isHoliday = input<(date: Date) => boolean>((date: Date) => false);

  title = input<any>();
  monthSelectorEnabled = input<boolean>(true);

  month = input.required<number>();
  year = input.required<number>();

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  build(): void {
    if(this.monthCalendar) {
      this.monthCalendar.setEvents();
    }
  }

  reset() {
    if(this.monthCalendar){
      this.monthCalendar.reset();
    }
  }

  monthly() {

  }

  ngAfterContentChecked(): void {
    this.templateList = this.templates.toArray();
  }

}
