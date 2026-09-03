import {Component, inject, input} from '@angular/core';
import {WINDOW} from '../../../tokens/window.token';
import {LayoutService} from '../layout-service';

@Component({
  selector: 'lib-main',
  standalone: true,
  imports: [],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent {

  full = input(false);
  public layoutService = inject(LayoutService);

}
