# 🎯 Gruppi di Filtri Collapsible

## ✅ Implementato

Ho reso i **gruppi di filtri collapsible/espandibili** per una migliore organizzazione visiva e gestione dello spazio, specialmente con molti gruppi e filtri!

---

## 🆕 Funzionalità Aggiunta

### 1. **Header Cliccabile**
Ogni gruppo ha un header che può essere cliccato per espandere/collassare il contenuto.

### 2. **Icona Chevron Animata**
- **→** (freccia destra) = Gruppo collassato
- **↓** (freccia giù) = Gruppo espanso
- Animazione smooth di rotazione

### 3. **Contatore Filtri Attivi**
Nell'header di ogni gruppo si vede quanti filtri sono attivi:
```
Gruppo 1 [AND] [OR] (3 filtri attivi)
```

### 4. **Controlli Globali**
- **"Espandi tutti"** - Apre tutti i gruppi
- **"Collassa tutti"** - Chiude tutti i gruppi

### 5. **Auto-Espansione**
- Nuovo gruppo → Espanso automaticamente
- Query caricata → Tutti i gruppi espansi automaticamente

---

## 🎨 UI Migliorata

### Gruppo Collassato
```
┌─────────────────────────────────────────────────┐
│ → Gruppo 1 [AND] [OR] (2 filtri attivi)    [X] │ ← Click per espandere
└─────────────────────────────────────────────────┘
```

### Gruppo Espanso
```
┌─────────────────────────────────────────────────┐
│ ↓ Gruppo 1 [AND] [OR] (2 filtri attivi)    [X] │ ← Click per collassare
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Campo:     [Status      ▼]                  │ │
│ │ Operatore: [Uguale a    ▼]                  │ │
│ │ Valore:    [active       ]              [X] │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Campo:     [Age         ▼]                  │ │
│ │ Operatore: [Maggiore di ▼]                  │ │
│ │ Valore:    [25          ]               [X] │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [+ Aggiungi Filtro]                             │
└─────────────────────────────────────────────────┘
```

---

## 💡 Vantaggi

### 1. **Risparmio Spazio**
Con molti gruppi e filtri, collassare quelli non necessari libera spazio visivo.

**Prima:**
```
┌──────────┐
│ Gruppo 1 │
│ Filtro 1 │
│ Filtro 2 │
│ Filtro 3 │
│          │
│ Gruppo 2 │
│ Filtro 1 │
│ Filtro 2 │
│          │
│ Gruppo 3 │
│ Filtro 1 │
│ Filtro 2 │
│ Filtro 3 │
│ Filtro 4 │
└──────────┘
```
❌ Troppo scroll!

**Dopo:**
```
┌──────────────────────────────┐
│ → Gruppo 1 (3 filtri attivi) │
│ → Gruppo 2 (2 filtri attivi) │
│ ↓ Gruppo 3 (4 filtri attivi) │ ← Solo questo espanso
│   ├─ Filtro 1                │
│   ├─ Filtro 2                │
│   ├─ Filtro 3                │
│   └─ Filtro 4                │
└──────────────────────────────┘
```
✅ Molto più gestibile!

### 2. **Focus sul Gruppo Attivo**
Puoi lavorare su un gruppo alla volta senza distrazioni.

### 3. **Overview Rapida**
Con gruppi collassati vedi subito:
- Quanti gruppi hai
- Quanti filtri attivi in ogni gruppo
- Logica (AND/OR) di ogni gruppo

### 4. **Performance**
Con gruppi collassati, meno DOM rendering = UI più veloce.

---

## 🔧 Funzionalità Tecniche

### Stato dell'Espansione
```typescript
// Signal che traccia quali gruppi sono espansi
expandedGroups = signal<Set<string>>(new Set());
```

### Metodi Aggiunti

#### `toggleGroupExpansion(groupId: string)`
Alterna lo stato espanso/collassato di un gruppo.

#### `isGroupExpanded(groupId: string): boolean`
Verifica se un gruppo è espanso.

#### `expandAllGroups()`
Espande tutti i gruppi contemporaneamente.

#### `collapseAllGroups()`
Collassa tutti i gruppi contemporaneamente.

---

## 🎯 Comportamenti Automatici

### 1. Nuovo Gruppo → Auto Espanso
```typescript
addFilterGroup() {
  const newGroup = this.createEmptyFilterGroup();
  this.filterGroups.update(groups => [...groups, newGroup]);
  // ✅ Espande automaticamente
  this.expandedGroups.update(set => new Set(set).add(newGroup.id));
}
```

### 2. Query Caricata → Tutti Espansi
```typescript
loadQuery(queryId: string) {
  // ...carica query...
  // ✅ Espande tutti i gruppi caricati
  const groupIds = query.groups.map(g => g.id);
  this.expandedGroups.set(new Set(groupIds));
}
```

### 3. Gruppo Rimosso → Rimosso da Set Espansi
```typescript
removeFilterGroup(groupId: string) {
  // ...rimuove gruppo...
  // ✅ Pulisce lo stato di espansione
  this.expandedGroups.update(set => {
    const newSet = new Set(set);
    newSet.delete(groupId);
    return newSet;
  });
}
```

---

## 🎨 Interazione Utente

