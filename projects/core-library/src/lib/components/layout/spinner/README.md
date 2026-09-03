# Spinner Component

## Descrizione
Il componente `SpinnerComponent` mostra un overlay con uno spinner animato durante le operazioni asincrone.

## Caratteristiche
- ✅ **Anti-flickering**: Usa un contatore interno per gestire richieste HTTP multiple simultanee
- ✅ **Animazione SVG fluida**: Spinner circolare con animazione elegante
- ✅ **Overlay con blur**: Background semi-trasparente con effetto blur
- ✅ **Gestione automatica**: L'interceptor HTTP gestisce automaticamente la visibilità

## Utilizzo

### 1. Aggiungere nel template principale
```html
<lib-spinner />
<router-outlet />
```

### 2. Interceptor HTTP (configurato in app.config.ts)
L'interceptor gestisce automaticamente lo spinner per tutte le richieste HTTP:
- Mostra lo spinner all'inizio della richiesta
- Nasconde lo spinner alla fine (success o error)
- Usa un contatore per evitare flickering con richieste multiple

### 3. Uso manuale nel codice
```typescript
import { LayoutService } from 'core-library';

export class MyComponent {
  private layoutService = inject(LayoutService);
  
  async doSomething() {
    // Mostra lo spinner
    this.layoutService.showSpinner();
    
    try {
      await this.longOperation();
    } finally {
      // Nasconde lo spinner
      this.layoutService.hideSpinner();
    }
  }
  
  // Reset completo del contatore (use con cautela)
  resetAll() {
    this.layoutService.resetSpinner();
  }
}
```

## API - LayoutService

### Metodi
- `showSpinner()`: Incrementa il contatore e mostra lo spinner se > 0
- `hideSpinner()`: Decrementa il contatore e nasconde lo spinner se = 0
- `resetSpinner()`: Reset del contatore e nasconde lo spinner (da usare solo in casi eccezionali)

### Signal
- `spinnerVisible: Signal<boolean>`: Signal readonly per la visibilità dello spinner

## Come funziona il contatore
```
Richiesta 1 start → counter = 1 → spinner VISIBLE
Richiesta 2 start → counter = 2 → spinner VISIBLE
Richiesta 1 end   → counter = 1 → spinner VISIBLE (no flickering!)
Richiesta 2 end   → counter = 0 → spinner HIDDEN
```

Questo previene il flickering quando più richieste HTTP sono in corso contemporaneamente.

## Personalizzazione

### Modifica del testo
Modifica `spinner.component.html`:
```html
<p class="spinner-text">Il tuo testo...</p>
```

### Modifica degli stili
Modifica `spinner.component.scss` per personalizzare:
- Colore dello spinner (`stroke` property)
- Dimensioni
- Colore di background dell'overlay
- Velocità dell'animazione
