# 📚 Guida Completa: Query Salvate per Filtri

## 🎯 Funzionalità Implementata

Il sistema ora supporta completamente il **salvataggio e caricamento di query con nome** che possono essere riutilizzate in futuro.

---

## 💡 Esempi Pratici

### Esempio 1: "Solo utenti attivi"

**Come creare:**
1. Clicca su "Filtri avanzati"
2. Imposta:
   - **Campo**: Status
   - **Operatore**: Uguale a
   - **Valore**: active
3. Clicca su "Salva come Query"
4. Inserisci nome: **"Solo utenti attivi"**
5. Clicca "Salva"

**Risultato salvato:**
```typescript
{
  id: "filter_1737543210_abc123",
  name: "Solo utenti attivi",
  filters: [
    { field: "status", operator: "equals", value: "active" }
  ],
  createdAt: new Date("2026-01-22")
}
```

---

### Esempio 2: "Utenti registrati da una certa data"

**Come creare:**
1. Clicca su "Filtri avanzati"
2. Imposta:
   - **Campo**: Data Creazione
   - **Operatore**: Maggiore o uguale
   - **Valore**: 2026-01-01
3. Clicca su "Salva come Query"
4. Inserisci nome: **"Utenti registrati dal 2026"**
5. Clicca "Salva"

**Risultato salvato:**
```typescript
{
  id: "filter_1737543211_def456",
  name: "Utenti registrati dal 2026",
  filters: [
    { field: "createdAt", operator: "greaterOrEqual", value: "2026-01-01" }
  ],
  createdAt: new Date("2026-01-22")
}
```

---

### Esempio 3: Query Complessa - "Utenti Premium Attivi"

**Come creare:**
1. Clicca su "Filtri avanzati"
2. Imposta primo filtro:
   - **Campo**: Status
   - **Operatore**: Uguale a
   - **Valore**: active
3. Clicca "Aggiungi Filtro"
4. Imposta secondo filtro:
   - **Campo**: Subscription
   - **Operatore**: Uguale a
   - **Valore**: premium
5. Clicca "Aggiungi Filtro"
6. Imposta terzo filtro:
   - **Campo**: Verified
   - **Operatore**: Uguale a
   - **Valore**: true
7. Clicca su "Salva come Query"
8. Inserisci nome: **"Utenti Premium Attivi Verificati"**
9. Clicca "Salva"

**Risultato salvato:**
```typescript
{
  id: "filter_1737543212_ghi789",
  name: "Utenti Premium Attivi Verificati",
  filters: [
    { field: "status", operator: "equals", value: "active" },
    { field: "subscription", operator: "equals", value: "premium" },
    { field: "verified", operator: "equals", value: "true" }
  ],
  createdAt: new Date("2026-01-22")
}
```

---

## 🔄 Come Riutilizzare Query Salvate

### Metodo 1: Click Diretto
1. Apri "Filtri avanzati"
2. Nella sezione "Query Salvate" in alto, clicca sulla query desiderata
3. I filtri vengono automaticamente caricati
4. Clicca "Applica Filtri"

### Metodo 2: Modifica Query Esistente
1. Apri "Filtri avanzati"
2. Clicca su una query salvata per caricarla
3. Modifica i valori dei filtri secondo necessità
4. Clicca "Applica Filtri" (senza salvare)
5. Oppure clicca "Salva come Query" per creare una variante

---

## 🎨 UI delle Query Salvate

### Visualizzazione Lista
```
┌─────────────────────────────────────────────┐
│ Query Salvate                            [3] │
├─────────────────────────────────────────────┤
│ 🔖 Solo utenti attivi              [X]      │
│    1 filtro · 2h fa                         │
│    Status = active                          │ ← Preview al hover
├─────────────────────────────────────────────┤
│ 🔖 Utenti registrati dal 2026      [X]      │
│    1 filtro · 1g fa                         │
│    Data Creazione ≥ 2026-01-01              │
├─────────────────────────────────────────────┤
│ 🔖 Utenti Premium Attivi           [X]      │
│    3 filtri · 3g fa                         │
│    Status = active                          │
│    Subscription = premium                   │
│    Verified = true                          │
└─────────────────────────────────────────────┘
```

### Caratteristiche Visive
- ✅ **Evidenziazione**: Query selezionata con bordo blu
- ✅ **Preview**: Al passaggio del mouse si vedono tutti i filtri
- ✅ **Data relativa**: "2h fa", "1g fa", oppure data completa
- ✅ **Contatore filtri**: Mostra quanti filtri contiene ogni query
- ✅ **Badge totale**: Numero totale di query salvate
- ✅ **Icona eliminazione**: Appare solo al hover

---

## 📊 Esempi Reali per Diversi Scenari

### E-commerce
```typescript
// "Ordini alto valore da processare"
{
  name: "Ordini alto valore da processare",
  filters: [
    { field: "status", operator: "equals", value: "pending" },
    { field: "amount", operator: "greaterOrEqual", value: "1000" },
    { field: "priority", operator: "equals", value: "high" }
  ]
}

// "Prodotti esauriti popolari"
{
  name: "Prodotti esauriti popolari",
  filters: [
    { field: "stock", operator: "lessOrEqual", value: "5" },
    { field: "category", operator: "equals", value: "electronics" },
    { field: "rating", operator: "greaterOrEqual", value: "4.5" }
  ]
}
```

