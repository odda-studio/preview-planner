import { Component, input, model, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RightActionSidenavComponent } from '../right-action-sidenav/right-action-sidenav.component';
import {ComparisonOperator} from '../../../base-crud-admin/models/model/comparisonOperator';
import {LogicalOperator} from '../../../base-crud-admin/models/model/logicalOperator';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: { label: string; value: any }[];
}

export interface FilterRow {
  id: string;
  field: string;
  operator: ComparisonOperator;
  value: any;
}

export interface FilterGroup {
  id: string;
  logic: LogicalOperator,
  filters: FilterRow[];
}

export interface SavedQuery {
  id: string;
  name: string;
  groups: FilterGroup[];
  createdAt: Date;
}

export const getFieldConfig = (fieldKey: string, filters: FilterConfig[]): FilterConfig | undefined => {
  return filters.find(f => f.key === fieldKey);
}

export const getFieldLabel = (fieldKey: string, filters: FilterConfig[]): string => {
  const field = getFieldConfig(fieldKey, filters);
  return field?.label || fieldKey;
}

export const getOperatorLabel = (operator: string) => {
  const labels: Record<string, string> = {
    'equals': '=',
    'notEquals': '≠',
    'contains': '⊃',
    'startsWith': '⊲',
    'endsWith': '⊳',
    'greaterThan': '>',
    'lessThan': '<',
    'greaterOrEqual': '≥',
    'lessOrEqual': '≤'
  };
  return labels[operator] || operator;
}

export const getOperatorHumanLabel = (operator: string): string => {
  const labels: Record<string, string> = {
    'equals': 'è uguale a',
    'notEquals': 'è diverso da',
    'contains': 'contiene',
    'startsWith': 'inizia con',
    'endsWith': 'finisce con',
    'greaterThan': 'è maggiore di',
    'lessThan': 'è minore di',
    'greaterOrEqual': 'è maggiore o uguale a',
    'lessOrEqual': 'è minore o uguale a'
  };
  return labels[operator] || operator;
}


export const getTotalFiltersCount = (filters: FilterGroup[]): number => {
  return filters.reduce((sum, group) =>
    sum + group.filters.filter(f => f.field && f.value).length, 0
  );
}

/**
 * Genera una descrizione human-friendly di un singolo filtro
 */
export const getFilterDescription = (filter: FilterRow, filters: FilterConfig[]): string => {
  const fieldLabel = getFieldLabel(filter.field, filters);
  const operatorLabel = getOperatorHumanLabel(filter.operator);
  const value = filter.value;

  return `${fieldLabel} ${operatorLabel} "${value}"`;
}

/**
 * Genera una descrizione human-friendly di un gruppo di filtri
 */
export const getGroupDescription = (group: FilterGroup, filters: FilterConfig[]): string => {
  if (group.filters.length === 0) return '';
  if (group.filters.length === 1) {
    return getFilterDescription(group.filters[0], filters);
  }

  const logicWord = group.logic === LogicalOperator.And ? 'E' : 'OPPURE';
  const descriptions = group.filters
    .filter(f => f.field && f.value)
    .map(f => getFilterDescription(f, filters));

  return descriptions.join(` ${logicWord} `);
}

/**
 * Genera una descrizione human-friendly completa di tutti i gruppi
 */
export const getFullFilterDescription = (groups: FilterGroup[], filters: FilterConfig[]): string => {
  if (groups.length === 0) return 'Nessun filtro applicato';

  const activeGroups = groups
    .map(g => ({
      ...g,
      filters: g.filters.filter(f => f.field && f.value)
    }))
    .filter(g => g.filters.length > 0);

  if (activeGroups.length === 0) return 'Nessun filtro applicato';
  if (activeGroups.length === 1) {
    return getGroupDescription(activeGroups[0], filters);
  }

  const groupDescriptions = activeGroups.map((group, idx) => {
    const desc = getGroupDescription(group, filters);
    // Se il gruppo ha più filtri, mettiamolo tra parentesi per chiarezza
    return group.filters.length > 1 ? `(${desc})` : desc;
  });

  return groupDescriptions.join(' E ');
}

