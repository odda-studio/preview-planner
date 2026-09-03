import {
  Component,
  computed,
  contentChild,
  Inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {FETCH_DATA_TOKEN, fetchData, GET_TABLE_METADATA, getTableMetaData} from '../../provides/provide-table-data';
import {FilterNodeDto} from '../../base-crud-admin/models/model/filterNodeDto';
import {tap} from 'rxjs';
import {FormGroup, FormsModule} from '@angular/forms';
import {DataTableComponent} from '../data-table/data-table.component';
import {JsonFormsComponent} from '../forms/json-forms/json-forms.component';
import {UiResourceMetadata} from '../../base-crud-admin/models/model/uiResourceMetadata';
import {FormKind} from '../../base-crud-admin/models/model/formKind';
import {ComparisonOperator} from '../../base-crud-admin/models/model/comparisonOperator';
import {SortingDto} from '../../base-crud-admin/models/model/sortingDto';
import {NgTemplateOutlet} from '@angular/common';
import { Worksheet } from "../worksheet/worksheet";

@Component({
  selector: 'lib-entity-manager',
  standalone: true,
  imports: [
    FormsModule,
    DataTableComponent,
    JsonFormsComponent,
    NgTemplateOutlet,
    Worksheet
],
  templateUrl: './entity-manager.component.html',
  styleUrl: './entity-manager.component.scss'
})
export class EntityManagerComponent<T> {

  public tableComponent = viewChild(DataTableComponent)
  public formTemplate = viewChild<TemplateRef<any>>("form");

  public titleComponent = contentChild<TemplateRef<any>>("title");
  entityName = input.required<string>();
  tableName = input.required<string>();
  createFormName = input<string>();
  updateFormName = input<string>();
  allowSelection = input<boolean>(false);
  title = input<string>();
  pageSize = model(50)
  selectedRows = model<Set<any>>(new Set());

  searchData = computed<{
    page: number,
    pageSize: number,
    filters?: FilterNodeDto,
    query?: string
  }>(() => {
    const pageSize = this.pageSize();
    return {
      page: 1,
      pageSize,
    }
  })

  sorting = model<SortingDto[]> ([]);


  filters = model<Record<string, {
    value: any,
    filterOperator: ComparisonOperator
  }>>({});

  filtersNode = model<FilterNodeDto>();

  currentFormName = signal<string | undefined>(undefined);

  showCreateForm = output();
  showUpdateForm = output<T>();
  showDeleteForm = output<{ value: T, id: any, entity: UiResourceMetadata }>();
  showFilters = output<void>();


  currentRow = signal<any>(undefined);

  entityReady = output<UiResourceMetadata>()
  onSubmit = output<{valid: boolean, value: T, formGroup: FormGroup, kind: FormKind, submitted: boolean}>()

  constructor(
    @Inject(FETCH_DATA_TOKEN) private getTableData: fetchData,
    @Inject(GET_TABLE_METADATA) private getTableMetadata: getTableMetaData
  ) {
  }

  metadata = rxResource({
    params: () => this.entityName(),
    stream: (v) => {
      return this.getTableMetadata(v.params).pipe(
        tap(x => {
          this.entityReady.emit(x);
        })
      )
    }
  })
  selectedRowsData = model<{selectedRows?: Array<any>, selectedAll?: boolean}>()


  createNew() {
    this.reset();
    this.showCreateForm.emit()
    this.currentFormName.set(this.createFormName());
  }

  updateRow($event: any) {
    this.currentRow.set($event);
    this.showUpdateForm.emit($event)
    this.currentFormName.set(this.updateFormName())
  }

  copyRow($event: any) {
    this.createNew();
    const data = {...$event};
    const identifier = this.identifier;
    data[identifier?.name!] = undefined;
    this.currentRow.set(data);
  }

  get identifier() {
    const meta = this.metadata.value();
    return Object.values(meta?.fields || {}).find(f => f.identifier);
  }

  deleteRow($event: any) {
    this.showDeleteForm.emit({
      ...$event,
      entity: this.metadata.value()
    })
  }

  onShowFilters() {
    this.showFilters.emit();
  }

  reset() {
    this.currentRow.set(undefined);
  }

  handleSubmit($event: { valid: boolean; value: any; formGroup: FormGroup, kind: FormKind, error?: any | undefined, submitted: boolean }) {
    if ($event.valid) {
      this.tableComponent()?.tableData.reload();
      this.reset();
    }
    this.onSubmit.emit($event)
  }
}
