import { Component, effect, ElementRef, model, viewChild } from '@angular/core';
import jspreadsheet, { ToolbarItem } from "jspreadsheet-ce";
import { DataTableComponent } from '../data-table/data-table.component';

@Component({
  selector: 'lib-worksheet',
  imports: [],
  templateUrl: './worksheet.html',
  styleUrl: './worksheet.scss',
})
export class Worksheet<T> extends DataTableComponent<T> {

  spreadsheet = viewChild<ElementRef<HTMLDivElement>>('spreadsheet');
  spreadInstance = model<jspreadsheet.WorksheetInstance[]>();

  constructor() {
    super();
    effect(() => {
      const spereadsheetEl = this.spreadsheet();
      const columns = this.columns();
      if (spereadsheetEl && columns) {
        const instance = jspreadsheet(spereadsheetEl.nativeElement, {

          toolbar: (toolbar: { items: ToolbarItem[] }) => {
            // Add a new custom item in the end of my toolbar
            toolbar.items.push({
              tooltip: 'My custom item',
              content: 'share',
              onclick: function () {
                alert('Custom click');
              }
            });
            debugger

            return toolbar;
          },
          worksheets: [
            {
              search: true,
              pagination: 10,
              paginationOptions: [10, 25, 50, 100],
              columns: columns.map(col => {
                return {
                  type: col.field.type === 'number' ? 'numeric' : 'text',
                  title: (col.column.label || col.field.label || col.column.name || col.field.name)!
                }
              })
            }
          ]
        });

        this.spreadInstance.set(instance)
      }
    })


    effect(() => {
      const data = this.tableData.value();
      const columns = this.columns();
      if (data?.data && columns) {
        const values = data.data.map((row: any) => {
          return columns.map(col => row[col.field.name!])
        })
        this.spreadInstance()?.at(0)?.setData(values)
      }
    })
  }
}
