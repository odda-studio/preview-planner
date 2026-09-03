import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ComparisonOperator, CvModelData, CvService, SortDirection } from '../../../api';
import { debouncedSignal, watchQueryParam, wrapResource } from '../../../signals';
import { FormsModule } from "@angular/forms";
import { HttpContext } from '@angular/common/http';
import { PREVENT_SPINNER } from 'core-library';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface CvGroup {
  talentId: string | null | undefined;
  name: string | null | undefined;
  email: string | null | undefined;
  phone: string | null | undefined;
  imageUrl: string | null | undefined;
  versions: CvModelData[];
  pdfUrl: string | null | undefined;
}

@Component({
  selector: 'lib-cv-overview',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cv-overview.html',
  styleUrl: './cv-overview.scss',
})
export class CvOverview {

  readonly pageSize = 20;
  private readonly snackBar = inject(MatSnackBar);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  search = watchQueryParam<string>('search', x => x ?? '');
  debouncedSearch = debouncedSignal(this.search, 500);
  page = watchQueryParam<number>('page');

  loadedItems = signal<CvModelData[]>([]);
  totalCount = signal<number | null | undefined>(null);

  private readonly cvService = inject(CvService);

  cvs = rxResource({
    params: () => ({ search: this.debouncedSearch(), page: this.page() }),
    stream: (p) => {
      console.log(p.params)
      // if (p.params.page) {
        return this.cvService.cvsSearchPost({
          page: 1,
          pageSize: (p.params.page || this.route.snapshot.queryParams['page'] || 1) * this.pageSize, paginatedRequestDto: {
            sorting: [{
              sortBy: 'externalDataCandidateName',
              direction: SortDirection.Ascending,
            }],
            filters: {
              type: 'Group',
              logic: 'Or',
              children: [
                {
                  type: 'Condition',
                  property: 'externalDataCandidateName',
                  operator: ComparisonOperator.Contains,
                  value: p.params.search ?? ''
                },
                {
                  type: 'Condition',
                  property: 'externalDataCandidateEmail',
                  operator: ComparisonOperator.Contains,
                  value: p.params.search ?? ''
                }
              ]
            }
          }
        }, 'body', undefined, { context: new HttpContext().set(PREVENT_SPINNER, true) });
      // }
      // return of(null);
    }
  });

  allCsv = wrapResource(this.cvs);

  constructor() {
    // reset page e items al cambio ricerca
    effect(() => {
      this.debouncedSearch();
      this.router.navigate([], { queryParams: { page: this.page() , search: this.search() }, queryParamsHandling: 'merge' });
    });

    // accumula items ad ogni pagina caricata
    effect(() => {
      const data = this.cvs.value();
      if (data == null) return;
      const page = this.page();
      untracked(() => {
        if (page === 1) {
          this.loadedItems.set(data.items ?? []);
        } else {
          this.loadedItems.update(prev => [...prev, ...(data.items ?? [])]);
        }
        this.totalCount.set(data.totalCount);
      });
    });
  }

  hasMore = computed(() => this.loadedItems().length < (this.totalCount() ?? 0));

  loadMore() {
    this.router.navigate([], { queryParams: { page: this.page() ? +((this.page() || 1)) + 1 : 2, search: this.search() }, queryParamsHandling: 'merge' });
  }

  clearSearch() {
    this.search.set('');
  }

  async copyPdfUrl(pdfUrl?: string | null) {
    if (!pdfUrl) return;
    this.snackBar.open('URL del PDF copiato negli appunti', 'Chiudi', { duration: 3000, panelClass: ['success-snack'] });

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(pdfUrl);
      return;
    }



    // Fallback per browser senza Clipboard API.
    const textarea = document.createElement('textarea');
    textarea.value = pdfUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  groupedCvs = computed<CvGroup[]>(() => {
    const items = this.allCsv()?.items ?? [];
    const map = new Map<string, CvGroup>();
    for (const cv of items) {
      const key = cv.externalDataCandidateRefId ?? `__unknown__${cv.id}`;
      if (!map.has(key)) {
        map.set(key, {
          talentId: cv.externalDataCandidateRefId,
          name: cv.externalDataCandidateName,
          email: cv.externalDataCandidateEmail,
          phone: cv.externalDataCandidatePhone,
          pdfUrl: cv.cvApiLinkUrl,
          imageUrl: cv.externalDataCandidateImageUrl,
          versions: [],
        });
      }
      map.get(key)!.versions.push(cv);
    }
    for (const group of map.values()) {
      group.versions.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    }
    return Array.from(map.values());
  });

  imgErrors = new Set<string>();

  onImgError(talentId?: string | null) {
    if (talentId != null) this.imgErrors.add(talentId);
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'Pending': return 'In attesa';
      case 'Processing': return 'In elaborazione';
      case 'Completed': return 'Completato';
      case 'Failed': return 'Fallito';
      default: return status ?? '–';
    }
  }
}
