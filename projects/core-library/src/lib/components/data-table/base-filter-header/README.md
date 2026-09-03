# Base Filter Header Component

Componente di filtro avanzato con input di testo e menu a dropdown per selezionare operazioni di filtro.

## Utilizzo

```typescript
import { BaseFilterHeaderComponent, FilterOperator } from '@lib/components/data-table/base-filter-header/base-filter-header.component';

// Nel template
<lib-base-filter-header
  [(filterValue)]="filterValue"
  [(filterOperator)]="filterOperator"
  [placeholder]="'Cerca per nome...'"
  [columnName]="'name'"
/>
```

## Operazioni disponibili

- **Equal (=)**: Esatto
- **NotEqual (≠)**: Diverso
- **Contains (⊃)**: Contiene
- **Greater (>)**: Maggiore
- **GreaterThanOrEqual (≥)**: Maggiore o Uguale
- **Lower (<)**: Minore
- **LowerThanOrEqual (≤)**: Minore o Uguale

## API

### Input
- `placeholder`: string - Testo placeholder dell'input
- `columnName`: string - Nome della colonna da filtrare

### Model (two-way binding)
- `filterValue`: string - Valore del filtro
- `filterOperator`: FilterOperator - Operatore selezionato

### Segnali
- `isMenuOpen`: boolean - Stato del menu dropdown
- `filterOperations`: FilterOperation[] - Lista delle operazioni disponibili
- `currentOperation`: FilterOperation | undefined - Operazione attualmente selezionata

### Metodi
- `toggleMenu()`: Attiva/disattiva visibilità del menu
- `closeMenu()`: Chiude il menu
- `selectOperation(operator: FilterOperator)`: Seleziona un'operazione
- `clearFilter()`: Svuota il valore del filtro