/**
 * Genera una descrizione human-friendly di una query salvata
 */
export const getSavedQueryDescription = (query: SavedQuery, filters: FilterConfig[]): string  => {
  return getFullFilterDescription(query.groups, filters);
}

@Component({
  selector: 'lib-filter-sidenav',
  standalone: true,
  imports: [CommonModule, FormsModule, RightActionSidenavComponent],
  templateUrl: './filter-sidenav.component.html',
  styleUrls: ['./filter-sidenav.component.scss']
})
export class FilterSidenavComponent {
  title = input<string>('Filtri Avanzati');
  filters = input.required<FilterConfig[]>();
  show = model<boolean>(false);

  filtersApplied = output<FilterGroup[]>();

  // Multiple filter groups
  filterGroups = model<FilterGroup[]>([this.createEmptyFilterGroup()]);

  // Track which groups are expanded
  expandedGroups = signal<Set<string>>(new Set());

  // Saved queries
  queries = model<SavedQuery[]>([]);
  selectedQueryId = model<string | null>(null);

  // Save query UI
  showSaveDialog = signal(false);
  newQueryName = signal('');
  showToast = signal(false);
  toastMessage = signal('');

  // Computed
  hasActiveFilters = computed(() => {
    return this.filterGroups().some(group =>
      group.filters.some(row => row.field && row.value)
    );
  });

  // Operators per tipo di campo
  getOperatorsForField(fieldKey: string): Array<{value: string, label: string}> {
    const field = this.filters().find(f => f.key === fieldKey);
    if (!field) return [];

    switch (field.type) {
      case 'text':
        return [
          { value: 'Eq', label: 'Uguale a' },
          { value: ComparisonOperator.Contains, label: 'Contiene' },
          { value: ComparisonOperator.Contains, label: 'Inizia con' },
          { value: ComparisonOperator.Contains, label: 'Finisce con' },
          { value: 'Ne', label: 'Diverso da' }
        ];
      case 'number':
      case 'date':
        return [
          { value: 'Eq', label: 'Uguale a' },
          { value: 'Gt', label: 'Maggiore di' },
          { value: 'Lt', label: 'Minore di' },
          { value: 'Gte', label: 'Maggiore o uguale' },
          { value: 'Lte', label: 'Minore o uguale' },
          { value: ComparisonOperator.Ne, label: 'Diverso da' }
        ];
      case 'select':
      case 'boolean':
        return [
          { value: 'Eq', label: 'Uguale a' },
          { value: 'Ne', label: 'Diverso da' }
        ];
      default:
        return [{ value: 'Eq', label: 'Uguale a' }];
    }
  }

  createEmptyFilterRow(): FilterRow {
    return {
      id: this.generateId(),
      field: '',
      operator: ComparisonOperator.Eq,
      value: ''
    };
  }

  createEmptyFilterGroup(): FilterGroup {
    return {
      id: this.generateId(),
      logic: LogicalOperator.And,
      filters: [this.createEmptyFilterRow()]
    };
  }

