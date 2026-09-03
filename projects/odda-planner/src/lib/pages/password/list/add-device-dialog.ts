import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface AddDeviceData {
  deviceName: string;
  password: string | null;
  directAccessMode: boolean;
}

@Component({
  selector: 'lib-add-device-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './add-device-dialog.html',
  styleUrl: './add-device-dialog.scss',
})
export class AddDeviceDialog {
  private dialogRef = inject(MatDialogRef<AddDeviceDialog>);
  private fb = inject(FormBuilder);

  isLoading = signal(false);

  form: FormGroup = this.fb.group({
    deviceName: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    directAccessMode: [false],
  });

  constructor() {
    // Quando directAccessMode cambia, aggiorna i validatori della password
    this.form.get('directAccessMode')?.valueChanges.subscribe(directAccessMode => {
      const passwordControl = this.form.get('password');
      if (directAccessMode) {
        passwordControl?.clearValidators();
      } else {
        passwordControl?.setValidators([Validators.required, Validators.minLength(8)]);
      }
      passwordControl?.updateValueAndValidity();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      const data: AddDeviceData = {
        ...this.form.value,
        password: this.form.value.directAccessMode ? null : this.form.value.password
      };
      this.dialogRef.close(data);
    }
  }
}