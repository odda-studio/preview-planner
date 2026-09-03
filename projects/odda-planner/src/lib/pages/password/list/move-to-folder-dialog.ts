import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { FolderDto } from '../../../api/index';

export interface MoveToFolderDialogData {
  folders: FolderDto[];
  currentFolderId: number | null | undefined;
  secretTitle: string;
}

@Component({
  selector: 'lib-move-to-folder-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    FormsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <mat-icon>folder_open</mat-icon>
        Sposta in Cartella
      </div>
    </h2>

    <mat-dialog-content>
      <div class="secret-info">
        <strong>Password:</strong> {{ data.secretTitle }}
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Cartella di destinazione</mat-label>
        <mat-select [(ngModel)]="selectedFolderId" placeholder="Seleziona una cartella">
          <mat-option [value]="null">
            <div class="folder-option">
              <mat-icon>clear</mat-icon>
              <span>Nessuna cartella</span>
            </div>
          </mat-option>
          @for (folder of data.folders; track folder.folderId) {
            <mat-option [value]="folder.folderId">
              <div class="folder-option">
                <div class="folder-option">
            <span class="flex gap-2 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path
                  d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
              </svg>
              {{ folder.name }}
            </span>
          </div>
              </div>
            </mat-option>
          }
        </mat-select>
        <mat-hint>
          @if (data.currentFolderId) {
            Attualmente in: {{ getCurrentFolderName() }}
          } @else {
            Attualmente senza cartella
          }
        </mat-hint>
      </mat-form-field>

      <div class="info-box">
        <mat-icon>info</mat-icon>
        <div>
          <strong>Organizzazione</strong>
          <p>
            Spostare questa password in una cartella ti aiuta a organizzare meglio il tuo vault.
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
        [disabled]="selectedFolderId === data.currentFolderId"
      >
        <mat-icon>check</mat-icon>
        Sposta
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 450px;
      padding: 1.5rem 0;
    }

    .secret-info {
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;

      strong {
        color: #374151;
        margin-right: 0.5rem;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .folder-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .info-box {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      margin-top: 1.5rem;

      mat-icon {
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

      button {
        mat-icon {
          margin-right: 0.25rem;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    h2 mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #6366f1;
    }
  `]
})
export class MoveToFolderDialog {
  private readonly dialogRef = inject(MatDialogRef<MoveToFolderDialog>);
  readonly data = inject<MoveToFolderDialogData>(MAT_DIALOG_DATA);

  selectedFolderId: number | null = this.data.currentFolderId ?? null;

  getCurrentFolderName(): string {
    const folder = this.data.folders.find(f => f.folderId === this.data.currentFolderId);
    return folder?.name || '';
  }

  onCancel() {
    this.dialogRef.close();
  }

  onConfirm() {
    this.dialogRef.close(this.selectedFolderId);
  }
}
