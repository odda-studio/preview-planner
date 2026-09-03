import {ChangeDetectorRef, Component, ElementRef, Input, OnInit} from '@angular/core';
import {DatePipe} from '@angular/common';

type eventHandler = {
  start: Date,
  end: Date,
  title: string
}

@Component({
  selector: 'app-calendar-day-view',
  templateUrl: './calendar-day-view.component.html',
  imports: [
    DatePipe
  ],
  styleUrls: ['./calendar-day-view.component.scss']
})
export class CalendarDayViewComponent implements OnInit {
  @Input() year: number = new Date().getFullYear();
  @Input() month: number = new Date().getMonth();
  @Input() day: number = new Date().getDate();
  date: Date = new Date();
  events: Array<eventHandler> = [];
  dragging: boolean = false;
  top: any;

  constructor(private change: ChangeDetectorRef, private el: ElementRef<HTMLElement>) {
    this.setDate();
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.el.nativeElement.children[0].scrollTop = this.el.nativeElement
        .querySelector('#hour_' + new Date().getUTCHours())!.getBoundingClientRect().y
    }, 100)
  }

  setDate(
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth(),
    day: number = new Date().getDate()
  ) {
    this.date = new Date(year, month, day, 0,0,0);
  }

  getHour(hour: number) {
    const date = new Date();
    date.setMinutes(0);
    date.setHours(hour);
    return date;
  }

  getEvents(hour: number, quarter: number) {
    return this.events.filter(
      date => {
        return date.start.getHours() === hour && (date.start.getMinutes() / 15) === quarter
      }
    );
  }

  addEvent(hour: number, quarter: number) {
    const from = new Date(this.date);
    from.setHours(hour);
    from.setMinutes(quarter * 15);
    from.setSeconds(0);
    from.setMilliseconds(0);
    const to = new Date(this.date);
    to.setHours(hour);
    to.setMinutes((quarter + 1) * 15);
    to.setSeconds(0);
    to.setMilliseconds(0);
    this.events.push({
      title: 'new',
      start: from,
      end: to
    })
  }

  sizeChanged(event: eventHandler, $event: number) {
    event.end.setMinutes(
      event.end.getMinutes() + ($event * 15)
    )
    event.end = new Date(event.end)
  }

  isCurrent(i: number) {

  }

  getCurrent() {
    return this.el.nativeElement
      .querySelector('#hour_' +(new Date().getHours()));
  }

  getTop() {
    const current = this.getCurrent();
    if(!current)return;

    let top =  current.getBoundingClientRect().height * new Date().getHours();
    top += (current.getBoundingClientRect().height / 60) * new Date().getMinutes();

    this.top = this.top || top +'px';

    return this.top;
  }
}
