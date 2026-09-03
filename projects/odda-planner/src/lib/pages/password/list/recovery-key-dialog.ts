import { Component, inject, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';

export interface RecoveryKeyDialogData {
  deviceName: string;
  recoveryCode: string;
}

@Component({
  selector: 'lib-recovery-key-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule,
  ],
  templateUrl: './recovery-key-dialog.html',
  styleUrl: './recovery-key-dialog.scss',
})
export class RecoveryKeyDialog {
  private dialogRef = inject(MatDialogRef<RecoveryKeyDialog>);
  private snackBar = inject(MatSnackBar);

  savedInSafePlace = false;
  understoodImportance = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: RecoveryKeyDialogData) {}

  copyRecoveryCode(): void {
    navigator.clipboard.writeText(this.data.recoveryCode).then(() => {
      this.snackBar.open('Recovery Key copiata negli appunti', 'Chiudi', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });
  }

  onConfirm(): void {
    if (this.savedInSafePlace && this.understoodImportance) {
      this.dialogRef.close(true);
    }
  }
}
