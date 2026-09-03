# 🎯 Sistema Filtri con Operatori Logici AND/OR

## ✅ Implementato

Ho aggiunto la possibilità per l'utente di **combinare filtri con operatori logici AND e OR**, permettendo query complesse e flessibili.

---

## 🆕 Nuova Funzionalità

### Operatori Logici tra Filtri

Ogni filtro può ora specificare come deve essere combinato con il filtro successivo:
- **AND** (∧): Il filtro successivo deve essere ANCHE vero
- **OR** (∨): OPPURE il filtro successivo deve essere vero

---

## 🎨 UI Implementata

### Selettore Operatore Logico

Dopo ogni filtro (eccetto l'ultimo), appare un selettore con due pulsanti:

```
┌─────────────────────────────────────────┐
│ Campo:     [Status        ▼]            │
│ Operatore: [Uguale a      ▼]            │
│ Valore:    [active         ]        [X] │
├─────────────────────────────────────────┤
│ Operatore logico: [AND] [OR]            │ ← NUOVO!
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Campo:     [Age           ▼]            │
│ Operatore: [Maggiore di   ▼]            │
│ Valore:    [25            ]         [X] │
└─────────────────────────────────────────┘
```

### Stile Pulsanti
- **AND**: Blu quando selezionato (`bg-blue-600`)
- **OR**: Arancione quando selezionato (`bg-orange-600`)
- Grigio quando non selezionato (`bg-gray-100`)

---

## 📋 Esempi Pratici

### Esempio 1: Query con AND (Tutti i criteri devono essere veri)

**Query**: "Utenti attivi premium"
```
Status = active
    AND
Subscription = premium
```

**SQL equivalente:**
```sql
WHERE status = 'active' AND subscription = 'premium'
```

**Risultato**: Solo utenti che sono ENTRAMBI attivi E premium

---

### Esempio 2: Query con OR (Almeno un criterio deve essere vero)

**Query**: "Utenti attivi o premium"
```
Status = active
    OR
Subscription = premium
```

**SQL equivalente:**
```sql
WHERE status = 'active' OR subscription = 'premium'
```

**Risultato**: Utenti che sono attivi, OPPURE premium, OPPURE entrambi

---

### Esempio 3: Query Mista (Combinazione AND/OR)

**Query**: "Utenti giovani attivi o premium"
```
Age < 30
    AND
Status = active
    OR
Subscription = premium
```

**Interpretazione con precedenza**:
```
(Age < 30 AND Status = active) OR (Subscription = premium)
```

**Risultato**: 
- Utenti giovani (< 30) che sono attivi
- OPPURE
- Qualsiasi utente premium (anche se over 30 o non attivo)

---

### Esempio 4: Query Complessa

**Query**: "Lead caldi o opportunità ad alto valore"
```
Temperature = hot
    AND
Contacted = false
    OR
Deal Value > 10000
    AND
Stage = negotiation
```

**Risultato**:
- Lead caldi non ancora contattati
- OPPURE
- Opportunità in negoziazione con valore > 10K

---

## 💾 Struttura Dati

### FilterRow Interface (Aggiornata)

```typescript
export interface FilterRow {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 
            'greaterThan' | 'lessThan' | 'greaterOrEqual' | 
            'lessOrEqual' | 'notEquals';
  value: any;
  logicOperator?: 'AND' | 'OR';  // ← NUOVO!
}
```

### Esempio Array di Filtri

```typescript
const filters: FilterRow[] = [
  {
    id: 'filter_1',
    field: 'status',
    operator: 'equals',
    value: 'active',
    logicOperator: 'AND'  // Combina con il prossimo usando AND
  },
  {
    id: 'filter_2',
    field: 'age',
    operator: 'greaterThan',
    value: '25',
    logicOperator: 'OR'   // Combina con il prossimo usando OR
  },
  {
    id: 'filter_3',
    field: 'subscription',
    operator: 'equals',
    value: 'premium'
    // Nessun logicOperator perché è l'ultimo filtro
  }
];
```

**Interpretazione**:
```
(status = active AND age > 25) OR subscription = premium
```

---

## 🔄 Preview Query Salvate

Quando passi il mouse su una query salvata, ora vedi anche gli operatori logici:

```
🔖 Utenti Premium o Over 25
   3 filtri · 2h fa
   ─────────────────────────
   Status = active AND        ← AND in blu
   Age > 25 OR                ← OR in arancione
   Subscription = premium
```

---

## 🛠️ Gestione nel Base-Entity Component

### Metodo onFiltersApplied (Aggiornato)

```typescript
onFiltersApplied(filters: FilterRow[]) {
  console.log('Filtri applicati:', filters);
  
  // Mostra i filtri con operatori logici
  filters.forEach((filter, index) => {
    const logicOp = filter.logicOperator && index < filters.length - 1 
      ? ` ${filter.logicOperator} ` 
      : '';
    console.log(`- ${filter.field} ${filter.operator} ${filter.value}${logicOp}`);
  });
  
  // Rileva se ci sono OR
  const hasOr = filters.some(f => f.logicOperator === 'OR');
  
  if (hasOr) {
    // Gestione complessa con OR
    const groups = this.groupFiltersByLogic(filters);
    console.log('Gruppi di filtri:', groups);
  } else {
    // Tutti AND - gestione semplice
    console.log('Tutti i filtri in AND');
  }
}
```

### Metodo groupFiltersByLogic

Raggruppa i filtri in base agli operatori logici:

```typescript
private groupFiltersByLogic(filters: FilterRow[]): FilterRow[][] {
  const groups: FilterRow[][] = [];
  let currentGroup: FilterRow[] = [];
  
  filters.forEach((filter, index) => {
    currentGroup.push(filter);
    
    // Chiudi il gruppo quando trovi OR o arrivi alla fine
    if (filter.logicOperator === 'OR' || index === filters.length - 1) {
      groups.push([...currentGroup]);
      currentGroup = [];
    }
  });
  
  return groups;
}
```

**Esempio di output**:
```typescript
// Input:
[
  { field: 'status', operator: 'equals', value: 'active', logicOperator: 'AND' },
  { field: 'age', operator: 'greaterThan', value: '25', logicOperator: 'OR' },
  { field: 'premium', operator: 'equals', value: 'true' }
]

// Output groups:
[
  [
    { field: 'status', operator: 'equals', value: 'active', logicOperator: 'AND' },
    { field: 'age', operator: 'greaterThan', value: '25', logicOperator: 'OR' }
  ],
  [
    { field: 'premium', operator: 'equals', value: 'true' }
  ]
]
```

---

## 🔗 Integrazione con Backend

### Conversione per FilterNodeDto

```typescript
onFiltersApplied(filters: FilterRow[]) {
  const hasOr = filters.some(f => f.logicOperator === 'OR');
  
  if (!hasOr) {
    // Caso semplice: Tutti AND
    const filterNode: FilterNodeDto = {
      type: 'Group',
      logic: 'And',
      children: filters.map(f => ({
        type: 'Condition',
        property: f.field,
        operator: this.mapOperator(f.operator),
        value: f.value
      }))
    };
    
    // Invia al backend
    this.apiService.getData(filterNode);
  } else {
    // Caso complesso: Con OR
    const groups = this.groupFiltersByLogic(filters);
    
    const filterNode: FilterNodeDto = {
      type: 'Group',
      logic: 'Or', // Gruppi in OR tra loro
      children: groups.map(group => ({
        type: 'Group',
        logic: 'And', // Filtri in AND dentro ogni gruppo
        children: group.map(f => ({
          type: 'Condition',
          property: f.field,
          operator: this.mapOperator(f.operator),
          value: f.value
        }))
      }))
    };
    
    // Invia al backend
    this.apiService.getData(filterNode);
  }
}

private mapOperator(op: string): ComparisonOperator {
  const mapping: Record<string, ComparisonOperator> = {
    'equals': ComparisonOperator.Equal,
    'notEquals': ComparisonOperator.NotEqual,
    'contains': ComparisonOperator.Contains,
    'startsWith': ComparisonOperator.StartsWith,
    'endsWith': ComparisonOperator.EndsWith,
    'greaterThan': ComparisonOperator.GreaterThan,
    'lessThan': ComparisonOperator.LessThan,
    'greaterOrEqual': ComparisonOperator.GreaterThanOrEqual,
    'lessOrEqual': ComparisonOperator.LessThanOrEqual
  };
  return mapping[op] || ComparisonOperator.Equal;
}
```

---

## 📊 Scenari d'Uso

### E-commerce

**Query**: "Ordini urgenti da processare"
```
Status = pending
    AND
Priority = high
    OR
Amount > 5000
```
→ Ordini pending ad alta priorità, OPPURE ordini sopra 5000€

---

### CRM

**Query**: "Lead qualificati da contattare"
```
Temperature = hot
    AND
Contacted = false
    OR
Last Activity > 2026-01-15
    AND
Deal Value > 10000
```
→ Lead caldi non contattati, OPPURE attività recenti ad alto valore

---

### HR

**Query**: "Candidati senior o con esperienza specifica"
```
Position ⊃ Senior
    OR
Years Experience ≥ 5
    AND
Skills ⊃ Angular
```
→ Posizioni senior, OPPURE 5+ anni esperienza con Angular

---

## 🎯 Best Practices

### 1. Default a AND
- Il sistema usa AND per default (più restrittivo)
- Usa OR quando vuoi ampliare i risultati

### 2. Raggruppa Logicamente
```
✅ BUONO:
Name ⊃ John
    AND
Age > 25
    OR
Subscription = premium

❌ CONFUSO:
Name ⊃ John
    OR
Age > 25
    AND
Subscription = premium
```

### 3. Testa le Query
- Salva query complesse con nomi descrittivi
- Testa i risultati prima di usarle in produzione
- Documenta la logica per query molto complesse

---

## 📱 UX Features

### 1. Selettore Visibile Solo se Necessario
- Appare solo se il filtro ha campo e valore
- Non appare sull'ultimo filtro (non serve)

### 2. Colori Distintivi
- **AND** → Blu (`text-blue-600`)
- **OR** → Arancione (`text-orange-600`)
- Facile distinguere a colpo d'occhio

### 3. Preview Intelligente
- Le query salvate mostrano gli operatori logici
- Colori anche nella preview
- Facile capire la logica della query

---

## 🔍 Simboli Operatori

| Operatore | Simbolo | Colore |
|-----------|---------|--------|
| AND | ∧ | Blu |
| OR | ∨ | Arancione |
| equals | = | - |
| notEquals | ≠ | - |
| contains | ⊃ | - |
| greaterThan | > | - |
| lessThan | < | - |

---

## ✅ Checklist Completata

- ✅ Interfaccia FilterRow aggiornata con logicOperator
- ✅ UI con selettore AND/OR dopo ogni filtro
- ✅ Colori distintivi (blu per AND, arancione per OR)
- ✅ Preview query salvate mostra operatori logici
- ✅ Metodo groupFiltersByLogic per gestire logica complessa
- ✅ Default a AND (comportamento più comune)
- ✅ Nasconde selettore sull'ultimo filtro
- ✅ Mostra selettore solo se filtro è valido
- ✅ Simboli Unicode per preview (∧ ∨)
- ✅ Documentazione esempi pratici

---

## 🚀 Pronto per l'Uso!

Il sistema è completo e permette agli utenti di:
- ✅ Combinare filtri con AND
- ✅ Combinare filtri con OR
- ✅ Creare query complesse miste
- ✅ Visualizzare chiaramente la logica
- ✅ Salvare e ricaricare query con operatori
- ✅ Integrare facilmente con il backend

**Massima flessibilità per query di ogni complessità!** 🎉
