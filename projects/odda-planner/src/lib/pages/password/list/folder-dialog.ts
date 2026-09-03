import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FolderDto } from '../../../api/index';

export interface FolderDialogData {
  folder: FolderDto | null;
}

@Component({
  selector: 'lib-folder-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.folder ? 'Modifica Cartella' : 'Nuova Cartella' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width pt-2">
          <mat-label>Nome Cartella</mat-label>
          <input matInput formControlName="name" placeholder="es. Lavoro, Personale" autofocus />
          @if (form.controls.name.hasError('required')) {
            <mat-error>Il nome è obbligatorio</mat-error>
          }
          <mat-hint>Un nome descrittivo per identificare questa cartella</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrizione</mat-label>
          <textarea
            matInput
            formControlName="description"
            placeholder="Descrizione opzionale della cartella"
            rows="3"
            style="resize: none;"
          ></textarea>
          <mat-hint>Opzionale: aggiungi una descrizione</mat-hint>
        </mat-form-field>
      </form>

      <div class="info-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <div>
          <strong>Organizza le tue password</strong>
          <p>
            Le cartelle ti aiutano a organizzare le password in gruppi. 
            Puoi spostare le password tra cartelle in qualsiasi momento.
          </p>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annulla</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onConfirm()"
        [disabled]="!form.valid"
      >
        {{ data.folder ? 'Salva' : 'Crea Cartella' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 450px;
      padding: 1.5rem 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .info-box {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      margin-top: 1.5rem;

      svg {
        color: #3b82f6;
        flex-shrink: 0;
      }

      strong {
        display: block;
        color: #1e40af;
        margin-bottom: 0.25rem;
      }

      p {
        margin: 0;
        color: #1e3a8a;
        font-size: 0.875rem;
        line-height: 1.5;
      }
    }

    mat-dialog-actions {
      padding: 1rem 0 0;
      margin: 0;
    }
  `]
})
export class FolderDialog {
  private readonly dialogRef = inject(MatDialogRef<FolderDialog>);
  readonly data = inject<FolderDialogData>(MAT_DIALOG_DATA);

  form = new FormGroup({
    name: new FormControl(this.data.folder?.name || '', [Validators.required]),
    description: new FormControl(this.data.folder?.description || '')
  });

  onCancel() {
    this.dialogRef.close();
  }

  onConfirm() {
    if (this.form.valid) {
      this.dialogRef.close({
        name: this.form.value.name,
        description: this.form.value.description
      });
    }
  }
}
