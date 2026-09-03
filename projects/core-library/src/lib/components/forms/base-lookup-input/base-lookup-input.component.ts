import {Component, computed, effect, inject, input, signal, ViewChild, ElementRef} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
  MatOption
} from '@angular/material/autocomplete';
import {MatInputModule, MatLabel} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {IBaseFormInputComponent} from '../base-form-input/base-form-input.component';
import {UiFormFieldWithField} from '../json-forms/json-forms.component';
import {FETCH_DATA_TOKEN, fetchData} from '../../../provides/provide-table-data';
import {rxResource, toSignal} from '@angular/core/rxjs-interop';
import {UiResourceMetadata} from '../../../base-crud-admin/models/model/uiResourceMetadata';
import {UiResourceRefMetadata} from '../../../base-crud-admin/models/model/uiResourceRefMetadata';
import {map} from 'rxjs';
import {RelationType} from '../../../base-crud-admin/models/model/relationType';
import {MatChipsModule} from '@angular/material/chips';
import {FilterNodeDto} from '../../../base-crud-admin/models/model/filterNodeDto';
import {wrapResource} from '../../data-table/data-table.component';
import {debounced} from '../../../signals/debouced';
import {MatTooltipModule} from '@angular/material/tooltip'
@Component({
  selector: 'lib-base-lookup-input',
  standalone: true,
  imports: [
    MatLabel,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatAutocompleteTrigger,
    MatOption,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './base-lookup-input.component.html',
  styleUrl: './base-lookup-input.component.scss'
})
export class BaseLookupInputComponent<T, TContext> implements IBaseFormInputComponent<T, TContext> {
  context = input<TContext | null>();
  formField = input.required<UiFormFieldWithField>();
  formGroup = input.required<FormGroup>()
  formControl = input.required<FormControl<T>>();
  entityMetadata = input.required<UiResourceMetadata | UiResourceRefMetadata>();

  lookup = computed(() => {
    return this.formField().field.lookup;
  })

  multi = computed(() => {
    const lookup = this.lookup();
    return lookup?.relationType === RelationType.ManyToMany || lookup?.relationType === RelationType.OneToMany;
  })

  value = new FormControl();
  // multiSelectFormControl holds the selected items for chips: {label,id,value}
  multiSelectFormControl = new FormControl([] as Array<{label: string, id: any, value: T}>);

  valueChanges = toSignal(this.value.valueChanges);

  public readonly fetchData = inject<fetchData>(FETCH_DATA_TOKEN);

  search = signal('');

  debouncedSearch = debounced(this.search, 300);

  _options = rxResource({
    params: () => this.debouncedSearch(),
    stream: (value) => {
      const lookup = this.lookup();
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

      return this.fetchData(this.entityMetadata(), {
        page: 1,
        pageSize: 10,
        query: (value.params as any) || '',
        filters
      }).pipe(map(x => {
        return this.map(x?.data || []);
      }))
    }
  })

  _dataOptions = wrapResource(this._options);

  options = computed(() => {
    const d = this._dataOptions() as Array<any>;
    return d || [];
  })

  // riferimento all'input filtro (template usa #input)
  @ViewChild('input', {read: ElementRef}) filterInput?: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      const control = this.formControl();
      const multi = this.multi();

      if (multi && control.value && Array.isArray(control.value)) {
        // assume control.value is array of raw entities -> map to display items
        this.multiSelectFormControl.setValue(this.map(control.value))
      } else
        this.value.setValue(this.map([control.value])[0]);
    });


    effect(() => {
      const valueChanges = this.valueChanges();
      const idField = this.idField();
      const multi = this.multi();

      if (multi) {
        this.formControl().setValue(valueChanges?.map((f: any) => f[idField?.name!]))
      } else
        this.formControl().setValue(valueChanges?.[idField!.name!]);
    });

    // Sync multiSelectFormControl -> formControl (store array of ids)
    effect(() => {
      if (!this.multi()) return;
      const items = this.multiSelectFormControl.value || [];
      const ids = items.map((i: any) => i.id);
      // formControl generic T may not accept array in type system; cast to any for multi-case
      (this.formControl() as any).setValue(ids);
    });
  }

  displayWith = (value: any) => {
    const lookup = this.formField().field.lookup;

    if (!lookup || !value) return '';
    return value.label;
  }

  map(arr: Array<any>) {
    const lookup = this.formField().field.lookup;

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
    const lookup = this.formField().field.lookup;
    if (!lookup) return null;
    return Object.values(lookup.entity!.fields || {}).find(x => x.identifier)!;
  }

  add() {
    // non usato per ora: gestione dell'inserimento manuale
  }

  selected($event: MatAutocompleteSelectedEvent) {
    let selected = $event.option.value;

    // Normalizza la selezione: se non ha id, prova a mappare l'oggetto raw
    if (!selected || (selected && (selected.id === undefined || selected.id === null))) {
      const mapped = this.map([selected])[0];
      if (mapped) selected = mapped;
    }

    const current = this.multiSelectFormControl.value || [];
    // evita duplicati (confronto tollerante)
    const normalize = (v: any) => v === null || v === undefined ? String(v) : String(v);
    if (!current.find((c: any) => normalize(c.id) === normalize(selected.id))) {
      this.multiSelectFormControl.setValue([...current, selected]);
      this.value.setValue(this.multiSelectFormControl.value);
    }
    // pulisci il campo di ricerca
    this.search.set('');
    // rimetti il focus sull'input di filtraggio
    setTimeout(() => this.filterInput?.nativeElement?.focus(), 0);
  }

  remove(item: any) {
    this.multiSelectFormControl.setValue(
      this.multiSelectFormControl.value?.filter((x: any) => x.id !== item.id) ?? []
    )
    this.value.setValue(this.multiSelectFormControl.value);
  }

  markAsTouched() {
    this.formControl().markAsTouched();
  }

}
