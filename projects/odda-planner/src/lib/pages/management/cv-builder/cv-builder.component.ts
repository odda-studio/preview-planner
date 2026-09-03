import { Component, signal, computed, effect, inject, untracked, viewChild, ChangeDetectorRef, linkedSignal, HostListener } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { watchParam, watchQueryParam } from '../../../signals';
import { CvService, CvHighlight, CvOtherSkill, CvExperience, CvCustomSection, CvCustomSectionItem, TrainingAndCertificateItem, LanguageItem, TrainingType, CvChangeAddRequest, Cv, AiCvChangeSuggestion } from '../../../api/index';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, map, of, tap, throwError } from 'rxjs';
import { PdfViewerComponent } from '../../../components/pdf-viewer/pdf-viewer.component';
import { StateService } from '../../../services/state.service';
import { CvPreviewer, CvPreviewItem } from "../../../components/cv-previewer/cv-previewer";
import { LocalStorageService } from '../../../services/localstorage.service';
import { Router, RouterLink } from '@angular/router';
import { CvBuilderService } from './cv-builder.service';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { PREVENT_SPINNER } from 'core-library';
import { PdfSrcType } from 'ngx-extended-pdf-viewer';
import { AuthenticationService } from '../../../services/authentication.service';
// ── Clone dialog ──────────────────────────────────────────────────────────────
@Component({
  selector: 'lib-cv-clone-dialog',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
  template: `
    <h2 mat-dialog-title style="margin:0 0 4px">Clona versione</h2>
    <mat-dialog-content style="padding-top:8px">
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Nome della nuova versione</mat-label>
        <input matInput [(ngModel)]="name" placeholder="Es. Versione marketing"
               (keydown.enter)="confirm()" cdkFocusInitial />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding-bottom:12px">
      <button mat-button mat-dialog-close>Annulla</button>
      <button mat-flat-button color="primary" [disabled]="!name.trim()" (click)="confirm()">Clona</button>
    </mat-dialog-actions>
  `,
})
export class CvCloneDialogComponent {
  name = '';
  private readonly dialogRef = inject(MatDialogRef<CvCloneDialogComponent>);
  confirm() { if (this.name.trim()) this.dialogRef.close(this.name.trim()); }
}

function getStringDiff(oldValue: string, newValue: string) {
  // Trova prefisso comune
  let start = 0;

  while (
    start < oldValue.length &&
    start < newValue.length &&
    oldValue[start] === newValue[start]
  ) {
    start++;
  }

  // Trova suffisso comune
  let oldEnd = oldValue.length - 1;
  let newEnd = newValue.length - 1;

  while (
    oldEnd >= start &&
    newEnd >= start &&
    oldValue[oldEnd] === newValue[newEnd]
  ) {
    oldEnd--;
    newEnd--;
  }

  return {
    added: newValue.slice(start, newEnd + 1),
    removed: oldValue.slice(start, oldEnd + 1),
    index: start
  };
}

interface CvChange {
  oldValue: string;
  newValue: string;
  identifier: string;
  section: string;
  undone: boolean;
  timestamp: string;
  user: { fullName: string; imageUrl?: string | null } | null;
  deleted?: boolean;
  order?: number;
  fromAi?: boolean;
}

@Component({
  selector: 'lib-cv-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PdfViewerComponent, CdkDropList, CdkDrag, CdkDragHandle, CvPreviewer, UpperCasePipe, FormsModule, RouterLink],
  templateUrl: './cv-builder.component.html',
  styleUrl: './cv-builder.component.scss',
})
export class CvBuilderComponent {


  previewer = viewChild(CvPreviewer);
  id = watchParam('id', String);
  version = watchQueryParam('version', Number);
  currentVersion = linkedSignal(this.version);

