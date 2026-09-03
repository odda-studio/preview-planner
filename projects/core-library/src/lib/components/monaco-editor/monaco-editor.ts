import { Component, effect, ElementRef, forwardRef, input, InputSignal, viewChild, ViewChild } from '@angular/core';
import { loadMonaco } from './monaco-loader';
import { IBaseFormInputComponent } from '../forms/base-form-input/base-form-input.component';
import { FormControl, FormGroup, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule, ɵInternalFormsSharedModule } from '@angular/forms';
import { UiFormFieldWithField } from '../forms/json-forms/json-forms.component';
import { UiResourceMetadata } from '../../base-crud-admin/models/model/uiResourceMetadata';
import { UiResourceRefMetadata } from '../../base-crud-admin/models/model/uiResourceRefMetadata';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as Monaco from 'monaco-types'
declare const monaco: any;

@Component({
  selector: 'lib-monaco-editor',
  imports: [],
  templateUrl: './monaco-editor.html',
  styleUrl: './monaco-editor.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MonacoEditor),
      multi: true
    },
  ]
})
export class MonacoEditor {
  formControl = input.required<FormControl>();

  value = '';
  editorContainer = viewChild.required<ElementRef<HTMLDivElement>>('editorContainer');

  editor: Monaco.editor.IStandaloneCodeEditor | undefined;

  constructor() {
    effect(() => {
      const container = this.editorContainer();
      if (container) {
        this.init(container.nativeElement);
      }
    })

    effect(() => { });
  }

  async init(element: HTMLDivElement) {
    await loadMonaco();

    const value = this.formControl().value;
    this.editor = monaco.editor.create(element, {
      value: value ? JSON.stringify(value, null, 2) : '',
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false }
    });
    this.editor?.onDidChangeModelContent(() => {
      const value = this.editor?.getValue() || '';
      this.value = value;
      this.formControl().setValue(JSON.parse(value));
    });
  }

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

  }
}

@Component({
  selector: 'lib-monaco-editor-form',
  template: `
  <div class="py-4 flex items-center gap-2">
{{formField().label || formField().name}}
@if (formField().tooltip) {
    <mat-icon matSuffix [matTooltip]="formField().tooltip">
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
  <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
</svg>


    </mat-icon>
    }
</div>

  <lib-monaco-editor [formControl]="formControl()"></lib-monaco-editor>
  `,
  styleUrls: ['./monaco-editor.scss'],
  imports: [MonacoEditor, ɵInternalFormsSharedModule, ReactiveFormsModule, MatIcon, MatTooltipModule],
})
export class MonacoEditorFormComponent implements IBaseFormInputComponent<any, string | undefined> {
  context = input.required<any>();
  formControl = input.required<FormControl>();
  formGroup = input.required<FormGroup>();
  formField = input.required<UiFormFieldWithField>();
  entityMetadata = input.required<UiResourceMetadata | UiResourceRefMetadata>();

}