import {
  Component,
  computed,
  input,
  model,
  signal,
  ViewChild,
  ElementRef,
  effect, untracked,
  output,
  HostListener,
  viewChild,
  inject,
  linkedSignal
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComparisonOperator } from '../../../base-crud-admin/models/model/comparisonOperator'
import { UiFieldMetadata } from '../../../base-crud-admin/models/model/uiFieldMetadata';
import { UiTableColumnMetadata } from '../../../base-crud-admin/models/model/uiTableColumnMetadata';
import { FilterNodeDto } from '../../../base-crud-admin/models/model/filterNodeDto';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { OptionItem } from '../../../base-crud-admin/models/model/optionItem';
import { debounced } from '../../../signals/debouced';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { FETCH_DATA_TOKEN, fetchData } from '../../../provides/provide-table-data';
import { wrapResource } from '../data-table.component';


export interface FilterOperation {
  operator: ComparisonOperator;
  icon: string;
  label: string;
}

@Component({
  selector: 'lib-base-filter-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule, MatCheckboxModule, MatRadioModule],
  providers: [DatePipe],
  templateUrl: './base-filter-header.component.html',
  styleUrl: './base-filter-header.component.scss'
})
export class BaseFilterHeaderComponent {
  public readonly fetchData = inject<fetchData>(FETCH_DATA_TOKEN);

  // ViewChild reference
  @ViewChild('filterContainer') filterContainer!: ElementRef<HTMLDivElement>;
  matMenuTriger = viewChild<MatMenuTrigger>('trigger')


  removeFilter = output<void>();
  // Input signals
  placeholder = input<string>('Filtra...');
  columnName = input<string>('');
  field = input.required<UiFieldMetadata>();
  column = input.required<UiTableColumnMetadata>();

  lookup = computed(() => {
    const field = this.field();
    if (field.lookup) {
      return field.lookup;
    }
    return undefined;
  })
   // Check if field type is numeric
  isNumericType = computed(() => {
    const fieldType = this.field().type?.toLowerCase();
    return fieldType === 'number' ||
      fieldType === 'int' ||
      fieldType === 'int32' ||
      fieldType === 'int64' ||
      fieldType === 'double' ||
      fieldType === 'float' ||
      fieldType === 'decimal' ||
      fieldType?.includes('int');
  });

  type = computed(() => {
    const fieldType = this.field().type;
    if (fieldType === 'string') {
      return 'text';
    }
    if (fieldType === 'number' || fieldType?.includes('int')) {
      return 'number';
    }
    if (fieldType === 'date' || fieldType === 'datetime' || fieldType?.toLowerCase().includes('date')) {
      return 'date';
    }
    if (fieldType === 'boolean') {
      return 'checkbox';
    }
    return 'text';
  })

  // Model signals for two-way binding
  stringFilterValue = model<string | number | Record<string | number, boolean>>('');
  filterValue = model<{ value: string | number | boolean | number[] | string[] | undefined, filterOperator: ComparisonOperator }>({
    value: undefined,
    filterOperator: ComparisonOperator.Eq,
  });
  filterOperator = model<ComparisonOperator>(ComparisonOperator.Eq);

  // Check if field has options (for select dropdown)
  hasOptions = computed(() => {
    const options = this.field().options;
    return options && options.length > 0;
  });

  // Get options from field
  options = computed(() => {

    const options = this._options.value();
    if (options && options.length > 0) return options;
    return this.field().options || [];
  });

 