### Click sull'Header
- Click su qualsiasi punto dell'header → Toggle espansione
- **Eccezione**: Click sui pulsanti AND/OR/X → Non toglia espansione

### Contatore Dinamico
Il contatore mostra solo i filtri **attivi** (con campo e valore):
```
(0 filtri attivi)  ← Nessun filtro configurato
(1 filtro attivo)  ← Singolare
(3 filtri attivi)  ← Plurale
```

### Animazioni
- **Chevron**: Rotazione smooth da → a ↓
- **Hover header**: Background grigio chiaro
- **Hover gruppo**: Ombra più pronunciata

---

## 📊 Esempi d'Uso

### Scenario 1: Query Semplice
**1 gruppo, 2 filtri**
```
✅ Gruppo espanso di default
✅ Facile da configurare
✅ Nessuna necessità di collassare
```

### Scenario 2: Query Complessa
**5 gruppi, 15 filtri totali**

**Workflow:**
1. Collassa tutti i gruppi → Overview rapida
2. Espandi Gruppo 3 → Modifica filtri
3. Collassa Gruppo 3
4. Espandi Gruppo 5 → Modifica filtri
5. Espandi tutti → Verifica finale

**Beneficio:**
✅ Lavori su un gruppo alla volta
✅ Meno scroll
✅ Più focus

### Scenario 3: Debug Query Salvata
**Carica query "Clienti VIP Attivi"**
```
✅ Tutti i gruppi si espandono automaticamente
✅ Vedi immediatamente tutta la configurazione
✅ Puoi collassare gruppi già verificati
```

---

## 🎨 Stile e Design

### Header Gruppo
```css
/* Cursore pointer per indicare cliccabilità */
cursor: pointer;

/* Hover effect */
hover:bg-gray-50

/* Transizioni smooth */
transition: all 0.2s ease
```

### Chevron Icon
```css
/* Rotazione animata */
.rotate-90 {
  transform: rotate(90deg);
}

svg {
  transition: transform 0.2s ease;
}
```

### Gruppo Container
```css
/* Bordo colorato per logica AND/OR */
border-blue-400   /* AND */
border-orange-400 /* OR */

/* Ombra al hover */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)
```

---

## 📱 Controlli Rapidi

### Barra Superiore
```
┌─────────────────────────────────────────────────┐
│ Gruppi di Filtri                                │
│ [Espandi tutti] | [Collassa tutti] | [+ Nuovo] │
└─────────────────────────────────────────────────┘
```

**Quando appare "Espandi tutti | Collassa tutti"?**
- Solo se ci sono 2+ gruppi
- Altrimenti solo il pulsante "Nuovo Gruppo"

---

## 🚀 UX Migliorata

### Prima (Senza Collapse)
```
❌ Tutto sempre espanso
❌ Molto scroll necessario
❌ Difficile trovare un gruppo specifico
❌ UI affollata con molti gruppi
```

### Dopo (Con Collapse)
```
✅ Espandi solo quello che serve
✅ Overview compatta
✅ Facile navigazione tra gruppi
✅ UI pulita anche con 10+ gruppi
```

---

## 💾 Persistenza Stato

**Nota**: Lo stato espanso/collassato **NON è persistente**.

Quando chiudi e riapri la sidenav:
- ✅ Filtri vengono mantenuti
- ❌ Stato espansione viene resettato

**Perché?**
- Comportamento più prevedibile
- Nessuna sorpresa per l'utente
- Ogni apertura = fresh start

---

## 🎯 Best Practices

### Per Utenti con Pochi Gruppi (1-3)
- Tieni tutto espanso
- I controlli collapse non sono necessari

### Per Utenti con Molti Gruppi (5+)
1. **Configura un gruppo alla volta**
   - Collassa tutti
   - Espandi quello su cui lavori
   - Collassa quando finito

2. **Verifica finale**
   - Espandi tutti
   - Controlla che tutto sia corretto
   - Applica filtri

3. **Usa contatori**
   - Verifica quanti filtri attivi per gruppo
   - Gruppo con 0 filtri = probabilmente da rimuovere

---

## ✅ Checklist Implementazione

- ✅ Signal `expandedGroups` per tracciare stato
- ✅ Metodo `toggleGroupExpansion()`
- ✅ Metodo `isGroupExpanded()`
- ✅ Metodo `expandAllGroups()`
- ✅ Metodo `collapseAllGroups()`
- ✅ Header cliccabile
- ✅ Icona chevron animata
- ✅ Contatore filtri attivi
- ✅ Auto-espansione nuovo gruppo
- ✅ Auto-espansione query caricata
- ✅ Stop propagation per pulsanti AND/OR/X
- ✅ Animazioni CSS smooth
- ✅ Hover effects
- ✅ Controlli "Espandi/Collassa tutti"

---

## 🎉 Risultato Finale

**I gruppi di filtri sono ora:**
- ✅ **Collapsible** - Click per espandere/collassare
- ✅ **Informativi** - Mostra contatore filtri attivi
- ✅ **Animati** - Transizioni smooth e piacevoli
- ✅ **Gestibili** - Controlli globali disponibili
- ✅ **Intelligenti** - Auto-espansione quando necessario

**Perfetto per gestire query complesse con molti gruppi!** 🚀
