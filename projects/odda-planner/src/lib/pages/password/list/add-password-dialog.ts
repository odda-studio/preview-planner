import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { FolderDto } from '../../../api/index';

export interface AddPasswordData {
  title: string;
  username: string;
  password: string;
  notes: string;
  folderId?: number | null;
}

export interface AddPasswordDialogData {
  folders: FolderDto[];
  folderId: number | null | undefined;
}

@Component({
  selector: 'lib-add-password-dialog',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
  templateUrl: './add-password-dialog.html',
  styleUrl: './add-password-dialog.scss',
})
export class AddPasswordDialog {
  private dialogRef = inject(MatDialogRef<AddPasswordDialog>);
  private fb = inject(FormBuilder);
  readonly data = inject<AddPasswordDialogData>(MAT_DIALOG_DATA, { optional: true });

  isLoading = signal(false);
  hidePassword = signal(true);
  showGenerator = signal(false);

  // Opzioni generatore password
  passwordLength = new FormControl(12, [Validators.min(8), Validators.max(64)]);
  includeUppercase = signal(true);
  includeLowercase = signal(true);
  includeNumbers = signal(true);
  includeSpecial = signal(true);
  makeReadable = signal(false);

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    username: [''],
    password: ['', [Validators.required]],
    notes: [''],
    folderId: [null],
  });

  constructor() {
    if (this.data) {
      this.form.patchValue({
        folderId: this.data.folderId || null,
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      const data: AddPasswordData = this.form.value;
      this.dialogRef.close(data);
    }
  }

  toggleGenerator(): void {
    this.showGenerator.update(v => !v);
  }

  generatePassword(): void {
    const length = this.passwordLength.value ?? 16;
    const readable = this.makeReadable();

    let password: string;

    if (readable) {
      password = this.generateReadablePassword(length);
    } else {
      password = this.generateRandomPassword(length);
    }

    this.form.patchValue({ password });
    this.hidePassword.set(false); // Mostra la password generata
  }

  private generateRandomPassword(length: number): string {
    let charset = '';
    
    if (this.includeLowercase()) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (this.includeUppercase()) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (this.includeNumbers()) charset += '0123456789';
    if (this.includeSpecial()) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // Fallback se nessuna opzione selezionata
    if (charset === '') charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, x => charset[x % charset.length]).join('');
  }

  private generateReadablePassword(targetLength: number): string {
    // Parole semplici e facili da ricordare
    const words = [
      'sole', 'luna', 'mare', 'cielo', 'terra', 'fuoco', 'acqua', 'vento',
      'rosa', 'verde', 'blu', 'rosso', 'oro', 'nero', 'alba', 'notte',
      'casa', 'porta', 'libro', 'nota', 'penna', 'carta', 'stella', 'via',
      'gatto', 'cane', 'uccello', 'pesce', 'fiore', 'albero', 'monte', 'fiume',
      'tempo', 'anno', 'giorno', 'ora', 'momento', 'fine', 'inizio', 'centro',
      'mela', 'pera', 'uva', 'pane', 'sale', 'luce', 'ombra', 'sogno'
    ];
    
    const separators = this.includeSpecial() ? ['-', '_', '.', '+'] : ['-'];
    const array = new Uint32Array(10);
    crypto.getRandomValues(array);
    
    let password = '';
    let wordIndex = 0;
    
    while (password.length < targetLength) {
      const word = words[array[wordIndex % array.length] % words.length];
      const capitalizedWord = this.includeUppercase() 
        ? word.charAt(0).toUpperCase() + word.slice(1) 
        : word;
      
      if (password.length > 0) {
        const sep = separators[array[(wordIndex + 1) % array.length] % separators.length];
        password += sep;
      }
      
      password += capitalizedWord;
      
      // Aggiungi numero se richiesto
      if (this.includeNumbers() && wordIndex % 2 === 1) {
        password += (array[(wordIndex + 2) % array.length] % 100).toString();
      }
      
      wordIndex++;
      if (wordIndex > 8) break; // Massimo parole per evitare loop infinito
    }
    
    return password.substring(0, Math.max(targetLength, password.length));
  }
}