  // Filter operations available
  filterOperations = computed(() => {

    const isLookup = this.lookup() !== undefined;
    if (isLookup) {
      return this._filterOperations().filter(op =>
        op.operator === ComparisonOperator.Contains
      );
    }

    // If field has options, only allow Eq and Ne operations
    if (this.hasOptions()) {
      return this._filterOperations().filter(op =>
        op.operator === ComparisonOperator.Eq ||
        op.operator === ComparisonOperator.Ne
      );
    }

    const type = this.field().type;
    if (type === 'string') {
      return this._filterOperations().filter(op =>
        op.operator === ComparisonOperator.Eq ||
        op.operator === ComparisonOperator.Ne ||
        op.operator === ComparisonOperator.Contains
      );
    }
    if (type === 'boolean') {
      return [];
    }
    if (type === 'number' || type?.includes('int') || type === 'date' || type === 'datetime' || type?.toLowerCase().includes('date')) {
      return this._filterOperations().filter(op =>
        op.operator === ComparisonOperator.Eq ||
        op.operator === ComparisonOperator.Ne ||
        op.operator === ComparisonOperator.Gt ||
        op.operator === ComparisonOperator.Gte ||
        op.operator === ComparisonOperator.Lt ||
        op.operator === ComparisonOperator.Lte
      );
    }
    return this._filterOperations();
  })
  _filterOperations = signal<FilterOperation[]>([
    {
      operator: ComparisonOperator.Contains,
      icon: '⊃',
      label: 'Contiene'
    },
    {
      operator: ComparisonOperator.Eq,
      icon: '=',
      label: 'Uguale'
    },
    {
      operator: ComparisonOperator.Ne,
      icon: '≠',
      label: 'Diverso'
    },
    {
      operator: ComparisonOperator.Gt,
      icon: '>',
      label: 'Maggiore'
    },
    {
      operator: ComparisonOperator.Gte,
      icon: '≥',
      label: 'Maggiore o Uguale'
    },
    {
      operator: ComparisonOperator.Lt,
      icon: '<',
      label: 'Minore'
    },
    {
      operator: ComparisonOperator.Lte,
      icon: '≤',
      label: 'Minore o Uguale'
    }
  ]);

  debouncedSearch = debounced(this.stringFilterValue, 300);

  _options = rxResource({
    params: () => this.debouncedSearch(),
    stream: (value) => {
      const lookup = this.lookup();

      if (!lookup) {
        return of([]);
      }

      const filters: FilterNodeDto = {
        type: 'Group',
        children: lookup?.displayFields?.map(x => {
          return {
            type: 'Condition',
            value: value.params,
            operator: 'Contains',
            property: x
          } as FilterNodeDto
        }),
        logic: 'Or'
      }

      return this.fetchData(this.lookup()?.entity!, {
        page: 1,
        pageSize: 300,
        query: (value.params as any) || '',
        filters
      }).pipe(map(x => {
        return this.map(x?.data || []);
      }))
    }
  })

  _wrappedOptions = wrapResource(this._options);

  wrappedOptions = computed(() => {
    const d = this._wrappedOptions() as Array<any>;
    return d || [];
  })
  // Computed signal for current operation
  currentOperation = computed(() => {
    return this.filterOperations().find(op => op.operator === this.filterOperator());
  });

  // Get display value for current filter
  filterDisplayValue = computed(() => {
    const value = this.stringFilterValue() as any;
    if (!value && value !== 0) return '';

    // For fields with options, show the label
    if (this.hasOptions()) {
      const option = this.options().find(opt => opt.value == value);
      return option ? option.label : value;
    }

    // For boolean fields, show Sì/No
    if (this.type() === 'checkbox') {
      if (value === 'true') return 'Sì';
      if (value === 'false') return 'No';
    }

    // For date fields, format as dd/MM/yyyy
    if (this.type() === 'date') {
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime())) {
        return this.datePipe.transform(dateValue, 'dd/MM/yyyy') || value;
      }
    }

