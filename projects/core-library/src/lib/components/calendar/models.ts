import { InjectionToken } from "@angular/core";

export type CalendarEvent<T> = {
  date: Date,
  id?: any,
  data: T,
  click: (data: any) => void | any
  template: string;
  order: number;
  onChange?: (value: Day) => void
}


export interface BaseDayItem {
  date: Date,
  id?: any,
  data: any
}

export interface DayItem extends BaseDayItem {
  click?: (value: BaseDayItem) => void
}

export type Day = {
  id: string;
  date: Date,
  dayHint?: string,
  template?: any,
  day: number,
  enabled?: boolean,
  holiday?: boolean,
  overflow?: boolean
  active?: boolean,
  items?: any[]
  onChange?: (value: Day) => void
}


export const TEMPLATES_TOKEN = new InjectionToken<string>('TEMPLATES_TOKEN');