import {Component, inject} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {AuthService} from '../../../api';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'lib-request-password-change',
  standalone: true,
  imports: [
    FormsModule,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule
  ],
  templateUrl: './request-password-change.component.html',
  styleUrl: './request-password-change.component.scss'
})
export class RequestPasswordChangeComponent {

  private snackBar = inject(MatSnackBar)
  private authService = inject(AuthService)

  requestPasswordReset(value: any) {
    this.authService.requestPasswordRecovery({
      email: value.username
    }).subscribe({
      next: () => {
        this.snackBar.open('Se l\'indirizzo email esiste nel nostro sistema, riceverai una email con le istruzioni per reimpostare la tua password.', 'Close', {duration: 5000, panelClass: ['success-snack']});
      },
      error: (err) => {
        this.snackBar.open(`Errore durante la richiesta di reimpostazione della password: ${err.message}`, 'Close', {duration: 5000, panelClass: ['error-snack']});
      }
    })
  }
}