  generateId(): string {
    return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Group management
  addFilterGroup(): void {
    this.filterGroups.update(groups => [...groups, this.createEmptyFilterGroup()]);
  }

  removeFilterGroup(groupId: string): void {
    this.filterGroups.update(groups => groups.filter(g => g.id !== groupId));
    this.expandedGroups.update(set => {
      const newSet = new Set(set);
      newSet.delete(groupId);
      return newSet;
    });
    if (this.filterGroups().length === 0) {
      this.addFilterGroup();
    }
  }

  updateGroupLogic(groupId: string, logic: LogicalOperator): void {
    this.filterGroups.update(groups =>
      groups.map(g => g.id === groupId ? { ...g, logic } : g)
    );
  }

  // Expansion management
  toggleGroupExpansion(groupId: string): void {
    this.expandedGroups.update(set => {
      const newSet = new Set(set);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }

  isGroupExpanded(groupId: string): boolean {
    return this.expandedGroups().has(groupId);
  }

  expandAllGroups(): void {
    const allIds = this.filterGroups().map(g => g.id);
    this.expandedGroups.set(new Set(allIds));
  }

  collapseAllGroups(): void {
    this.expandedGroups.set(new Set());
  }

  // Filter row management within groups
  addFilterRow(groupId: string): void {
    this.filterGroups.update(groups =>
      groups.map(g => g.id === groupId
        ? { ...g, filters: [...g.filters, this.createEmptyFilterRow()] }
        : g
      )
    );
  }

  removeFilterRow(groupId: string, filterId: string): void {
    this.filterGroups.update(groups =>
      groups.map(g => {
        if (g.id !== groupId) return g;
        const newFilters = g.filters.filter(f => f.id !== filterId);
        return { ...g, filters: newFilters.length > 0 ? newFilters : [this.createEmptyFilterRow()] };
      })
    );
  }

  updateFilterRow(groupId: string, filterId: string, field: keyof FilterRow, value: any): void {
    this.filterGroups.update(groups =>
      groups.map(g => g.id === groupId
        ? { ...g, filters: g.filters.map(f => f.id === filterId ? { ...f, [field]: value } : f) }
        : g
      )
    );
  }

  applyFilters(): void {
    const activeGroups = this.filterGroups()
      .map(group => ({
        ...group,
        filters: group.filters.filter(row => row.field && row.value)
      }))
      .filter(group => group.filters.length > 0);

    this.filtersApplied.emit(activeGroups);
    this.show.set(false);
  }

  resetFilters(): void {
    this.filterGroups.set([this.createEmptyFilterGroup()]);
    this.selectedQueryId.set(null);
    this.filtersApplied.emit([]);
  }

  // Saved Queries Management
  openSaveDialog(): void {
    this.newQueryName.set('');
    this.showSaveDialog.set(true);
  }

  saveQuery(): void {
    const name = this.newQueryName().trim();
    if (!name) return;

    const activeGroups = this.filterGroups()
      .map(group => ({
        ...group,
        filters: group.filters.filter(row => row.field && row.value)
      }))
      .filter(group => group.filters.length > 0);

    if (activeGroups.length === 0) return;

    const newQuery: SavedQuery = {
      id: this.generateId(),
      name,
      groups: activeGroups,
      createdAt: new Date()
    };

    this.queries.update(queries => [...queries, newQuery]);
    this.showSaveDialog.set(false);
    this.newQueryName.set('');
    this.showToastMessage(`Query "${name}" salvata con successo`);
  }

  loadQuery(queryId: string): void {
    const query = this.queries().find(q => q.id === queryId);
    if (!query) return;

    this.filterGroups.set(JSON.parse(JSON.stringify(query.groups))); // Deep copy
    this.selectedQueryId.set(queryId);

    // Espandi tutti i gruppi caricati
    const groupIds = query.groups.map(g => g.id);
    this.expandedGroups.set(new Set(groupIds));

    this.showToastMessage(`Query "${query.name}" caricata`);
  }

  deleteQuery(queryId: string, event: Event): void {
    event.stopPropagation();
    const query = this.queries().find(q => q.id === queryId);
    if (!query) return;

    this.queries.update(queries => queries.filter(q => q.id !== queryId));
    if (this.selectedQueryId() === queryId) {
      this.selectedQueryId.set(null);
    }
    this.showToastMessage(`Query "${query.name}" eliminata`);
  }

  private showToastMessage(message: string): void {
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }


  getActiveFiltersCount(group: FilterGroup): number {
    return group.filters.filter(f => f.field && f.value).length;
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;

    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  protected readonly LogicalOperator = LogicalOperator;

  getFullFilterDescription(filterGroups: FilterGroup[]) {
    return getFullFilterDescription(filterGroups, this.filters());
  }

  getFieldConfig(field: string) {
    return getFieldConfig(field, this.filters());
  }

  getSavedQueryDescription(query: SavedQuery) {
    return getSavedQueryDescription(query, this.filters());
  }
}
