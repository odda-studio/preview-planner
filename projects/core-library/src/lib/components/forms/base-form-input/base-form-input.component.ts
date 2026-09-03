import {Component, computed, forwardRef, input, InputSignal} from '@angular/core';
import {FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';
import {UiFormFieldWithField} from '../json-forms/json-forms.component';
import {UiResourceMetadata} from '../../../base-crud-admin/models/model/uiResourceMetadata';
import {UiResourceRefMetadata} from '../../../base-crud-admin/models/model/uiResourceRefMetadata';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatDateFormats, MatNativeDateModule} from '@angular/material/core';
import {provideLuxonDateAdapter} from '@angular/material-luxon-adapter';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatTooltipModule} from '@angular/material/tooltip'

export const MY_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'dd/MM/yyyy',
    timeInput: 'dd/MM/yyyy',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'DD',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

export interface IBaseFormInputComponent<T, TContext> {
  context: InputSignal<TContext | null | undefined>

  formControl: InputSignal<FormControl<T>>
  formGroup: InputSignal<FormGroup>;
  formField: InputSignal<UiFormFieldWithField>
  entityMetadata: InputSignal<UiResourceMetadata | UiResourceRefMetadata>
}

@Component({
  selector: 'lib-base-form-input',
  standalone: true,
  imports: [
    MatLabel,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatSelect,
    MatOption,
    MatNativeDateModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BaseFormInputComponent),
      multi: true
    },
    provideLuxonDateAdapter(MY_FORMATS),
  ],
  templateUrl: './base-form-input.component.html',
  styleUrl: './base-form-input.component.scss'
})
export class BaseFormInputComponent<T, TContext> implements IBaseFormInputComponent<T, TContext> {
  context = input<TContext | null>();
  formField = input.required<UiFormFieldWithField>();
  formGroup = input.required<FormGroup>()
  formControl = input.required<FormControl<T>>();
  entityMetadata = input.required<UiResourceMetadata | UiResourceRefMetadata>();

  value: any;
  disabled = false;

  // Computed signal to check if field is numeric
  isNumericType = computed(() => {
    const fieldType = this.formField().field.type?.toLowerCase();
    return fieldType === 'number' ||
           fieldType === 'int' ||
           fieldType === 'int16' ||
           fieldType === 'int32' ||
           fieldType === 'int64' ||
           fieldType === 'long' ||
           fieldType === 'short' ||
           fieldType === 'byte' ||
           fieldType === 'double' ||
           fieldType === 'float' ||
           fieldType === 'decimal' ||
           fieldType === 'single' ||
           fieldType?.includes('int');
  });

  isBooleanType = computed(() => {
    const fieldType = this.formField().field.type?.toLowerCase();
    return fieldType === 'boolean' || fieldType === 'bool';
  });

  // Computed signal for input step (integer types: 1, decimal types: 0.01)
  inputStep = computed(() => {
    if(this.formField().step) return this.formField().step;
    const fieldType = this.formField().field.type?.toLowerCase();

    // Integer types - step 1 (no decimals)
    const integerTypes = ['int', 'int16', 'int32', 'int64', 'long', 'short', 'byte'];
    if (integerTypes.some(type => fieldType === type)) {
      return '1';
    }

    // Decimal types - step 0.01 (allows 2 decimal places)
    const decimalTypes = ['double', 'float', 'decimal', 'single', 'number'];
    if (decimalTypes.some(type => fieldType === type)) {
      return '0.01';
    }

    // Default for other numeric types
    return 'any';
  });

  private onChange = (_: any) => {
  };
  private onTouched = () => {
  };

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
  }

  onDateChange(event: any) {
    const field = this.formField().field;
    if (field.type === 'DateOnly' && event.value) {
      const date = event.value instanceof Date ? event.value : new Date(event.value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      this.formControl().setValue(formattedDate as any, {emitEvent: false});
      // this.formControl().setValue(date.toISOString());
    } else {
      const date = event.value instanceof Date ? event.value : new Date(event.value);
      this.formControl().setValue(date.toISOString());
    }
  }

  get conflict() {
    const formControl = this.formControl();
    return formControl.getError('__error')?.indexOf('conflict') > -1;
  }
}
