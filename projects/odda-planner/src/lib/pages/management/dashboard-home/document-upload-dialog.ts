import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MediaDataModel, TimeSheetDataModel, TimesheetService } from '../../../api';
import { lastValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../services/authentication.service';

export interface DocumentUploadDialogData {
  timesheet: TimeSheetDataModel;
}

export interface DocumentUploadResult {
  proforma: File | null;
  additionalFiles: File[];
}

@Component({
  selector: 'lib-document-upload-dialog',
  standalone: true,
  imports: [MatDialogModule, CommonModule],
  template: `
    <div class="document-upload-dialog">
      <div class="text-xl font-bold border-b p-3 mb-4 flex items-center gap-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        Carica Documenti
      </div>
      
      <mat-dialog-content class="overflow-auto max-h-[70vh] space-y-6">
        @if(isExternal()) {
        <!-- Sezione Proforma -->
        <div>
          <label class="block text-gray-700 font-medium mb-2">
            Proforma <span class="text-red-500">*</span>
          </label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
            @if (!proformaFile()) {
            <label class="flex flex-col items-center cursor-pointer">
              <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <span class="text-gray-600 text-sm">Clicca per selezionare il file proforma</span>
              <span class="text-gray-400 text-xs mt-1">PDF, DOC, DOCX</span>
              <input type="file" class="hidden" (change)="onProformaFileSelected($event)" accept=".pdf,.doc,.docx">
            </label>
            } @else {
            <div class="flex items-center justify-between bg-gray-50 rounded p-3">
              <div class="flex items-center gap-3">
                <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div>
                  <div class="font-medium text-gray-800">{{proformaFile()!.name}}</div>
                  <div class="text-sm text-gray-500">{{formatFileSize(proformaFile()!.size)}}</div>
                </div>
              </div>
              <button (click)="removeProformaFile()" class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            }
          </div>
        </div>
        }


        <!-- Sezione Documenti Aggiuntivi -->
        <div>
          <label class="block text-gray-700 font-medium mb-2">
            Eventuali documenti 
          </label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors mb-3">
            <label class="flex flex-col items-center cursor-pointer">
              <svg class="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span class="text-gray-600 text-sm">Clicca per aggiungere documenti</span>
              <span class="text-gray-400 text-xs mt-1">PDF, DOC, DOCX, JPG, PNG</span>
              <input type="file" multiple class="hidden" (change)="onAdditionalFilesSelected($event)" 
                     accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
            </label>
          </div>
          
          @if (additionalFiles().length > 0) {
          <div class="space-y-2">
            @for (file of additionalFiles(); track file.name; let i = $index) {
            <div class="flex items-center justify-between bg-gray-50 rounded p-3">
              <div class="flex items-center gap-3">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div>
                  <div class="font-medium text-gray-800">{{file.name}}</div>
                  <div class="text-sm text-gray-500">{{formatFileSize(file.size)}}</div>
                </div>
              </div>
              <button (click)="removeAdditionalFile(i)" class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            }
          </div>
          }
        </div>

        <!-- Sezione Documenti Già Caricati -->
        @if (existingMedias().length > 0) {
        <div>
          <label class="block text-gray-700 font-medium mb-2">
            Documenti Già Caricati
          </label>
          <div class="space-y-2">
            @for (doc of existingMedias(); track doc.id) {
            <div class="flex items-center justify-between bg-gray-100 rounded p-3">
              <div class="flex items-center gap-3">
                <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div>
                  <div class="font-medium text-gray-800">
                    {{doc.name}}
                    @if(doc.isProforma) {
                        <span class="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">Proforma</span>
                    }
                </div>
                  <div class="text-sm text-gray-500"></div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <a [href]="doc.url" target="_blank" class="text-blue-500 hover:text-blue-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              </a>
              <button (click)="deleteExistingMedia(doc)" class="text-red-500 hover:text-red-700 ml-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
            </button>
              </div>  
              
            </div>
            }
          </div>
        </div>
        }
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="border-t pt-3 mt-4">
        <button 
          mat-button 
          (click)="cancel()"
          class="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
          Annulla
        </button>
        <button 
          mat-button 
          (click)="confirm()"
          [disabled]="(!proformaFile() && !additionalFiles().length) || isUploading()"
          class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-2">
          @if (isUploading()) {
            <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Caricamento...
          } @else {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            Carica Documenti
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .document-upload-dialog {
      min-width: 600px;
      max-width: 90vw;
    }

    @media (max-width: 768px) {
      .document-upload-dialog {
        min-width: 100%;
      }
    }
  `]
})
export class DocumentUploadDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DocumentUploadDialogComponent>);
  readonly data = inject<DocumentUploadDialogData>(MAT_DIALOG_DATA);
  private readonly snackBar = inject(MatSnackBar);
  private readonly timesheetService = inject(TimesheetService);
  private readonly authService = inject(AuthenticationService)

  proformaFile = signal<File | null>(null);
  additionalFiles = signal<File[]>([]);
  isUploading = signal(false);
  existingMedias = signal<MediaDataModel[]>(this.data.timesheet.medias ?? []);
  isExternal = computed(() => {
    const isExternal = this.authService.isExternal();
    const isAdmin = this.authService.isAdmin();
    return isExternal || isAdmin;
  });

  /**
   * Gestisce la selezione del file proforma
   */
  onProformaFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.proformaFile.set(input.files[0]);
    }
  }

  /**
   * Gestisce la selezione di documenti aggiuntivi
   */
  onAdditionalFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      this.additionalFiles.update(files => [...files, ...newFiles]);
    }
  }

  /**
   * Rimuove un file aggiuntivo dalla lista
   */
  removeAdditionalFile(index: number) {
    this.additionalFiles.update(files => files.filter((_, i) => i !== index));
  }

  /**
   * Rimuove il file proforma
   */
  removeProformaFile() {
    this.proformaFile.set(null);
  }

  /**
   * Formatta la dimensione del file in modo leggibile
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Annulla e chiude il dialog
   */
  cancel() {
    this.dialogRef.close(null);
  }

  /**
   * Conferma e ritorna i file selezionati
   */
  async confirm() {
    const result: DocumentUploadResult = {
      proforma: this.proformaFile(),
      additionalFiles: this.additionalFiles()
    };

    this.isUploading.set(true);
    try {
      for (const file of result.additionalFiles) {
        await lastValueFrom(this.timesheetService.uploadTimesheetMedia({
          id: this.data.timesheet.uuid!,
          isProforma: false,
          file
        }));
      }

      if (this.proformaFile())
        await lastValueFrom(this.timesheetService.uploadTimesheetMedia({
          id: this.data.timesheet.uuid!,
          isProforma: true,
          file: result.proforma!
        }));

      this.snackBar.open('Documenti caricati con successo', 'Chiudi', { duration: 3000, panelClass: 'success-snack' });
      this.dialogRef.close(result);
    } catch (error) {
      this.snackBar.open('Errore durante il caricamento dei documenti', 'Chiudi', { duration: 3000, panelClass: 'error-snack' });
    } finally {
      this.isUploading.set(false);
    }
  }

  deleteExistingMedia(media: MediaDataModel) {

    this.snackBar.open('Confermi la cancellazione del documento?', 'Conferma', {
      duration: 10000,
      panelClass: 'success-snack'
    }).onAction().subscribe(() => {
      this.timesheetService.deleteTimesheetMedia({
        mediaId: media.id!,
        id: this.data.timesheet.uuid!
      }).subscribe(() => {
        this.snackBar.open('Documento eliminato con successo', 'Chiudi', { duration: 3000, panelClass: 'success-snack' });
        this.existingMedias.update(medias => medias.filter(m => m.id !== media.id));
      })
    });
  }
}
