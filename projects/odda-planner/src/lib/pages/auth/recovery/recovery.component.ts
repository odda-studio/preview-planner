import { Component, inject, signal } from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatFormField, MatInput, MatLabel, MatSuffix} from '@angular/material/input';
import {AuthService} from '../../../api';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'lib-recovery',
  standalone: true,
  imports: [
    FormsModule,
    MatFormField,
    MatInput,
    MatLabel,
    MatSuffix,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './recovery.component.html',
  styleUrl: './recovery.component.scss'
})
export class RecoveryComponent {

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router)

  private authService = inject(AuthService)
  
  hideNewPassword = signal(true);
  hideConfirmPassword = signal(true);
  recovery(value: any) {
    this.authService.resetPassword({
      token: this.activatedRoute.snapshot.paramMap.get('token')!,
      newPassword: value.newPassword
    }).subscribe({
      next: () => {
        this.snackbar.open('La tua password é stata modificata con successo', 'Close', {duration: 3000,panelClass: 'success-snack'}).afterDismissed().subscribe(() => {
          this.router.navigate(['/auth/login']);
        });
      },
      error: (err) => {
        this.snackbar.open(`Error resetting password: ${err.message}`, 'Close', {duration: 5000, panelClass: 'error-snack'});
      }
    });
  }
}
