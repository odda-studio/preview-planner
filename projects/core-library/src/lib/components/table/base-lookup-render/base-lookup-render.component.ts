import {Component, computed, input, InputSignal, Signal} from '@angular/core';
import {LookupMetadata} from '../../../base-crud-admin/models/model/lookupMetadata';
import {UiFieldMetadata} from '../../../base-crud-admin/models/model/uiFieldMetadata';
import {UiTableColumnMetadata} from '../../../base-crud-admin/models/model/uiTableColumnMetadata';
import { DataTableComponent } from '../../data-table/data-table.component';

export interface IBaseColumn<TContext = unknown, TValue = unknown> {
  field: InputSignal<UiFieldMetadata>;
  tableField: InputSignal<UiTableColumnMetadata>;
  textValue: Signal<any>;
  context: InputSignal<TContext>;
  value: InputSignal<TValue>;
  componentContext: InputSignal<DataTableComponent<any>>;
}

export interface IBaseLookupRender<TContext = unknown, TValue = unknown> extends IBaseColumn<TContext, TValue>{
  lookup: Signal<LookupMetadata>;
}

@Component({
  selector: 'lib-base-lookup-render',
  standalone: true,
  imports: [],
  templateUrl: './base-lookup-render.component.html',
  styleUrl: './base-lookup-render.component.scss'
})
export class BaseLookupRenderComponent<TContext, TValue> implements IBaseColumn<TContext, TValue>{
  lookup = computed(() => {
    const field = this.field();
    return field.lookup!;
  })
  field = input.required<UiFieldMetadata>();
  tableField = input.required<UiTableColumnMetadata>();
  value = input.required<TValue>();
  context = input.required<TContext>();
  componentContext = input.required<DataTableComponent<any>>();
  textValue = computed(() => {
    const lookup = this.lookup();
    const value = this.value() as Record<string, any>;
    if(!value) return '';
    const displayKey = lookup.displayFields!;
    const separator = lookup.displayFieldsSeparator || ',';
    if(Array.isArray(value)) {
      return value.map(
        item => displayKey.map(v => item[v]).join(separator)
      ).join(' - ')
    }
    return displayKey.map(v => value[v]).join(separator)
  })
}
