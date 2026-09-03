import {Directive, Input, TemplateRef} from "@angular/core";

@Directive({
  selector: '[calendarEventTemplate]'
})
export class CalendarEventTemplate {
  @Input() calendarEventTemplate!: string;
  constructor(public template: TemplateRef<any>) { }
}
