import {
  Component,
  computed, effect,
  EventEmitter,
  HostListener,
  inject,
  input,
  linkedSignal,
  model,
  Output,
  ResourceRef,
  signal,
  Type
} from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { UiResourceMetadata } from '../../base-crud-admin/models/model/uiResourceMetadata';
import { UiTableMetadata } from '../../base-crud-admin/models/model/uiTableMetadata';
import { UiTableColumnMetadata } from '../../base-crud-admin/models/model/uiTableColumnMetadata';
import { UiFieldMetadata } from '../../base-crud-admin/models/model/uiFieldMetadata';
import {
  FETCH_DATA_TOKEN,
  fetchData,
  SUBMIT_HANDLER,
  submitFunction,
  TABLE_COMPONENT
} from '../../provides/provide-table-data';
import { IBaseColumn } from '../table/base-lookup-render/base-lookup-render.component';
import { FormsModule } from '@angular/forms';
import { WINDOW } from '../../tokens/window.token';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { FilterNodeDto } from '../../base-crud-admin/models/model/filterNodeDto';
import { FilterDtoType } from '../../base-crud-admin/models/model/filterDtoType';
import { ComparisonOperator } from '../../base-crud-admin/models/model/comparisonOperator';
import { BaseFilterHeaderComponent } from './base-filter-header/base-filter-header.component';
import { BaseColumnRenderComponent } from '../table/base-column-render/base-column-render.component';
import { FormKind } from '../../base-crud-admin/models/model/formKind';
import { SortingDto } from '../../base-crud-admin/models/model/sortingDto';
import { SortDirection } from '../../base-crud-admin/models/model/sortDirection';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckbox } from "@angular/material/checkbox";

export const wrapResource = <T>(
  resource: ResourceRef<T>
) => {
  return linkedSignal({
    source: resource.value,
    computation: (source, previous) => {
      return source ?? previous?.value;
    },
  });
}