### CRM
```typescript
// "Lead caldi ultimi 7 giorni"
{
  name: "Lead caldi ultimi 7 giorni",
  filters: [
    { field: "temperature", operator: "equals", value: "hot" },
    { field: "createdAt", operator: "greaterOrEqual", value: "2026-01-15" },
    { field: "contacted", operator: "equals", value: "false" }
  ]
}

// "Clienti VIP inattivi"
{
  name: "Clienti VIP inattivi",
  filters: [
    { field: "tier", operator: "equals", value: "vip" },
    { field: "lastActivity", operator: "lessThan", value: "2025-12-01" }
  ]
}
```

### HR/Risorse Umane
```typescript
// "Candidati qualificati per posizione senior"
{
  name: "Candidati qualificati per posizione senior",
  filters: [
    { field: "experience", operator: "greaterOrEqual", value: "5" },
    { field: "position", operator: "contains", value: "Senior" },
    { field: "status", operator: "equals", value: "interview" }
  ]
}
```

---

## 🛠️ Gestione Query

### Eliminare una Query
1. Passa il mouse sulla query da eliminare
2. Clicca sull'icona cestino rossa [X]
3. La query viene rimossa immediatamente
4. Appare notifica: "Query [nome] eliminata"

### Rinominare una Query
Attualmente non supportato direttamente, ma puoi:
1. Caricare la query esistente
2. Eliminarla
3. Salvarla nuovamente con il nuovo nome

### Duplicare una Query
1. Caricare la query da duplicare
2. Modificare i valori se necessario
3. Clicca "Salva come Query"
4. Inserisci un nuovo nome (es: "Copia di [nome originale]")

---

## 💾 Persistenza Dati

### Dove vengono salvate?
Le query sono salvate in **localStorage** del browser con chiave:
```
filter_saved_queries
```

### Formato di storage
```json
[
  {
    "id": "filter_1737543210_abc123",
    "name": "Solo utenti attivi",
    "filters": [
      {
        "id": "filter_1737543210_xyz",
        "field": "status",
        "operator": "equals",
        "value": "active"
      }
    ],
    "createdAt": "2026-01-22T10:30:00.000Z"
  }
]
```

### Limitazioni localStorage
- **Spazio**: ~5-10MB per dominio
- **Ambito**: Solo per il browser corrente
- **Condivisione**: Non sincronizzate tra dispositivi

### Per produzione: Salvare su Backend
```typescript
// Invece di localStorage, usa API
private async saveSavedQueries(queries: SavedQuery[]): Promise<void> {
  await this.apiService.saveUserFilters(queries).toPromise();
}

private async loadSavedQueries(): Promise<SavedQuery[]> {
  return await this.apiService.getUserFilters().toPromise();
}
```

---

## 🎯 Best Practices

### Naming Conventions
✅ **Buoni nomi:**
- "Utenti attivi ultimi 30 giorni"
- "Ordini pending alto valore"
- "Prodotti categoria X disponibili"

❌ **Nomi da evitare:**
- "Query 1"
- "Test"
- "aaa"

### Organizzazione
- Usa nomi descrittivi e specifici
- Includi il contesto temporale se rilevante
- Elimina query obsolete regolarmente
- Mantieni max 10-15 query per non confondere

### Performance
- Ogni query salvata occupa ~200-500 bytes
- 50 query = ~25KB (trascurabile)
- Il componente gestisce efficientemente fino a 100+ query

---

## 📱 Notifiche Toast

Il sistema mostra notifiche per:

✅ **Query salvata**: "Query 'Nome' salvata con successo"
✅ **Query caricata**: "Query 'Nome' caricata"
✅ **Query eliminata**: "Query 'Nome' eliminata"

Le notifiche:
- Appaiono in basso a destra
- Durano 3 secondi
- Hanno animazione slide-up
- Non bloccano l'interazione

---

## 🚀 Workflow Completo

```
1. User clicca "Filtri avanzati"
   ↓
2. Sceglie tra:
   a) Carica query salvata
   b) Crea nuovi filtri
   ↓
3. Configura filtri:
   - Campo
   - Operatore  
   - Valore
   ↓
4. Aggiunge più righe se necessario
   ↓
5. Due opzioni:
   a) Applica filtri (temporaneo)
   b) Salva come query (permanente)
   ↓
6. Se salva:
   - Inserisce nome descrittivo
   - Conferma
   - Query appare in lista
   ↓
7. In futuro:
   - Click sulla query
   - Filtri caricati automaticamente
   - Applica
```

---

## 🎨 Simboli Operatori

Per migliore leggibilità nella preview:

| Operatore | Simbolo | Esempio |
|-----------|---------|---------|
| equals | = | Nome = "John" |
| notEquals | ≠ | Status ≠ "inactive" |
| contains | ⊃ | Email ⊃ "@gmail" |
| startsWith | ⊲ | Nome ⊲ "A" |
| endsWith | ⊳ | File ⊳ ".pdf" |
| greaterThan | > | Età > 18 |
| lessThan | < | Prezzo < 100 |
| greaterOrEqual | ≥ | Score ≥ 80 |
| lessOrEqual | ≤ | Stock ≤ 10 |

---

## ✅ Conclusione

Il sistema è completamente funzionale per:
- ✅ Salvare query con nomi descrittivi
- ✅ Gestire multiple configurazioni
- ✅ Selezionare query dalla lista
- ✅ Visualizzare preview dei filtri
- ✅ Eliminare query obsolete
- ✅ Feedback visivo con notifiche

**Pronto per l'uso in produzione!** 🎉
