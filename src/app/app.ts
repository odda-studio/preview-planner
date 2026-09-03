import {Component, signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SpinnerComponent} from 'core-library';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SpinnerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  providers: [
  ]
})
export class App {
  protected readonly title = signal('base-cms');
}
