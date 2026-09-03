import { Component, inject, signal, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface ViewPasswordDialogData {
  secret: any;
  mode: 'view' | 'edit';
  canEdit: boolean;
  onDecrypt: (secret: any) => Promise<string>;
}

export interface EditPasswordResult {
  title: string;
  username: string;
  password: string;
  notes: string;
}

@Component({
  selector: 'lib-view-password-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './view-password-dialog.html',
  styleUrl: './view-password-dialog.scss',
})
export class ViewPasswordDialog implements OnInit {
  private dialogRef = inject(MatDialogRef<ViewPasswordDialog>);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(true);
  hidePassword = signal(true);
  errorMessage = signal<string | null>(null);
  decryptedPassword = signal<string>('');

  form!: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: ViewPasswordDialogData) {
    // Inizializza il form dopo che data è disponibile
    this.form = this.fb.group({
      title: [{ value: '', disabled: this.data.mode === 'view' }, [Validators.required]],
      username: [{ value: '', disabled: this.data.mode === 'view' }],
      password: [{ value: '', disabled: this.data.mode === 'view' }, [Validators.required]],
      notes: [{ value: '', disabled: this.data.mode === 'view' }],
    });
  }

  async ngOnInit() {
    try {
      // Decifra la password
      const decrypted = await this.data.onDecrypt(this.data.secret);
      this.decryptedPassword.set(decrypted);

      // Popola il form con i dati
      this.form.patchValue({
        title: this.data.secret.title || '',
        username: this.data.secret.username || '',
        password: decrypted,
        notes: this.data.secret.note || '',
      });

      this.isLoading.set(false);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Impossibile decifrare la password');
      this.isLoading.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const result: EditPasswordResult = this.form.getRawValue();
      this.dialogRef.close({ action: 'save', data: result });
    }
  }

  switchToEditMode(): void {
    this.data.mode = 'edit';
    this.form.enable();
  }

  copyPassword(): void {
    const password = this.form.get('password')?.value;
    if (password) {
      navigator.clipboard.writeText(password).then(() => {
        this.snackBar.open('Password copiata negli appunti', 'Chiudi', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      });
    }
  }
}
