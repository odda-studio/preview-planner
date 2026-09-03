# CoreLibrary

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.0.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the library, run:

```bash
ng build core-library
```

This command will compile your project, and the build artifacts will be placed in the `dist/` directory.

### Publishing the Library

Once the project is built, you can publish your library by following these steps:

1. Navigate to the `dist` directory:
   ```bash
   cd dist/core-library
   ```

2. Run the `npm publish` command to publish your library to the npm registry:
   ```bash
   npm publish
   ```

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## DataTable Component - Row Selection

The DataTable component supports row selection with checkboxes. Each row can be individually selected, and there's a "Select All" checkbox in the header.

### Features

- **Individual Selection**: Click on a checkbox in any row to select/deselect it
- **Select All**: Click the checkbox in the table header to select/deselect all rows on the current page
- **Indeterminate State**: The header checkbox shows an indeterminate state when some (but not all) rows are selected
- **Selection Events**: Listen to `selectionChange` event to react to selection changes
- **Optional Feature**: Enable/disable selection with the `allowSelection` input

### Usage

```typescript
// In your component template
<lib-data-table
  [metadata]="metadata"
  [tableName]="tableName"
  [allowSelection]="true"
  (selectionChange)="onSelectionChange($event)"
  #dataTable
/>

// In your component class
onSelectionChange(event: {selectedRows: Set<any>, selectedAll: boolean}) {
  console.log('Selected row IDs:', Array.from(event.selectedRows));
  console.log('All selected:', event.selectedAll);
}

// Access selected rows programmatically
@ViewChild('dataTable') dataTable!: DataTableComponent;

getSelectedData() {
  const selectedIds = this.dataTable.getSelectedRowIds();
  const selectedRows = this.dataTable.getSelectedRows();
  console.log('Selected IDs:', selectedIds);
  console.log('Selected row data:', selectedRows);
}

clearAllSelections() {
  this.dataTable.clearSelection();
}
```

### API

#### Inputs
- `allowSelection: boolean` - Enable/disable row selection with checkboxes (default: `false`)

#### Signals
- `selectedRows: Signal<Set<any>>` - Set of selected row identifiers
- `selectedAll: Signal<boolean>` - Whether all rows are selected

#### Methods
- `getSelectedRowIds(): any[]` - Returns array of selected row identifiers
- `getSelectedRows(): any[]` - Returns array of selected row data objects
- `clearSelection(): void` - Clears all selections

#### Events
- `selectionChange: EventEmitter<{selectedRows: Set<any>, selectedAll: boolean}>` - Emitted when selection changes

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
