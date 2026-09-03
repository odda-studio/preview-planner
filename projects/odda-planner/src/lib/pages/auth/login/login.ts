import { Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthenticationService } from '../../../services/authentication.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
@Component({
  selector: 'lib-login',
  imports: [MatFormFieldModule, MatInput, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  private readonly routerService = inject(Router)
  private readonly authenticationService = inject(AuthenticationService)
  private readonly snackBar = inject(MatSnackBar)

  login(value: { username: string; password: string }) {
    this.authenticationService.login(value)
      .pipe(catchError(er => {
        return throwError(() => {
          this.snackBar.open("Username o password errati", 'Close', {
            duration: 3000,
            panelClass: ['error-snack']
          })
        })
      }))
      .subscribe(res => {
        this.routerService.navigate(['/management'])
      })
  }
}
