import {InjectionToken, Provider, Type} from '@angular/core';
import {Observable} from 'rxjs';
import {UiResourceMetadata} from '../base-crud-admin/models/model/uiResourceMetadata';
import {UiResourceRefMetadata} from '../base-crud-admin/models/model/uiResourceRefMetadata';
import {FilterNodeDto} from '../base-crud-admin/models/model/filterNodeDto';
import {IBaseColumn} from '../components/table/base-lookup-render/base-lookup-render.component';
import {IBaseFormInputComponent} from '../components/forms/base-form-input/base-form-input.component';
import {FormKind} from '../base-crud-admin/models/model/formKind';
import {JsonFormsComponent} from '../components/forms/json-forms/json-forms.component';
import {FormGroup} from '@angular/forms';
import {DataTableComponent} from '../components/data-table/data-table.component';
import {SortingDto} from '../base-crud-admin/models/model/sortingDto';

export const FETCH_DATA_TOKEN = new InjectionToken('FETCH_DATA_TOKEN');

export type fetchData = (metadata: UiResourceMetadata | UiResourceRefMetadata, searchData: {
  page: number,
  pageSize: number,
  filters?: FilterNodeDto,
  sorting?: SortingDto[],
  query?: string
  includes?: string[]
}) => Observable<{
  data: unknown[],
  totalCount: number
} | null>;

export type FetchDataFactory =
  (...args: any[]) => fetchData;

export function configureBaseCrudAdmin(
  factory: FetchDataFactory,
  deps: unknown[]
): Provider {
  return {
    provide: FETCH_DATA_TOKEN,
    useFactory: factory,
    deps
  };
}


export const GET_TABLE_METADATA = new InjectionToken('GET_TABLE_METADATA');

export type getTableMetaData = (name: string) => Observable<UiResourceMetadata>;

export type GetTableMetadataFactory =
  (...args: any[]) => getTableMetaData;

export function configureBaseCrudAdminGetMetadata(
  factory: GetTableMetadataFactory,
  deps: unknown[]
): Provider {
  return {
    provide: GET_TABLE_METADATA,
    useFactory: factory,
    deps
  };
}

export const TABLE_COMPONENT = new InjectionToken('TABLE_COMPONENT');
export const provideTableComponents = (
  components: Record<string, Type<IBaseColumn<any, any>>>
): Provider => {
  return {
    provide: TABLE_COMPONENT,
    useValue: components
  }
}


export const FORM_COMPONENT = new InjectionToken('FORM_COMPONENT');

export const provideFormComponents = (
  components: Record<string, Type<IBaseFormInputComponent<any, any>>>
): Provider => {
  return {
    provide: FORM_COMPONENT,
    useValue: components
  }
}

export type submitFunction = <T = unknown>(metadata: UiResourceMetadata, ctx: JsonFormsComponent<T> | DataTableComponent<T>, formGroup: FormGroup | T, formKind: FormKind, data: T, id?: any) => Observable<T>;
export const SUBMIT_HANDLER = new InjectionToken('SUBMIT_HANDLER');

export type factorySubmit = (...args: any[]) => submitFunction;

export const provideSubmitForm = (
  factory: factorySubmit,
  deps: unknown[]
):Provider => {
  return {
    provide: SUBMIT_HANDLER,
    useFactory: factory,
    deps
  }
}
