import {Component, input, model} from '@angular/core';

@Component({
  selector: 'lib-right-action-sidenav',
  standalone: true,
  imports: [],
  templateUrl: './right-action-sidenav.component.html',
  styleUrl: './right-action-sidenav.component.scss'
})
export class RightActionSidenavComponent {

  title = input('')
  show = model.required<boolean>()
}