    return value;
  });

  // Computed signal for filter display text
  filterDisplayText = computed(() => {

    const hasOptions = this.hasOptions();

    const filterValue = this.filterValue();

    if (!filterValue || filterValue.value === undefined) return '';
    let value = filterValue.value;

    const isLookup = this.lookup();

    if(isLookup) {
      const values = this.lookupSelectedValues();
      return Object.values(values).map(d => d.label).join(',')
    }

    if (hasOptions && typeof value === 'object') {
      const options = this.options();
      // this.filterValue().value.map(f => this.options().find(x => x.value == f)).map(f => f.label).join(',')
      return `${(filterValue.value as any[]).map(v => options.find((opt) => opt.value == v)).filter(f => !!f).map(f => f.label).join(',')}`;
    }

    if(hasOptions && !Array.isArray(value)) {
      const options = this.options();
      return `${([filterValue.value] as any[]).map(v => options.find((opt) => opt.value == v)).filter(f => !!f).map(f => f.label).join(',')}`;
    }

    if (!value && value !== 0) return '';

    const operation = this.currentOperation();
    const icon = operation?.icon || '=';

    if (this.type() === 'date') {
      const dateValue = new Date(value as string);
      if (!isNaN(dateValue.getTime())) {
        value = this.datePipe.transform(dateValue, 'dd/MM/yyyy') || value;
      }
    }

    return `${icon} ${value}`;
  });

  constructor(private datePipe: DatePipe, private elementRef: ElementRef) {

    let inited = false;
    effect(() => {
      const filter = this.filterValue();
      const hasOptions = this.hasOptions();
      if (!inited && filter?.value !== undefined) {
        inited = true;
        untracked(() => {

          if(filter.filterOperator) this.filterOperator.set(filter.filterOperator);
          if (hasOptions) {

          }
          else if (!this.lookup()) {
            // this.stringFilterValue.set(filter.value as string | number);
            // this.filterOperator.set(filter.filterOperator)
          }
        })
      }
    });

    effect(() => {
      const type = this.type();
      if(type === 'text') {
        this.filterOperator.set(ComparisonOperator.Contains);
      }
    });

    effect(() => {
      const hasOptions = this.hasOptions();
      if (hasOptions) this.stringFilterValue.set({});
    });
  }

  // Convert value based on field type
  private convertValue(value: string | number): any {
    if (value === '0') return 0;
    if (!value || value === '') {
      return '';
    }

    // If boolean type, convert to boolean
    if (this.field().type?.toLowerCase() === 'boolean' || this.field().type?.toLowerCase() === 'bool') {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value; // fallback
    }

    // If numeric type, convert to number
    if (this.isNumericType()) {
      const numValue = Number(value);
      return isNaN(numValue) ? value : numValue;
    }

    // For other types, return as is
    return value;
  }

  // Select an operation
  selectOperation(operator: ComparisonOperator) {
    this.filterOperator.set(operator);
  }

  // Clear filter
  clearFilter() {
    this.stringFilterValue.set('');
    this.filterValue.set({
      value: '',
      filterOperator: ComparisonOperator.Eq
    });
  }


  applyFilter() {
    const filterValue = this.stringFilterValue();

    if (this.hasOptions()) {
      this.filterValue.set({ value: Object.keys(this.stringFilterValue()).map(x => {
        if(this.isNumericType()) return Number(x);
        return x;
      }) as any, filterOperator: ComparisonOperator.In });
    }
    else if (this.lookup()) {
      this.filterValue.set({ value: this.selectedItems() as any, filterOperator: ComparisonOperator.In });
    }
    else {
      const convertedValue = this.convertValue(filterValue as string | number);
      this.filterValue.set({ value: convertedValue, filterOperator: this.filterOperator() });
    }

    this.matMenuTriger()?.closeMenu();

  }

  selectValue(_t69: OptionItem) {
    const v = this.stringFilterValue() as Record<string | number, boolean>;

    if (!v[_t69.value]) {
      v[_t69.value] = true;
    } else {
      delete v[_t69.value];
    }
    this.stringFilterValue.set(v);
  }

  selection = signal<Record<string | number, boolean>>({});
  selectedItems = linkedSignal(() => {
    const selection = this.selection();
    return Object.keys(selection).filter(key => selection[key]);
  });
  lookupSelectedValues = signal<Record<string | number, { label: string, id: any, value: any }>>({})

  selectLokupValue(option: { label: string, id: any, value: any }) {
    this.selection.update(s => {
      if (!s[option.id]) {
        s[option.id] = true;
      } else {
        delete s[option.id];
      }
      return s;
    });
    this.lookupSelectedValues.update(s => {
      if (!s[option.id]) {
        s[option.id] = option;
      } else {
        delete s[option.id];
      }
      return s;
    })
    this.selectedItems.set(Object.keys(this.selection()).filter(key => this.selection()[key]));
  }

  map(arr: Array<any>): Array<{ label: string, id: any, value: any }> {
    const lookup = this.lookup();

    if (!lookup) return arr;

    const keys = lookup.displayFields || [];
    const idField = this.idField()!;
    return arr.filter(f => f).map(x => {
      return {
        label: keys.map(f => x[f]).join(','),
        id: x[idField.name!],
        value: x
      };
    })
  }

  idField() {
    const lookup = this.lookup();
    if (!lookup) return null;
    return Object.values(lookup.entity!.fields || {}).find(x => x.identifier)!;
  }

}

