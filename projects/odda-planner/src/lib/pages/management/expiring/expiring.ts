import { Component, computed, inject, signal } from '@angular/core';
import { UserService } from '../../../api/api/user.service'
import { rxResource } from '@angular/core/rxjs-interop';
import { ActiveUserDataModel, ExpiringUserDataModel, FreeUserDataModel } from '../../../api';

type ExpiringTab = 'active' | 'expiring' | 'expired';

@Component({
  selector: 'app-expiring',
  imports: [],
  templateUrl: './expiring.html',
  styleUrl: './expiring.scss',
})
export class Expiring {

  userService = inject(UserService);

  activeTab = signal<ExpiringTab>('expiring');

  expiring = rxResource({
    stream: () => {
      return this.userService.getExpiringUsers();
    }
  })

  expired = rxResource({
    stream: () => {
      return this.userService.getFreeUsers()
    }
  })

  active = rxResource({
    stream: () => {
      return this.userService.getActiveUsers();
    }
  })

  expiringItems = computed(() => this.expiring.value() ?? []);
  expiredItems = computed(() => this.expired.value() ?? []);
  activeItems = computed(() => this.active.value() ?? []);

  setTab(tab: ExpiringTab) {
    this.activeTab.set(tab);
  }

  formatDate(date?: string | null): string {
    if (!date) return '–';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return '–';
    return parsed.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  daysLabel(days?: number | null): string {
    if (days == null) return '–';
    if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'giorno' : 'giorni'} fa`;
    if (days === 0) return 'Oggi';
    return `${days} ${days === 1 ? 'giorno' : 'giorni'}`;
  }

  expirationUrgencyClass(days?: number | null): string {
    if (days == null) return 'exp-badge--neutral';
    if (days <= 7) return 'exp-badge--danger';
    if (days <= 15) return 'exp-badge--warning';
    return 'exp-badge--ok';
  }

  inactivityUrgencyClass(days?: number | null): string {
    if (days == null) return 'exp-badge--neutral';
    if (days >= 60) return 'exp-badge--danger';
    if (days >= 30) return 'exp-badge--warning';
    return 'exp-badge--ok';
  }

  initials(fullName?: string | null): string {
    if (!fullName) return '?';
    return fullName.trim().charAt(0).toUpperCase();
  }

  trackByUserId(index: number, item: ExpiringUserDataModel | FreeUserDataModel | ActiveUserDataModel): number {
    return item.userId ?? index;
  }
}