@Component({
  selector: 'lib-data-table',
  standalone: true,
  imports: [
    CommonModule,
    NgComponentOutlet,
    FormsModule,
    BaseFilterHeaderComponent,
    BaseColumnRenderComponent,
    MatMenuModule,
    MatCheckbox
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent<T> {
  toggleColumnVisibility(columnName: string) {
    const hiddenColumns = { ...this.hiddenColumns() };
    hiddenColumns[columnName] = !hiddenColumns[columnName];
    this.hiddenColumns.set(hiddenColumns);
    this.saveColumnVisibilityConfig(hiddenColumns);
  }

  // Save column visibility configuration to localStorage
  private saveColumnVisibilityConfig(config: Record<string, boolean>) {
    const storageKey = this.getColumnVisibilityStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(config));
    }
  }

  // Load column visibility configuration from localStorage
  private loadColumnVisibilityConfig(): Record<string, boolean> | null {
    const storageKey = this.getColumnVisibilityStorageKey();
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing column visibility config:', e);
        }
      }
    }
    return null;
  }

  // Generate storage key based on metadata name and table name
  private getColumnVisibilityStorageKey(): string | null {
    const metadata = this.metadata();
    const tableName = this.tableName();
    if (metadata?.name && tableName) {
      return `column-visibility-${metadata.name}-${tableName}`;
    }
    return null;
  }


  // Make Math available to the template
  protected readonly Math = Math;

  // Inject the table component registry
  components: Record<string, Type<IBaseColumn>> = inject<Record<string, Type<IBaseColumn>>>(TABLE_COMPONENT);
  private getTableData: fetchData = inject<fetchData>(FETCH_DATA_TOKEN);

  private submitHandler: submitFunction = inject<submitFunction>(SUBMIT_HANDLER);

  // Ui signals
  currentOverIndex = signal<number | null>(null);

  // Selection signals
  selectedRows = signal<Set<any>>(new Set());
  selectedAll = signal<boolean>(false);

  // Input signals
  metadata = input.required<UiResourceMetadata>();
  tableName = input.required<string>();
  totalCount = model<number>(0);
  advancedFiltersEnabled = input<boolean>(false);
  allowSelection = input<boolean>(false);

  searchData = computed<{
    page: number,
    pageSize: number,
    filters?: FilterNodeDto,
    query?: string,
    includes?: string[],
    sorting?: SortingDto[]
  }>(() => {
    const pageSize = this.pageSize();
    const currentFilterNode = this.filtersNode();
    const sortings = this.sorting();
    const currentPage = this.currentPage();
    const filters = this.filters();
    const query = this.query();

    let filterNode: FilterNodeDto | undefined = undefined;

    const queryFilters: FilterNodeDto = {
      type: 'Group',
      logic: 'And',
      children: [
        ...(Object.entries(filters).filter(([k, v]) => v.value !== undefined && v.value !== '').map(([k, v]) => {

          const field = this.metadata().fields![k];
          const lookup = field.lookup;
          if (lookup) {
            if (v.filterOperator === 'In') {
              return {
                type: FilterDtoType.Condition,
                property: lookup.filterByKey ?? k,
                operator: ComparisonOperator.In,
                value: v.value.map(Number)
              }
            }
            const filters: FilterNodeDto = {
              type: 'Group',
              children: lookup?.displayFields?.map(x => {
                return {
                  type: 'Condition',
                  value: v.value,
                  operator: 'Contains',
                  property: field.name + '.' + x
                } as FilterNodeDto
              }),
              logic: 'Or'
            }
            return filters;
          }
          return {
            type: FilterDtoType.Condition,
            property: k,
            operator: v.filterOperator,
            value: v.value
          }
        }))
      ]
    }

    if (query && query.trim() !== '') {
      const queryFilterGrpuip: FilterNodeDto = {
        type: 'Group',
        logic: 'Or',
        children: []
      };
      for (const column of this.columns().filter(x => x.column.filterable)) {
        const field = column.field;
        const lookup = field.lookup;
        if (lookup) {
          if (column.column.deepFilterable) {
            const filters: FilterNodeDto = {
              type: 'Group',
              children: lookup?.displayFields?.map(x => {
                return {
                  type: 'Condition',
                  value: query,
                  operator: 'Contains',
                  property: field.name + '.' + x
                } as FilterNodeDto
              }),
              logic: 'Or'
            }
            queryFilterGrpuip.children!.push(filters);
          }

        } else if(field.type === 'string') {
          queryFilterGrpuip.children!.push({
            type: FilterDtoType.Condition,
            property: field.name!,
            operator: 'Contains',
            value: query
          } as FilterNodeDto);
        }
      }
      if (queryFilterGrpuip.children!.length > 0) {
        queryFilters.children!.push(queryFilterGrpuip);
      }
    }

    if (currentFilterNode) {
      filterNode = { ...currentFilterNode };
      filterNode.children = filterNode.children ? [...filterNode.children] : [];
      if (queryFilters.children?.length) {
        filterNode.children!.push(queryFilters)
      }
    }
    else {
      filterNode = queryFilters;
    }

    return {
      page: currentPage,
      pageSize,
      query: query,
      includes: this.table()?.includes ?? [],
      filters: filterNode,
      sorting: sortings.length > 0 ? sortings : undefined
    }
  })

  tableData = rxResource({
    params: () => {
      return {
        metadata: this.metadata(),
        search: this.searchData()
      }
    },
    stream: (p) => {
      const { metadata, search } = p.params;
      if (metadata)
        return this.getTableData(metadata, search).pipe(
          tap(x => {
            this.totalCount.set(x?.totalCount || 0)
          })
        );
      return of({
        data: [],
        totalCount: 0
      });
    }
  })
  rows = wrapResource<any>(this.tableData)

  // Output events for actions
  @Output() updateRow = new EventEmitter<any>();
  @Output() copyRow = new EventEmitter<any>();
  @Output() deleteRow = new EventEmitter<{ value: any, id: any }>();
  @Output() showFilters = new EventEmitter<void>();
  selection = model<{ selectedRows: Set<any>, selectedAll: boolean }>();
  selectedRowsData = model<{ selectedRows?: Array<any>, selectedAll?: boolean }>()

  // Pagination signals
  currentPage = model<number>(1);
  pageSize = model<number>(10);

  // Filter signals
  query = model<string>('');
  filters = model<Record<string, {
    value: any,
    filterOperator: ComparisonOperator
  }>>({});

  filtersNode = model<FilterNodeDto>();

  // Sorting signals - array to support multiple sorting
  sorting = model<SortingDto[]>([]);

  // Inject window token for SSR compatibility
  private windowRef = inject<Window | any>(WINDOW);

  // Responsive design signals
  isMobile = signal<boolean>(false);
  screenWidth = signal<number>(this.windowRef.innerWidth);

  // Listen for window resize events
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth.set(this.windowRef.innerWidth);
    this.isMobile.set(this.windowRef.innerWidth < 768); // 768px is standard tablet breakpoint
  }

  // Initialize mobile detection
  constructor() {
    this.isMobile.set(this.windowRef.innerWidth < 768);

    effect(() => {
      const filters = this.filters();
      Object.entries(filters).map(([k, v]) => {
        this.addFilter({
          column: this.columns().find(c => c.field.name === k)?.column!,
          field: this.columns().find(c => c.field.name === k)?.field!
        })
      });
    });

    effect(() => {
      const filtersNode = this.filtersNode();
      if (filtersNode) {
        debugger
      }
    });

    effect(() => {
      const selected = this.selectedRows();
      const selectedAll = this.selectedAll();
      if (selectedAll) {
        this.selectedRowsData.set({
          selectedRows: this.dataRows(),
          selectedAll: true
        })
      } else {
        this.selectedRowsData.set({
          selectedRows: this.dataRows().filter(
            f => selected.has(f.__identifier)
          ),
          selectedAll: false
        })
      }
    });
  }

  // Computed signals
  table = computed<UiTableMetadata | undefined>(() => {
    const tableName = this.tableName();
    const metadata = this.metadata();
    return metadata.tables?.[tableName];
  });


  activeFilters = signal<{
    column: UiTableColumnMetadata, field: UiFieldMetadata, value: {
      value: any,
      filterOperator: ComparisonOperator
    }
  }[]>([]);

  availableFilters = computed(() => {
    const columns = this.columns();
    const filters = this.activeFilters();
    return columns.filter(x => x.column.filterable).filter(c => !filters.some(f => f.field.name === c.field.name));
  });


  hiddenColumns = linkedSignal<Record<string, boolean>>(() => {
    const table = this.table();
    if (!table) return {};

    // Try to load saved configuration from localStorage
    const savedConfig = this.loadColumnVisibilityConfig();
    if (savedConfig) {
      return savedConfig;
    }

    // If no saved configuration, use default from metadata
    const columns = table.columns!;
    const hidden: Record<string, boolean> = {};
    Object.entries(columns).forEach(([k, v]) => {
      if (v.hidden) {
        hidden[k] = true;
      }
    });
    return hidden;
  });

  allColumns = computed<{ column: UiTableColumnMetadata, field: UiFieldMetadata }[]>(() => {
    const table = this.table();
    if (!table) return [];
    const fields = this.metadata().fields!;
    const columns = table.columns!;
    return Object.entries(columns).map(([k, column]) => {
      const field = fields[k];
      return {
        column,
        field
      }
    });
  });

  columns = computed<{
    column: UiTableColumnMetadata, field: UiFieldMetadata 
}[]>(() => {
    const table = this.table();
    if (!table) return [];
    const fields = this.metadata().fields!;
    const columns = table.columns!;
    return Object.entries(columns).filter(
      ([k, v]) => !v.hidden && !this.hiddenColumns()[k] || this.hiddenColumns()[k] === false
    ).map(([k, column]) => {
      const field = fields[k];
      return {
        column,
        field
      }
    });
  });


  // Computed signal for mobile columns (fewer columns for mobile view)
  mobileColumns = computed<{ column: UiTableColumnMetadata, field: UiFieldMetadata }[]>(() => {
    const allColumns = this.columns();
    // Show only important columns on mobile
    // Priority: 1. Identifier column 2. Columns marked as important in additionalData 3. First 2-3 columns
    const identifierField = this.identifier();

    // Start with identifier column if it exists and is visible
    const result: { column: UiTableColumnMetadata, field: UiFieldMetadata }[] = [];

    // Add identifier column first if it's in the visible columns
    const identifierColumn = allColumns.find(col => col.field.name === identifierField?.name);
    if (identifierColumn) {
      result.push(identifierColumn);
    }

    // Add columns marked as important in additionalData
    allColumns.forEach(col => {
      if (col.column.additionalData?.['showOnMobile'] !== false &&
        !result.some(r => r.field.name === col.field.name)) {
        result.push(col);
      }
    });

    // If we still have fewer than 2 columns, add more until we reach 2
    if (result.length < 2) {
      allColumns.forEach(col => {
        if (!result.some(r => r.field.name === col.field.name)) {
          result.push(col);
          if (result.length >= 2) return;
        }
      });
    }

    return result;
  });

  // Computed signal to check if Actions column should be shown
  showActionsColumn = computed(() => {
    const metadata = this.metadata();
    return metadata.enableDelete === true || metadata.enablePatch === true || metadata.enablePost === true;
  });

  identifier = computed(() => {
    const table = this.metadata();
    return Object.values(table?.fields || {}).find(x => x.identifier);
  });

  dataRows = computed<any[]>(() => {
    const rows = (this.rows() as any)?.data || [];
    const identifier = this.identifier();
    if (rows && identifier)
      return rows.map((x: T) => {
        return {
          ...x,
          __identifier: (x as any)[identifier.name!]
        }
      });
    return [];
  });

  gridTemplateColumns = computed(() => {
    const isMobile = this.isMobile();
    const columns = isMobile ? this.mobileColumns() : this.columns();
    const showActions = this.showActionsColumn();
    const allowSelection = this.allowSelection();

    // Build grid template with optional checkbox column, data columns, and action column
    const columnTemplates: string[] = [];

    // Add checkbox column only if selection is allowed
    if (allowSelection) {
      columnTemplates.push('50px'); // Checkbox column width
    }

    columnTemplates.push(...columns.map(x => `minmax(${(x.column.width || 200)}px, 1fr)`));

    if (showActions) {
      columnTemplates.push('150px'); // Action column width
    }

    return columnTemplates.join(' ');
  });

  width = computed(() => {
    const isMobile = this.isMobile();
    const columns = isMobile ? this.mobileColumns() : this.columns();
    const showActions = this.showActionsColumn();
    const allowSelection = this.allowSelection();

    const checkboxWidth = allowSelection ? 50 : 0;
    const columnsWidth = columns.map(x => (x.column.width || 200)).reduce((t, v) => t + v, 0);
    const actionsWidth = showActions ? 150 : 0;

    return checkboxWidth + columnsWidth + actionsWidth;
  })

  // Handle update action
  onUpdate(row: any) {
    this.updateRow.emit(row);
  }

  onCopy(row: any) {
    this.copyRow.emit(row);
  }

  // Handle delete action
  onDelete(row: any) {
    this.submitHandler(this.metadata(), this, null, FormKind.Delete, row, row[this.identifier()?.name!]).subscribe((result) => {
      if (result && result.success) {
        this.deleteRow.emit({ value: row, id: row[this.identifier()?.name!] });
      }
      this.tableData.reload();
    });
  }

  // Handle show filters action
  onShowFilters() {
    this.showFilters.emit();
  }

  // Pagination methods
  nextPage() {
    const totalPages = Math.ceil(this.totalCount() / this.pageSize());
    if (this.currentPage() < totalPages) {
      this.currentPage.update(page => page + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  goToPage(page: number) {
    const totalPages = Math.ceil(this.totalCount() / this.pageSize());
    if (page >= 1 && page <= totalPages) {
      this.currentPage.set(page);
    }
  }

  changePageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1); // Reset to first page when changing page size
  }


  clearFilters() {
    this.filters.set({});
    this.currentPage.set(1); // Reset to first page when clearing filters
  }

  // Sorting method - manages array of SortingDto
  toggleSort(fieldName: string) {
    const currentSortings = this.sorting();
    const existingSort = currentSortings.find(s => s.sortBy === fieldName);

    if (existingSort) {
      // Field is already being sorted - cycle through: Ascending -> Descending -> remove
      if (existingSort.direction === SortDirection.Ascending) {
        // Change to descending
        this.sorting.set(
          currentSortings.map(s =>
            s.sortBy === fieldName
              ? { ...s, direction: SortDirection.Descending }
              : s
          )
        );
      } else {
        // Remove this sorting
        this.sorting.set(currentSortings.filter(s => s.sortBy !== fieldName));
      }
    } else {
      // Add new sorting with Ascending direction (for now, we keep only one sorting at a time)
      // If you want multiple sortings, remove the empty array and use: [...currentSortings, newSort]
      const newSort: SortingDto = {
        sortBy: fieldName,
        direction: SortDirection.Ascending
      };
      this.sorting.set([newSort]); // Single sorting - replace existing
      // this.sortings.set([...currentSortings, newSort]); // Multiple sorting - uncomment this for multi-sort
    }

    this.currentPage.set(1); // Reset to first page when sorting
  }

  // Get sort state for a specific field
  getSortState(fieldName: string): 'asc' | 'desc' | null {
    const sorting = this.sorting().find(s => s.sortBy === fieldName);
    if (!sorting) return null;
    return sorting.direction === SortDirection.Ascending ? 'asc' : 'desc';
  }

  // Pagination display helpers
  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  get paginationRange(): number[] {
    const range = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage();

    // Show 5 page numbers centered around current page when possible
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, Math.max(currentPage + 2, 5));

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }

  filterValueChange($event: { value: any; filterOperator: ComparisonOperator }, field: {
    column: UiTableColumnMetadata;
    field: UiFieldMetadata
  }) {
    this.filters.update(x => {
      return {
        ...x,
        [field.field.name!]: {
          value: $event.value,
          filterOperator: $event.filterOperator
        }
      }
    })
  }

  // Selection methods
  toggleRowSelection(row: any) {
    const identifier = row.__identifier;
    const selected = this.selectedRows();
    const newSelected = new Set(selected);

    if (newSelected.has(identifier)) {
      newSelected.delete(identifier);
    } else {
      newSelected.add(identifier);
    }

    this.selectedRows.set(newSelected);

    // Update selectedAll based on current selection
    const allRowIds = this.dataRows().map(r => r.__identifier);
    const allSelected = allRowIds.every(id => newSelected.has(id));
    this.selectedAll.set(allSelected);

    // Emit selection change event
    this.selection.set({
      selectedRows: newSelected,
      selectedAll: allSelected
    });
  }

  toggleSelectAll() {
    const currentSelectAll = this.selectedAll();
    const allRowIds = this.dataRows().map(r => r.__identifier);

    if (currentSelectAll) {
      // Deselect all
      this.selectedRows.set(new Set());
      this.selectedAll.set(false);
      this.selection.set({
        selectedRows: new Set(),
        selectedAll: false
      });
    } else {
      // Select all
      const newSelected = new Set(allRowIds);
      this.selectedRows.set(newSelected);
      this.selectedAll.set(true);
      this.selection.set({
        selectedRows: newSelected,
        selectedAll: true
      });
    }
  }

  isRowSelected(row: any): boolean {
    return this.selectedRows().has(row.__identifier);
  }

  // Public method to get selected row identifiers
  getSelectedRowIds(): any[] {
    return Array.from(this.selectedRows());
  }

  // Public method to get actual selected row data
  getSelectedRows(): any[] {
    const selectedIds = this.selectedRows();
    return this.dataRows().filter(row => selectedIds.has(row.__identifier));
  }

  // Public method to clear selection
  clearSelection() {
    this.selectedRows.set(new Set());
    this.selectedAll.set(false);
    this.selection.set({
      selectedRows: new Set(),
      selectedAll: false
    });
  }

  // Computed signal for intermediate checkbox state (some but not all selected)
  isIndeterminate = computed(() => {
    const selected = this.selectedRows();
    const allRowIds = this.dataRows().map(r => r.__identifier);
    const selectedCount = allRowIds.filter(id => selected.has(id)).length;
    return selectedCount > 0 && selectedCount < allRowIds.length;
  });


  addFilter(filter: { column: UiTableColumnMetadata; field: UiFieldMetadata }) {
    if (!filter.column || !filter.field || this.activeFilters().some(f => f.field.name === filter.field.name)) {
      return; // Filter already exists, do not add again
    }
    this.activeFilters.update(filters => [...filters, {
      column: filter.column,
      field: filter.field,
      value: {
        value: undefined,
        filterOperator: 'Equals' as ComparisonOperator
      }
    }]);
  }


  removeFilter(_t15: {
    column: UiTableColumnMetadata; field: UiFieldMetadata; value: {
      value: any;
      filterOperator: ComparisonOperator;
    };
  }) {
    // Remove the filter from activeFilters
    this.activeFilters.update(filters => filters.filter(f => f.field.name !== _t15.field.name));
    // Also remove the filter value from filters model
    this.filters.update(f => {
      const newFilters = { ...f };
      delete newFilters[_t15.field.name!];
      return newFilters;
    });
  }
}
