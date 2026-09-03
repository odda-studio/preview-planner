import {Component, computed, inject, input, output, Type} from '@angular/core';
import {UiResourceMetadata} from '../../../base-crud-admin/models/model/uiResourceMetadata';
import {UiFormFieldMetadata} from '../../../base-crud-admin/models/model/uiFormFieldMetadata';
import {UiFieldMetadata} from '../../../base-crud-admin/models/model/uiFieldMetadata'
import {UiFormMetadata} from '../../../base-crud-admin/models/model/uiFormMetadata';
import {FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators} from '@angular/forms';
import {NgComponentOutlet} from '@angular/common';
import {BaseFormInputComponent} from '../base-form-input/base-form-input.component';
import {FORM_COMPONENT, SUBMIT_HANDLER, submitFunction} from '../../../provides/provide-table-data';
import {FormKind} from '../../../base-crud-admin/models/model/formKind';
import {catchError, throwError} from 'rxjs';

export type UiFormFieldWithField = (UiFormFieldMetadata & { field: UiFieldMetadata });

@Component({
  selector: 'lib-json-forms',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BaseFormInputComponent,
    NgComponentOutlet
  ],
  templateUrl: './json-forms.component.html',
  styleUrl: './json-forms.component.scss'
})
export class JsonFormsComponent<T> {
  components = inject<Record<string, Type<any>>>(FORM_COMPONENT);

  private submitHandler: submitFunction = inject<submitFunction>(SUBMIT_HANDLER);

  value = input<T>();
  formName = input.required<string>();
  metadata = input.required<UiResourceMetadata>();

  form = computed(() => {
    const name = this.formName();
    return this.metadata().forms![name];
  })

  rows = computed<UiFormFieldWithField[][]>(() => {
    const form = this.form();
    if (!form.fields) return [];

    const fields = Object.entries(form.fields);

    const map = fields
      .filter(x => !x[1].hidden?.self)
      .map(([name, field], index) => {
        const _ = this.metadata().fields![field.fieldName || name]
        return {
          type: _.type,
          field: _,
          row: Math.floor(index / (form.column || 2)),
          ...field
        }
      });

    const result: UiFormFieldWithField[][] = [];

    const maxLength = form.column || 2;
    let rowIndex = 0;
    for (const item of map) {
      const row = result[rowIndex] ?? [];

      let rowLength = row.reduce((tot, v) => tot + (v.layout.span || 1), 0);

      if ((rowLength + (item.layout.span || 1)) > maxLength) {
        result.push([item]);
        rowIndex = result.length - 1
      } else {
        row.push(item)
        rowLength += (item.layout.span || 1);
        if (!result[rowIndex]) {
          result.push(row)
          rowIndex = result.length - 1
        }

        if (rowLength === maxLength)
          rowIndex++;
      }
    }
    return result;
  })

  gridTemplateColumns = computed(() => {
    return `repeat(${this.form().column || 2}, 1fr)`
  })

  formGroup = computed(() => {
    const form = this.form();
    return this.buildForm(form);
  })

  onSubmit = output<{
    valid: boolean,
    value: T,
    formGroup: FormGroup,
    kind: FormKind,
    error?: any | undefined,
    submitted: boolean
  }>()

  buildForm(form: UiFormMetadata): FormGroup {
    const result = new FormGroup({})

    const fields = Object.entries(form.fields!);
    const formValue = this.value() as any;
    const identifier = this.identifier();
    const hasId = (formValue ?? {})[identifier?.name!] !== undefined;
    for (const [key, field] of fields) {
      const name = field.formFieldName;
      const value = formValue?.[field.fieldName || key] || (hasId ? formValue[name] : field.defaultValue);
      result.addControl(name, new FormControl(value, this.buildValidators(field)));
    }

    return result;
  }

  buildValidators(field: UiFormFieldMetadata): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required?.self)
      validators.push(Validators.required)

    return validators;
  }

  identifier = computed(() => {
    const table = this.metadata();
    return Object.values(table?.fields || {}).find(x => x.identifier);
  });

  handleSubmit() {
    const value = this.value() as Record<any, any> | null

    this.formGroup().markAllAsTouched();
    this.formGroup().markAllAsDirty();

    for (const controlKey of Object.keys(this.formGroup().controls)) {
      const errors = this.formGroup().controls[controlKey].errors;
      delete errors?.['__error'];
      if(errors && Object.keys(errors).length === 0) {
        this.formGroup().controls[controlKey].setErrors(null);
        continue;
      }
      this.formGroup().controls[controlKey].setErrors(errors);
    }

    if(this.formGroup().invalid) {
      this.onSubmit.emit({valid: false, value: value as T, formGroup: this.formGroup(), kind: this.form().kind, submitted: false});
      return;
    }

    this.submitHandler(
      this.metadata(),
      this,
      this.formGroup(),
      this.form().kind,
      this.formGroup().value,
      value?.[this.identifier()?.name!]
    )
      .pipe(
        catchError(x => {
          this.onSubmit.emit({valid: false, value: value as T, formGroup: this.formGroup(), kind: this.form().kind, error: x, submitted: true});
          return throwError(() => x);
        })
      )
      .subscribe(d => {
        this.onSubmit.emit({valid: true, value: d, formGroup: this.formGroup(), kind: this.form().kind, submitted: true})
        this.formGroup().reset();
      })
  }
}