  private fb = inject(FormBuilder);
  private readonly cvService = inject(CvService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly stateService = inject(StateService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly changeDetection = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly cvBuilderService = inject(CvBuilderService);
  private readonly httpClient = inject(HttpClient);
  private readonly authService = inject(AuthenticationService)

  shouldSync = false;
  // ── Change tracking ────────────────────────────────────────────────────────
  changes = signal<CvChange[]>([]);

  // ── AI suggestions ─────────────────────────────────────────────────────────
  aiSuggestionsOpen = signal(false);

  toggleAiSuggestions() {
    this.aiSuggestionsOpen.update(v => !v);
  }

  aiSuggestions = computed<(AiCvChangeSuggestion & { title: string | undefined })[]>(() =>
    (this.currentCv()?.cv?.aiCvChangeSuggestions ?? []).filter(x => {
      if (x.section === 'highlight.years' && !x.oldValue) {
        return false;
      }
      return true;
    }).map(s => {
      const x = this.getReference(s.section!, s.identifier!);
      return { ...s, title: x ? (x as any).skill || (x as any).name || (x as any).company || (x as any).title : undefined }
    })
  );

  aiSuggestionsMap = computed<Map<string, (AiCvChangeSuggestion)>>(() => {
    const map = new Map<string, AiCvChangeSuggestion>();
    for (const s of this.aiSuggestions()) {
      const x = this.getReference(s.section!, s.identifier!);
      if (s.section && s.identifier) {
        map.set(`${s.section}:${s.identifier}`, { ...s });
      }
    }
    return map;
  });

  /** Returns the AI suggestion newValue for a given section+identifier, if present */
  aiSuggestedNewValue(section: string, identifier: string): string | null {
    return this.aiSuggestionsMap().get(`${section}:${identifier}`)?.newValue ?? null;
  }

  /** True if the field has an AI suggestion active:
   *  - confirmation (oldValue === newValue): always active
   *  - change suggestion: active only when current value matches the suggested newValue */
  isAiSuggestedValue(section: string, identifier: string, currentValue: string | number | null): boolean {
    const suggestion = this.aiSuggestionsMap().get(`${section}:${identifier}`);
    if (!suggestion) return false;
    if (suggestion.oldValue === suggestion.newValue) return true;
    return suggestion.newValue != null && String(currentValue ?? '') === String(suggestion.newValue);
  }

  applyAiSuggestion(s: AiCvChangeSuggestion) {
    if (!s.section || !s.identifier) return;
    const u = this.stateService.watchingUser$();
    this.changes.update(list => [...list, {
      section: s.section!,
      identifier: s.identifier!,
      oldValue: s.oldValue ?? '',
      newValue: s.newValue ?? '',
      undone: false,
      timestamp: new Date().toISOString(),
      user: u ? { fullName: u.fullName, imageUrl: null } : null,
      fromAi: true,
    }]);
    this.applyChange(s.section!, s.identifier!, s.newValue ?? '');
    this.aiSuggestionsOpen.set(false);
  }

  pendingAiSuggestionsCount = computed(() =>
    this.aiSuggestions().length
  );

  /** Set of section:identifier keys for AI suggestions that have been actively applied */
  appliedAiKeys = computed(() => {
    const applied = new Set<string>();
    for (const c of this.changes()) {
      if (!c.undone && c.fromAi) {
        applied.add(`${c.section}:${c.identifier}`);
      }
    }
    return applied;
  });

  isAiApplied(section: string, identifier: string): boolean {
    return this.appliedAiKeys().has(`${section}:${identifier}`);
  }

  internalVersionPdfUrl = signal<string | null>(null);
  internalVersionPdfUrlBlob = signal<PdfSrcType | null>(null);
  originalVersionPdfBlob = signal<PdfSrcType | null>(null);

  lastUpdate = computed(() => {
    return this.currentCv()?.cv.changes?.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0]?.createdAt ?? this.currentCv()?.cv.createdAt ?? null;
  })

  canUndo = computed(() => this.changes().some(c => !c.undone));

  pendingDeletedIds = computed(() =>
    new Set(this.changes().filter(c => !c.undone && c.deleted).map(c => c.identifier))
  );

  canRedo = computed(() => {
    const list = this.changes();
    let cursorIdx = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].undone) { cursorIdx = i; break; }
    }
    return list.slice(cursorIdx + 1).some(c => c.undone);
  });

  private _skipTracking = false;

  getDiff(oldValue: string, newValue: string): { added: string; removed: string; index: number } {
    return getStringDiff(oldValue, newValue);
  }

  private trackChange(section: string, identifier: string, oldValue: string, newValue: string) {
    if (this._skipTracking) return;
    if (String(oldValue ?? '') === String(newValue ?? '')) return;
    const u = this.stateService.watchingUser$();
    this.changes.update(list => [...list, {
      section, identifier,
      oldValue: String(oldValue ?? ''), newValue: String(newValue ?? ''),
      undone: false,
      timestamp: new Date().toISOString(),
      user: u ? { fullName: u.fullName, imageUrl: null } : null
    }]);
  }

  private trackDelete(section: string, identifier: string) {
    if (this._skipTracking) return;
    const u = this.stateService.watchingUser$();
    this.changes.update(list => [...list, {
      section, identifier,
      oldValue: '', newValue: '',
      undone: false,
      deleted: true,
      timestamp: new Date().toISOString(),
      user: u ? { fullName: u.fullName, imageUrl: null } : null
    }]);
  }

  private trackOrder(section: string, identifier: string, order: number) {
    if (this._skipTracking) return;
    const u = this.stateService.watchingUser$();
    this.changes.update(list => [...list, {
      section, identifier,
      oldValue: '', newValue: '',
      undone: false,
      order,
      timestamp: new Date().toISOString(),
      user: u ? { fullName: u.fullName, imageUrl: null } : null
    }]);
  }

  private getReference(section: string, identifier: string) {
    const dotIdx = section.indexOf('.');
    const entity = dotIdx !== -1 ? section.slice(0, dotIdx) : section;
    const field = dotIdx !== -1 ? section.slice(dotIdx + 1) : identifier;
    switch (entity) {
      case 'highlight':
        return this.highlights().find(h => h.id === identifier);
      case 'otherSkill':
        return this.otherSkills().find(s => s.id === identifier);
      case 'experience':
        return this.experiences().find(e => e.id === identifier);
      case 'training':
        return this.trainingAndCertificates().find(t => t.id === identifier);
      case 'language':
        return this.languages().find(l => l.id === identifier);
    }
    return null;
  }

  private applyChange(section: string, identifier: string, value: string) {
    this._skipTracking = true;
    const dotIdx = section.indexOf('.');
    const entity = dotIdx !== -1 ? section.slice(0, dotIdx) : section;
    const field = dotIdx !== -1 ? section.slice(dotIdx + 1) : identifier;
    switch (entity) {
      case 'basicInfo': {
        let v: string | number | null = value;
        if (field === 'yearsExperience' || field === 'birthYear') {
          v = value === '' || value === 'null' ? null : Number(value) || null;
        }
        this.basicInfo.update(info => ({ ...info, [field]: v }));
        break;
      }
      case 'overview':
        this.overview.update(v => ({ ...v, content: value }));
        break;
      case 'highlight':
        this.highlights.update(list =>
          list.map(h => h.id === identifier ? { ...h, [field]: field === 'years' ? (Number(value) || 0) : value } : h)
        );
        break;
      case 'otherSkill':
        this.otherSkills.update(list =>
          list.map(s => s.id === identifier ? { ...s, name: value } : s)
        );
        break;
      case 'experience':
        this.experiences.update(list =>
          list.map(e => e.id === identifier ? { ...e, [field]: value } : e)
        );
        break;
      case 'training':
        this.trainingAndCertificates.update(list =>
          list.map(t => {
            if (t.id !== identifier) return t;
            if (field === 'type') return { ...t, type: (value || undefined) as TrainingType | undefined };
            return { ...t, [field]: value };
          })
        );
        break;
      case 'language':
        this.languages.update(list =>
          list.map(l => l.id === identifier ? { ...l, [field]: value } : l)
        );
        break;
    }
    this._skipTracking = false;
  }

  undo() {
    const list = this.changes();
    let idx = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].undone) { idx = i; break; }
    }
    if (idx === -1) return;
    const change = list[idx];
    this.changes.update(arr => arr.map((c, i) => i === idx ? { ...c, undone: true } : c));
    this.applyChange(change.section, change.identifier, change.oldValue);
  }

  redo() {
    const list = this.changes();
    let cursorIdx = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].undone) { cursorIdx = i; break; }
    }
    let redoIdx = -1;
    for (let i = cursorIdx + 1; i < list.length; i++) {
      if (list[i].undone) { redoIdx = i; break; }
    }
    if (redoIdx === -1) return;
    const change = list[redoIdx];
    this.changes.update(arr => arr.map((c, i) => i === redoIdx ? { ...c, undone: false } : c));
    this.applyChange(change.section, change.identifier, change.newValue);
  }

  // ── Change history UI ──────────────────────────────────────────────────────
  focusedChangeKey = signal<string | null>(null);
  focusedChanges = computed(() => this.focusedChangeKey() ? this.activeChangesForKey(this.focusedChangeKey()!) : []);

  activeChangesForKey(key: string): CvChange[] {
    const changes = this.currentCv()?.cv?.changes || [];
    const list = this.changes().concat(changes.map(x => {
      return {
        oldValue: x.oldValue ?? '',
        newValue: x.newValue ?? '',
        identifier: x.identifier ?? '',
        section: x.section ?? '',
        undone: false,
        timestamp: x.createdAt ?? '',
        deleted: x.deleted ?? undefined,
        order: x.viewOrder ?? undefined,
        user: {
          fullName: x.user?.fullName || 'Utente sconosciuto',
          imageUrl: x.profileImageUrl
        }
      } as CvChange
    })).filter(c => !c.undone);
    if (key === 'basicInfo' || key === 'overview') {
      return list.filter(c => c.section.startsWith(key + '.'));
    }
    return list.filter(c => c.identifier === key);
  }

  private readonly fieldLabels: Record<string, string> = {
    'basicInfo.name': 'Nome', 'basicInfo.title': 'Ruolo',
    'basicInfo.seniorityLabel': 'Seniority', 'basicInfo.yearsExperience': 'Anni esperienza',
    'basicInfo.birthYear': 'Anno di nascita', 'overview.content': 'Overview',
    'highlight.skill': 'Skill', 'highlight.years': 'Anni Skill',
    'otherSkill.name': 'Nome Skill',
    'experience.period': 'Periodo Esperienza', 'experience.company': 'Azienda',
    'experience.role': 'Ruolo Esperienza', 'experience.technologies': 'Tecnologie',
    'experience.description': 'Descrizione',
    'training.title': 'Titolo', 'training.issuer': 'Ente',
    'training.year': 'Anno', 'training.type': 'Tipo', 'training.description': 'Descrizione',
    'language.language': 'Lingua', 'language.level': 'Livello',
  };

  fieldLabelFor(section: string): string {
    return this.fieldLabels[section] || section;
  }

  truncate(text: string, max = 60): string {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '\u2026' : text;
  }

  userInitials(fullName: string): string {
    return (fullName || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  // ── Forms (solo per sezioni custom) ────────────────────────────────────────
  customSectionForms = new Map<string, FormGroup>();

  talentNotFound = signal(false);

  getCvsResponse = rxResource({
    params: () => this.id(),
    stream: (params) => params.params ? this.cvService
      .getCvsByTalent({ id: params.params }).pipe(catchError((er) => {
        if (er.status === 404) {
          this.snackBar.open('Talent non trovato', 'Chiudi', { duration: 3000, panelClass: ['error-snack'] });
          this.talentNotFound.set(true);
        }
        return of(null);
      })).pipe(tap(() => {
        this.changes.set([]);
        this.talentNotFound.set(false);
      })) : of(null)
  })

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any) {
    if (this.hasChanges()) {
      event.returnValue = 'close';
    }
    return true; // or return false;
  }

  currentCv = computed(() => {
    const cvResposne = this.getCvsResponse.value();
    if (!cvResposne || !cvResposne.cvs) return null;
    const cvs = this.getCvsResponse.value()?.cvs || [];
    const current = cvs.find(cv => cv.id === this.currentVersion()) ?? cvs.sort((a, b) => b.id! - a.id!)[0];
    if (!current) return null;
    untracked(() => {
      if (!this.currentVersion())
        this.currentVersion.set(current.id);
    })
    //
    const changes = this.applyChangesToCv(current);
    return {
      cv: changes.cv,
      externalData: cvResposne.externalData,
      talent: cvResposne.talent
    };
  });

  cvPreview = computed<CvPreviewItem | null>(() => {
    const data = this.currentCv();
    if (!data) return null;
    const response: CvPreviewItem = {
      cv: data.cv,
      externalData: data.externalData!,
      talent: data.talent!
    }
    return response;
  })

  applyChangesToCv(cv: Cv): { cv: Cv } {
    return this.cvBuilderService.applyChangesToCv(cv);
  }

  selectCv(cvId: number) {
    if (this.changes().length > 0) {
      const pendingCanges = confirm('Ci sono modifiche non salvate. Selezionando un\'altra versione queste modifiche andranno perse. Sei sicuro di voler continuare?');
      if (!pendingCanges) {
        return;
      }
    }
    this.changes.set([]);
    this.router.navigate([], { queryParams: { version: cvId }, queryParamsHandling: 'merge' });
  }

  deleteCurrentVersion() {
    const cv = this.currentCv()?.cv;
    if (!cv?.id) return;
    const ref = this.snackBar.open(
      `Eliminare la versione ${cv.version}? L'operazione è irreversibile.`,
      'Elimina',
      { duration: 6000, panelClass: ['error-snack'] }
    );
    ref.onAction().subscribe(() => {
      this.cvService.deleteCvById({ id: cv.id! }).subscribe({
        next: () => {
          this.snackBar.open('Versione eliminata con successo', undefined, {
            duration: 2500,
            panelClass: ['success-snack'],
          });
          this.getCvsResponse.reload();
        },
        error: () => {
          this.snackBar.open('Errore durante l\'eliminazione', 'Chiudi', {
            duration: 4000,
            panelClass: ['error-snack'],
          });
        },
      });
    });
  }

  cloneCurrentVersion() {
    const currentCv = this.currentCv();
    if (!currentCv?.cv.id) return;

    const currentChanges: CvChangeAddRequest[] = this.changes()
      .filter(c => !c.undone)
      .map(c => ({
        oldValue: c.oldValue,
        newValue: c.newValue,
        identifier: c.identifier,
        section: c.section,
        deleted: c.deleted ?? null,
        viewOrder: c.order ?? null,
      }));


    const ref = this.dialog.open(CvCloneDialogComponent, { width: '420px' });
    ref.afterClosed().subscribe((name: string | undefined) => {
      if (!name) return;
      if (this.getCvsResponse.value()?.cvs?.some(cv => cv.versionName?.toLowerCase() === name.toLowerCase() && cv.version === currentCv.cv.version)) {
        this.snackBar.open('Esiste già una versione con questo nome. Scegli un nome diverso.', 'Chiudi', {
          duration: 4000,
          panelClass: ['error-snack'],
        });
        return;
      }
      const changes = currentCv.cv.changes || [];
      const result = this.applyChangesToCv({ ...currentCv.cv, changes: [...changes, ...currentChanges] });
      this.cvService.cloneVersion({
        id: currentCv.cv.id!,
        cvExtractedData: result.cv.cvExtractedData!,
        name,
      }).subscribe({
        next: (x) => {
          this.changes.set([]);
          this.router.navigate([], { queryParams: { version: x }, queryParamsHandling: 'merge' });
          this.snackBar.open('Versione clonata con successo', undefined, {
            duration: 2500,
            panelClass: ['success-snack'],
          });
          this.getCvsResponse.reload();
        },
        error: () => {
          this.snackBar.open('Errore durante il clone', 'Chiudi', {
            duration: 4000,
            panelClass: ['error-snack'],
          });
        },
      });
    });
  }

  originalCvUrl = computed(() => {
    const data = this.currentCv();
    return (data?.externalData as any)?.['original-resume'] || null;
  });

  // ── Preview panel ──────────────────────────────────────────────────────────
  previewOpen = signal(this.localStorageService.getItem('CV_BUILDER_PREVIEW_MODE') === true);
  previewTab = signal<'cv' | 'result'>(this.localStorageService.getItem('CV_BUILDER_PREVIEW_MODE_TAB') || 'cv');
  highContrast = signal(this.localStorageService.getItem('CV_BUILDER_PREVIEW_MODE_HIGH_CONTRAST') === true);

  hasChanges = computed(() => this.changes().length > 0);

  verifyCurrentVersion() {
    const cv = this.currentCv()?.cv;
    if (!cv?.id) return;
    const already = cv.verified;
    const label = already ? 'Rimuovere la verifica dalla versione' : 'Impostare come verificato la versione';
    const ref = this.snackBar.open(
      `${label} ${cv.version}?`,
      already ? 'Rimuovi verifica' : 'Verifica',
      { duration: 6000, panelClass: ['warn-snack'] }
    );
    ref.onAction().subscribe(() => {
      this.cvService.setAsVerified({ id: cv.id! }).subscribe({
        next: () => {
          this.snackBar.open(
            already ? 'Verifica rimossa' : 'CV impostato come verificato',
            undefined,
            { duration: 2500, panelClass: ['success-snack'] }
          );
          this.getCvsResponse.reload();
        },
        error: () => {
          this.snackBar.open('Errore durante la verifica', 'Chiudi', {
            duration: 4000,
            panelClass: ['error-snack'],
          });
        },
      });
    });
  }

  updateContrast() {
    this.highContrast.update(v => !v);
  }

  togglePreview() {
    this.previewOpen.update(v => !v);
  }

  blobs = signal<{ key: number, blob: Blob }[]>([]);

  constructor() {
    // Effect to populate data from currentCv

    effect(() => {
      const cvUrl = this.internalVersionPdfUrl();
      if (cvUrl) {
        const fetchBlobAws = (url: string) => this.httpClient.get(url, { responseType: 'blob', context: new HttpContext().set(PREVENT_SPINNER, true) }).subscribe(blob => {
          this.internalVersionPdfUrlBlob.set(blob);
        });
        const blob = this.blobs().find(b => b.key === this.currentCv()?.cv.id!);
        if (blob) {
          this.internalVersionPdfUrlBlob.set(blob.blob);
        }
        else
          fetchBlobAws(cvUrl);
      }
    })

    effect(() => {
      const cvUrl = this.cvPreview();
      const fetchBlobTeamTailor = () => this.httpClient.get(`/cvs/talent/${this.cvPreview()?.cv?.id}/pdf?url=${encodeURIComponent((cvUrl?.externalData as any)?.['original-resume'])}`, { responseType: 'blob', withCredentials: true, headers: new HttpHeaders().set('Authorization', `Bearer ${this.authService.accessToken()}`), context: new HttpContext().set(PREVENT_SPINNER, true) }).subscribe(blob => {

        this.originalVersionPdfBlob.set(blob);
      });
      if (cvUrl)
        fetchBlobTeamTailor();
    })

    effect(() => {
      const preview = this.previewTab();
      const highContrast = this.highContrast();
      const previewOpen = this.previewOpen();
      this.localStorageService.setItem('CV_BUILDER_PREVIEW_MODE_TAB', preview);
      this.localStorageService.setItem('CV_BUILDER_PREVIEW_MODE_HIGH_CONTRAST', highContrast);
      this.localStorageService.setItem('CV_BUILDER_PREVIEW_MODE', previewOpen);
    })

    effect(() => {
      const response = this.currentCv();
      const cv = response?.cv;

      if (cv) {
        if (cv.lastPdfUpdate != cv.updatedAt && cv.status === 'Completed') {
          this.syncCurrent(cv);
        } else {
          this.internalVersionPdfUrl.set(cv.cvUrl!);
        }
      }
      untracked(() => {
        if (cv?.cvExtractedData) {
          const data = cv.cvExtractedData;

          // Populate basic info
          if (data.basicInfo) {
            const basicInfoData = {
              name: data.basicInfo.name || '',
              title: data.basicInfo.title || '',
              seniorityLabel: data.basicInfo.seniorityLabel || '',
              yearsExperience: data.basicInfo.yearsExperience ?? null,
              birthYear: data.basicInfo.birthYear ?? null,
            };
            this.basicInfo.set(basicInfoData);

            // Populate overview from fullOverview
            if (data.basicInfo.fullOverview) {
              this.overview.set({
                content: data.basicInfo.fullOverview,
                editing: false,
                contentEditable: false
              });
            }
          }

          // Populate highlights
          if (data.highlights) {
            const highlightsData = data.highlights.map((h: CvHighlight) => ({
              id: h.id || crypto.randomUUID(),
              skill: h.skill || '',
              years: h.years ?? 0,
            }));
            this.highlights.set(highlightsData);
          }

          // Populate other skills
          if (data.otherSkills) {
            const otherSkillsData = data.otherSkills.map((s: CvOtherSkill) => ({
              id: s.id || crypto.randomUUID(),
              name: s.name || '',
            }));
            this.otherSkills.set(otherSkillsData);
          }

          // Populate experiences
          if (data.experiences) {
            const experiencesData = data.experiences.map((e: CvExperience) => ({
              id: e.id || crypto.randomUUID(),
              period: e.period || '',
              company: e.company || '',
              role: e.role || '',
              technologies: e.technologies || '',
              description: e.description || '',
            }));
            this.experiences.set(experiencesData);
          }

          // Populate training and certificates
          if (data.trainingAndCertificates) {
            const trainingData = data.trainingAndCertificates.map((t: TrainingAndCertificateItem) => ({
              id: t.id || crypto.randomUUID(),
              type: t.type,
              title: t.title || '',
              issuer: t.issuer || '',
              year: t.year || '',
              description: t.description || '',
            }));
            this.trainingAndCertificates.set(trainingData);
          }

          // Populate custom sections
          if (data.customSections) {
            const customSectionsData = data.customSections.map((s: CvCustomSection) => ({
              id: s.id || crypto.randomUUID(),
              title: s.title || '',
              level: s.level || '',
              content: s.content?.map((item: CvCustomSectionItem) => ({
                label: item.label || '',
                level: item.level || ''
              })) || [],
              editing: false
            }));
            this.customSections.set(customSectionsData);
          }

          // Populate languages
          if (data.languages) {
            const languagesData = data.languages.map((lang: LanguageItem) => ({
              id: lang.id || crypto.randomUUID(),
              language: lang.language || '',
              level: lang.level || '',
            }));
            this.languages.set(languagesData);
          }

          this.changeDetection.markForCheck();
        }
      })

    });
  }

  // ── Logo aziendale ─────────────────────────────────────────────────────────
  logoUrl = signal<string | null>('logo_odda.png');


  syncCurrent(cv: Cv) {
    this.cvService.syncCurrent({
      id: cv.id!,
      cvExtractedData: cv.cvExtractedData!,
    }, 'body', false, { context: new HttpContext().set(PREVENT_SPINNER, true) }).subscribe(f => {
      this.internalVersionPdfUrl.set(f);
    });
  }

  regeneratePdf() {
    const cv = this.currentCv()?.cv;
    if (!cv) return;
    this.snackBar.open('Rigenerazione PDF avviata, a breve sará disponibile il nuovo pdf e la preview verrá aggiornata.', undefined, { duration: 2500 });
    this.syncCurrent(cv);
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.logoUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.logoUrl.set(null);
  }

  // ── Basic info ─────────────────────────────────────────────────────────────
  basicInfo = signal<{
    name: string;
    title: string;
    seniorityLabel: string;
    yearsExperience: number | null;
    birthYear: number | null;
  }>({
    name: '',
    title: '',
    seniorityLabel: '',
    yearsExperience: null,
    birthYear: null,
  });

  updateBasicInfo(field: string, value: string | number | null) {
    const oldValue = String((this.basicInfo() as any)[field] ?? '');
    this.trackChange(`basicInfo.${field}`, String(this.id() ?? ''), oldValue, String(value ?? ''));
    this.basicInfo.update(info => ({ ...info, [field]: value }));
  }

  // ── Overview ───────────────────────────────────────────────────────────────
  overview = signal<{ content: string; editing: boolean, contentEditable: boolean }>({
    content: '',
    editing: false,
    contentEditable: false
  });

  confirmOverview(content?: string) {
    const text = (content ?? this.overview().content ?? '').trim();
    this.trackChange('overview.content', String(this.id() ?? ''), this.overview().content, text);
    this.overview.set({ content: text, editing: false, contentEditable: false });
  }

  editOverview() {
    this.overview.update(v => ({ ...v, editing: true, contentEditable: true }));
  }

  setOverviewContentEditableStatus($event: MouseEvent, status: boolean) {
    console.log($event, status);
    if (this.overview().editing) { return; }
    this.overview.update(v => ({ ...v, contentEditable: status, editing: status === false ? false : v.editing }));
  }

  setOverviewEditingStatus(status: boolean) {
    this.overview.update(v => ({ ...v, editing: status, contentEditable: status }));
  }

  // ── Highlights ─────────────────────────────────────────────────────────────
  highlights = signal<Array<{ id: string; skill: string; years: number }>>([]);

  addHighlight() {
    this.highlights.update(list => [...list, { id: crypto.randomUUID(), skill: '', years: 0 }]);
  }

  updateHighlight(id: string, field: 'skill' | 'years', value: string | number) {
    const oldItem = this.highlights().find(h => h.id === id);
    const oldValue = oldItem ? String((oldItem as any)[field] ?? '') : '';
    const newVal = field === 'years' ? (Number(value) || 0) : value;
    this.trackChange(`highlight.${field}`, id, oldValue, String(newVal));
    this.highlights.update(list =>
      list.map(h => h.id === id ? { ...h, [field]: newVal } : h)
    );
  }

  removeHighlight(id: string) {
    this.trackDelete('highlight', id);
  }

  dropHighlight(event: CdkDragDrop<any>) {
    const list = [...this.highlights()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.highlights.set(list);
    this.trackOrder('highlight', list[event.currentIndex].id, event.currentIndex);
  }

  moveHighlightUp(index: number) {
    if (index === 0) return;
    const list = [...this.highlights()];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    this.highlights.set(list);
    this.trackOrder('highlight', list[index - 1].id, index - 1);
  }

  moveHighlightDown(index: number) {
    const list = this.highlights();
    if (index === list.length - 1) return;
    const newList = [...list];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    this.highlights.set(newList);
    this.trackOrder('highlight', newList[index + 1].id, index + 1);
  }

  // ── Other skills ───────────────────────────────────────────────────────────
  otherSkills = signal<Array<{ id: string; name: string }>>([]);

  addOtherSkill() {
    this.otherSkills.update(list => [...list, { id: crypto.randomUUID(), name: '' }]);
  }

  updateOtherSkill(id: string, value: string) {
    const oldItem = this.otherSkills().find(s => s.id === id);
    const oldValue = oldItem?.name ?? '';
    this.trackChange('otherSkill.name', id, oldValue, value);
    this.otherSkills.update(list =>
      list.map(s => s.id === id ? { ...s, name: value } : s)
    );
  }

  removeOtherSkill(id: string) {
    this.trackDelete('otherSkill', id);
  }

  dropOtherSkill(event: CdkDragDrop<any>) {
    const list = [...this.otherSkills()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.otherSkills.set(list);
    this.trackOrder('otherSkill', list[event.currentIndex].id, event.currentIndex);
  }

  moveOtherSkillUp(index: number) {
    if (index === 0) return;
    const list = [...this.otherSkills()];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    this.otherSkills.set(list);
    this.trackOrder('otherSkill', list[index - 1].id, index - 1);
  }

  moveOtherSkillDown(index: number) {
    const list = this.otherSkills();
    if (index === list.length - 1) return;
    const newList = [...list];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    this.otherSkills.set(newList);
    this.trackOrder('otherSkill', newList[index + 1].id, index + 1);
  }

  // ── Experiences ────────────────────────────────────────────────────────────
  experiences = signal<Array<{
    id: string;
    period: string;
    company: string;
    role: string;
    technologies: string;
    description: string;
  }>>([]);

  addExperience() {
    const newId = crypto.randomUUID();
    this.experiences.update(list => [
      { id: newId, period: '', company: '', role: '', technologies: '', description: '' },
      ...list,
    ]);
    this.trackOrder('experience', newId, 0);
  }

  currentEditingExperienceId = signal<string | null>(null);
  currentEditingExperienceValue = signal<string>('');
  setCurrentEditingExperienceValue(value: string) {
    this.currentEditingExperienceValue.set(value);
  }
  updateExperience(id: string, field: string, value: string) {
    const oldItem = this.experiences().find(e => e.id === id);
    const oldValue = oldItem ? String((oldItem as any)[field] ?? '') : '';
    this.currentEditingExperienceId.set(null);
    this.currentEditingExperienceValue.set('');
    this.trackChange(`experience.${field}`, id, oldValue, value);
  }

  dropExperience(event: CdkDragDrop<any>) {
    const list = [...this.experiences()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.experiences.set(list);
    this.trackOrder('experience', list[event.currentIndex].id, event.currentIndex);
  }

  moveExperienceUp(index: number) {
    if (index === 0) return;
    const list = [...this.experiences()];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    this.experiences.set(list);
    this.trackOrder('experience', list[index - 1].id, index - 1);
  }

  moveExperienceDown(index: number) {
    const list = this.experiences();
    if (index === list.length - 1) return;
    const newList = [...list];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    this.experiences.set(newList);
    this.trackOrder('experience', newList[index + 1].id, index + 1);
  }

  removeExperience(id: string) {
    this.trackDelete('experience', id);
  }

  // ── Training & Certificates ────────────────────────────────────────────────
  trainingAndCertificates = signal<Array<{
    id: string;
    type?: TrainingType;
    title: string;
    issuer: string;
    year: string;
    description: string;
  }>>([]);

  addTraining() {
    this.trainingAndCertificates.update(list => [
      ...list,
      { id: crypto.randomUUID(), type: undefined, title: '', issuer: '', year: '', description: '' },
    ]);
  }


  currentEditingTrainingId = signal<string | null>(null);
  currentEditingTrainingValue = signal<string>('');

  updateTraining(id: string, field: string, value: string) {
    const oldItem = this.trainingAndCertificates().find(t => t.id === id);
    const oldValue = oldItem ? String((oldItem as any)[field] ?? '') : '';
    this.currentEditingTrainingId.set(null);
    this.currentEditingTrainingValue.set('');
    this.trackChange(`training.${field}`, id, oldValue, value);
    this.trainingAndCertificates.update(list =>
      list.map(t => {
        if (t.id !== id) return t;
        if (field === 'type') return { ...t, type: (value || undefined) as TrainingType | undefined };
        return { ...t, [field]: value };
      })
    );
  }

  dropTraining(event: CdkDragDrop<any>) {
    const list = [...this.trainingAndCertificates()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.trainingAndCertificates.set(list);
    this.trackOrder('training', list[event.currentIndex].id, event.currentIndex);
  }

  removeTraining(id: string) {
    this.trackDelete('training', id);
  }

  // ── Languages ────────────────────────────────────────────────────────
  languages = signal<Array<{ id: string; language: string; level: string }>>([])

  addLanguage() {
    this.languages.update(list => [...list, { id: crypto.randomUUID(), language: '', level: '' }]);
  }

  updateLanguage(id: string, field: 'language' | 'level', value: string) {
    const oldItem = this.languages().find(l => l.id === id);
    const oldValue = oldItem ? String((oldItem as any)[field] ?? '') : '';
    this.trackChange(`language.${field}`, id, oldValue, value);
    this.languages.update(list =>
      list.map(l => l.id === id ? { ...l, [field]: value } : l)
    );
  }

  removeLanguage(id: string) {
    this.trackDelete('language', id);
  }

  dropLanguage(event: CdkDragDrop<any>) {
    const list = [...this.languages()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.languages.set(list);
    this.trackOrder('language', list[event.currentIndex].id, event.currentIndex);
  }

  moveLanguageUp(index: number) {
    if (index === 0) return;
    const list = [...this.languages()];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    this.languages.set(list);
    this.trackOrder('language', list[index - 1].id, index - 1);
  }

  moveLanguageDown(index: number) {
    const list = this.languages();
    if (index === list.length - 1) return;
    const newList = [...list];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    this.languages.set(newList);
    this.trackOrder('language', newList[index + 1].id, index + 1);
  }

  // ── Custom sections ────────────────────────────────────────────────────────
  customSections = signal<Array<{
    id: string;
    title: string;
    level: string;
    content: Array<{ label: string; level: string }>;
    editing: boolean;
  }>>([]);

  addCustomSection() {
    const id = crypto.randomUUID();
    this.customSections.update(list => [
      ...list,
      { id, title: 'Nuova sezione', level: '', content: [], editing: true },
    ]);
    this.createCustomSectionForm(id, { title: 'Nuova sezione', level: '', content: [] });
  }

  createCustomSectionForm(id: string, data: Partial<CvCustomSection>) {
    const contentArray = this.fb.array(
      (data.content || []).map(item => this.fb.group({
        label: [item.label, Validators.required],
        level: [item.level, Validators.required]
      }))
    );
    this.customSectionForms.set(id, this.fb.group({
      title: [data.title || '', Validators.required],
      level: [data.level || ''],
      content: contentArray
    }));
  }

  getCustomSectionForm(id: string): FormGroup {
    return this.customSectionForms.get(id)!;
  }

  getCustomSectionContentArray(id: string): FormArray {
    const form = this.getCustomSectionForm(id);
    return form.get('content') as FormArray;
  }

  addCustomSectionItem(sectionId: string) {
    const contentArray = this.getCustomSectionContentArray(sectionId);
    contentArray.push(this.fb.group({
      label: ['', Validators.required],
      level: ['', Validators.required]
    }));
  }

  removeCustomSectionItem(sectionId: string, itemIndex: number) {
    const contentArray = this.getCustomSectionContentArray(sectionId);
    contentArray.removeAt(itemIndex);
  }

  confirmCustomSection(id: string) {
    const form = this.customSectionForms.get(id);
    if (form && form.valid) {
      this.customSections.update(list =>
        list.map(s => (s.id === id ? { ...s, ...form.value, editing: false } : s))
      );
      this.customSectionForms.delete(id);
    }
  }

  editCustomSection(id: string) {
    const section = this.customSections().find(s => s.id === id);
    if (section) {
      this.createCustomSectionForm(id, section);
      this.customSections.update(list =>
        list.map(s => (s.id === id ? { ...s, editing: true } : s))
      );
    }
  }

  removeCustomSection(id: string) {
    this.customSections.update(list => list.filter(s => s.id !== id));
    this.customSectionForms.delete(id);
  }

  // ── Summary JSON ───────────────────────────────────────────────────────────
  allConfirmed = computed(() => {
    const ov = this.overview();
    const custom = this.customSections();
    return !ov.editing && custom.every(s => !s.editing);
  });

  exportJson() {
    const payload = {
      basicInfo: this.basicInfo(),
      logoUrl: this.logoUrl(),
      overview: this.overview().content,
      highlights: this.highlights(),
      otherSkills: this.otherSkills(),
      experiences: this.experiences(),
      trainingAndCertificates: this.trainingAndCertificates(),
      customSections: this.customSections(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cv.json';
    a.click();
  }


  saveChanges() {
    const changes: CvChangeAddRequest[] = this.changes()
      .filter(c => !c.undone)
      .map(c => ({
        oldValue: c.oldValue,
        newValue: c.newValue,
        identifier: c.identifier,
        section: c.section,
        deleted: c.deleted ?? null,
        viewOrder: c.order ?? null,
      }));

    const currentCv = this.currentCv();
    const result = this.applyChangesToCv({ ...currentCv!.cv, changes });
    this.cvService.addCvChange({ id: this.currentCv()?.cv.id!, cvChangesAddRequest: { changes, current: result.cv.cvExtractedData } }).subscribe({
      next: () => {
        this.changes.set([]);
        this.pendingDeletedIds().clear();
        this.snackBar.open('✓ Modifiche salvate con successo', 'Chiudi', { duration: 3000, panelClass: ['success-snack'] });
        setTimeout(() => {
          this.getCvsResponse.reload();
        }, 100)
      },
      error: () => {
        this.snackBar.open('❌ Errore durante il salvataggio. Riprova.', 'Chiudi', { duration: 4000, panelClass: ['error-snack'] });
      }
    });
  }


  forceNewLoading() {
    this.snackBar
    .open('Attenzione, procedendo verrá creata una nuova versione del CV partendo dal cv presente su teamtailor, la corrente versione non subirá alcuna modifica.', 'Conferma', { duration: 3000, panelClass: ['success-snack'] })
      .onAction().subscribe(() => {
        this.cvService.forceSyncCv({
          talent: this.id()!
        }).subscribe({
          next: () => {
            this.snackBar.open('✓ Sincronizzazione forzata avviata', 'Chiudi', { duration: 3000, panelClass: ['success-snack'] });
            setTimeout(() => {
              this.getCvsResponse.reload();
            }, 100)
          },
          error: () => {
            this.snackBar.open('❌ Errore durante la sincronizzazione. Riprova.', 'Chiudi', { duration: 4000, panelClass: ['error-snack'] });
          }
        });
      });

  }

  reload() {
    if (this.changes().length > 0) {
      this.snackBar.open('Ci sono modifiche non salvate. Ricaricando la pagina queste modifiche andranno perse. Sei sicuro di voler continuare?', 'Ricarica', { duration: 6000, panelClass: ['success-snack'] })
        .onAction().subscribe(() => {
          this.getCvsResponse.reload();
        });
    }
    else {
      this.getCvsResponse.reload();
    }
  }
}
