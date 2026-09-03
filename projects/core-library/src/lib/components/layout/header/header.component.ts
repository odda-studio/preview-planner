import {Component, inject} from '@angular/core';
import {NgIf} from "@angular/common";
import {LayoutService} from '../layout-service';

@Component({
  selector: 'lib-header',
  standalone: true,
  imports: [

  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  public readonly layoutService = inject(LayoutService);
}
