import {Component, computed, inject, input, LOCALE_ID} from '@angular/core';
import {IBaseColumn} from '../base-lookup-render/base-lookup-render.component';
import {UiFieldMetadata} from '../../../base-crud-admin/models/model/uiFieldMetadata';
import {UiTableColumnMetadata} from '../../../base-crud-admin/models/model/uiTableColumnMetadata';
import {DatePipe, JsonPipe} from '@angular/common';
import {MatIcon} from '@angular/material/icon'
import {RouterLink} from '@angular/router';
import { DataTableComponent } from '../../data-table/data-table.component';
@Component({
  selector: 'lib-base-column-render',
  standalone: true,
  imports: [RouterLink],
  providers: [DatePipe],
  templateUrl: './base-column-render.component.html',
  styleUrl: './base-column-render.component.scss'
})

export class BaseColumnRenderComponent<TContext, TValue> implements IBaseColumn<TContext, TValue>{
  private datePipe = inject(DatePipe);
  private locale = inject(LOCALE_ID);

  field = input.required<UiFieldMetadata>();
  tableField = input.required<UiTableColumnMetadata>();
  value = input.required<TValue>();
  context = input.required<TContext>();
  componentContext = input.required<DataTableComponent<any>>();

  textValue = computed(() => {
    const value = this.value();
    const field = this.field();
    const fieldType = field.type;

    // Se il campo ha un formato personalizzato, usalo
    if (field.format) {
      if (fieldType === 'DateOnly' || fieldType === 'datetime-local' || fieldType === 'Date') {
        return this.datePipe.transform(value as any, field.format, undefined, this.locale) ?? value;
      }
    }

    // Altrimenti usa i formati predefiniti
    if (fieldType === 'DateOnly' || fieldType === 'dateonly') {
      return this.datePipe.transform(value as any, 'dd/MM/yyyy', undefined, this.locale) ?? value;
    } else if (fieldType === 'datetime-local' || fieldType === 'Date') {
      return this.datePipe.transform(value as any, 'dd/MM/yyyy HH:mm', undefined, this.locale) ?? value;
    }

    return value;
  })

  isBoolean = computed(() => {
    const type = this.field().type?.toLowerCase();
    return type === 'boolean' || type === 'bool' || type === 'checkbox';
  });

  isHref = computed(() => {
    const type = this.field().type?.toLowerCase();
    const template = this.tableField().templateName === 'href';
    if (template) {
      return true;
    }
    return type === 'href' || type === 'link' || type === 'url';
  })

  hrefValue = computed(() => {
  
    const additioanlData = this.tableField().additionalData ?? this.field().additionalData;
    if (this.isHref() && additioanlData) {
      const v = additioanlData['hrefValue'];
      let value = this.value();
      if(v) {
        value = v;
      }
      if (typeof value === 'string') {
        const _ = value.replace('context.id', (this.context() as any).id)
        return _;
      } 
      return value;
    }
    return this.value();
  })
}
