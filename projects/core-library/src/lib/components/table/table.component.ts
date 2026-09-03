import {Component, computed, Inject, inject, input, Type} from '@angular/core';
import {UiResourceMetadata} from '../../base-crud-admin/models/model/uiResourceMetadata'
import {UiTableMetadata} from '../../base-crud-admin/models/model/uiTableMetadata'
import {TABLE_COMPONENT} from '../../provides/provide-table-data';
import {UiTableColumnMetadata} from '../../base-crud-admin/models/model/uiTableColumnMetadata';
import {NgComponentOutlet} from '@angular/common';
import {UiFieldMetadata} from '../../base-crud-admin/models/model/uiFieldMetadata';
import {IBaseColumn} from './base-lookup-render/base-lookup-render.component';

@Component({
  selector: 'lib-table',
  standalone: true,
  imports: [
    NgComponentOutlet
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent<T> {

  components: Record<string, Type<IBaseColumn>> = inject<Record<string, Type<IBaseColumn>>>(TABLE_COMPONENT);

  metadata = input.required<UiResourceMetadata>();
  tableName = input.required<string>();
  rows = input.required<T[]>();

  dataRows = computed<any[]>(() => {
    const rows = this.rows();
    const identifier = this.identifier();
    if (rows && identifier)
      return rows.map((x: T) => {
        return {
          ...x,
          __identifier: (x as any)[identifier.name!]
        }
      })
    return []
  })

  table = computed<UiTableMetadata | undefined>(() => {
    const tableName = this.tableName();
    const metadata = this.metadata();
    return metadata.tables?.[tableName];
  })

  columns = computed<{column: UiTableColumnMetadata, field: UiFieldMetadata}[]>(() => {
    const table = this.table();
    if(!table) return [];
    const fields = this.metadata().fields!;
    const columns = table.columns!;
    return Object.entries(columns).filter(
      ([k, v]) => !v.hidden
    ).map(([k, column]) => {
      const field = fields[k];
      return {
        column,
        field
      }
    })
  })

  identifier = computed(() => {
    const table = this.metadata();
    return Object.values(table?.fields || {}).find(x => x.identifier)
  })

  gridTemplateColumns = computed(() => {
    const columns = this.columns();
    return columns.map(x => (x.column.width || 200) + 'px').join(' ')
  })
}
