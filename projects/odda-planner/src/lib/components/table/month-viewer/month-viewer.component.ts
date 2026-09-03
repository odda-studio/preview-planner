import {Component, computed, input} from '@angular/core';
import {DataTableComponent, IBaseColumn} from 'core-library'
import {UiFieldMetadata, UiTableColumnMetadata} from '../../../api';

@Component({
  selector: 'lib-month-viewer',
  standalone: true,
  imports: [],
  templateUrl: './month-viewer.component.html',
  styleUrl: './month-viewer.component.scss'
})
export class MonthViewerComponent implements IBaseColumn {
    field = input.required<UiFieldMetadata>();
    tableField = input.required<UiTableColumnMetadata>();
    textValue = computed(() => {
      const monthValue = this.value();
      if (monthValue === null || monthValue === undefined || monthValue < 0 || monthValue > 11) {
        return '';
      }

      const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
      ];

      return months[monthValue];
    })
    context = input.required<any>();
    value = input.required<any>();
    componentContext = input.required<DataTableComponent<any>>();

}
