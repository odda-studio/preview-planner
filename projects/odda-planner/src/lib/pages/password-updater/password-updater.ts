import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../api';
import { catchError, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-password-updater',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './password-updater.html',
  styleUrl: './password-updater.scss',
})
export class PasswordUpdater {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  hideOldPassword = signal(true);
  hideNewPassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);

  form: FormGroup = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: this.passwordMatchValidator
  });

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading.set(true);
      const { oldPassword, newPassword } = this.form.value;

      this.authService.updatePassword({
        oldPassword,
        newPassword
      }).pipe(
        catchError((error) => {
          this.isLoading.set(false);
          
          // Gestione errori specifici
          if (error.status === 401 || error.status === 403) {
            this.snackBar.open('La vecchia password non è corretta', 'Chiudi', {
              duration: 5000,
              panelClass: ['error-snack']
            });
          } else {
            this.snackBar.open('Errore durante il cambio password. Riprova.', 'Chiudi', {
              duration: 5000,
              panelClass: ['error-snack']
            });
          }
          return of(null);
        })
      ).subscribe((result) => {
        this.isLoading.set(false);
        
        this.snackBar.open('Password modificata con successo', 'Chiudi', {
            duration: 3000,
            panelClass: ['success-snack']
          });
          this.form.reset();
      });
    } else {
      // Mostra errore se le password non corrispondono
      if (this.form.hasError('passwordMismatch')) {
        this.snackBar.open('Le nuove password non corrispondono', 'Chiudi', {
          duration: 5000,
          panelClass: ['error-snack']
        });
      } else {
        this.snackBar.open('Verifica i dati inseriti', 'Chiudi', {
          duration: 3000,
          panelClass: ['error-snack']
        });
      }
    }
  }
}
