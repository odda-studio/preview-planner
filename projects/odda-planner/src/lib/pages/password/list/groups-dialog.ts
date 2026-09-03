import { Component, inject, signal, computed, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import { VaultService, GroupDto, UserService, VaultUserDto } from '../../../api/index';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'lib-groups-dialog',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Gestione Gruppi</h2>
    <mat-dialog-content class="dialog-content">
      <!-- Lista gruppi esistenti -->
      <div class="groups-section">
        <h3>I tuoi gruppi</h3>
        @if (groups.isLoading()) {
          <mat-spinner diameter="24"></mat-spinner>
        } @else if (groups.value()?.length === 0) {
          <p class="empty-message">Nessun gruppo creato. Crea il tuo primo gruppo!</p>
        } @else {
          <mat-list>
            @for (group of groups.value(); track group.groupId) {
              <mat-list-item class="group-item flex justify-between items-center">
                <div class="group-info">
                  <span class="group-name">{{ group.name }}</span>
                  <span class="member-count">{{ group.members?.length || 0 }} membri</span>
                </div>
                <div class="group-actions">
                  <button mat-icon-button (click)="editGroup(group)" matTooltip="Modifica">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="manageMembers(group)" matTooltip="Gestisci membri">
                    <mat-icon>group</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteGroup(group)" matTooltip="Elimina">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </mat-list-item>
            }
          </mat-list>
        }
      </div>

      <!-- Form creazione nuovo gruppo -->
      <div class="create-section">
        <h3>{{ editingGroup() ? 'Modifica Gruppo' : 'Crea Nuovo Gruppo' }}</h3>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nome Gruppo</mat-label>
            <input matInput formControlName="name" placeholder="Es: Team Sviluppo">
            @if (form.get('name')?.hasError('required')) {
              <mat-error>Il nome è obbligatorio</mat-error>
            }
          </mat-form-field>

          <div class="form-actions">
            @if (editingGroup()) {
              <button mat-button type="button" (click)="cancelEdit()">Annulla</button>
            }
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || isLoading()">
              @if (isLoading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ editingGroup() ? 'Salva Modifiche' : 'Crea Gruppo' }}
              }
            </button>
          </div>
        </form>
      </div>

      <!-- Sezione gestione membri (visibile quando si clicca su "Gestisci membri") -->
      @if (managingGroup()) {
        <div class="members-section">
          <h3>Membri di "{{ managingGroup()?.name }}"</h3>
          
          @if (managingGroup()?.members?.length === 0) {
            <p class="empty-message">Nessun membro in questo gruppo.</p>
          } @else {
            <mat-list>
              @for (member of managingGroup()?.members; track member.userId) {
                <mat-list-item class="member-item">
                  <div class="member-info">
                    <span class="member-name">{{ member.userDisplayName || member.userEmail }}</span>
                    <span class="member-email">{{ member.userEmail }}</span>
                  </div>
                  <button mat-icon-button color="warn" (click)="removeMember(member.userId!)">
                    <mat-icon>person_remove</mat-icon>
                  </button>
                </mat-list-item>
              }
            </mat-list>
          }

          <!-- Form aggiunta membro -->
           @if (availableUsers().length > 0) {
             <div class="add-member-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Seleziona utente da aggiungere</mat-label>
              <mat-select [(ngModel)]="selectedUser">
                @for (user of availableUsers(); track user.userId) {
                  <mat-option [value]="user">
                    {{ user.fullName || user.email }} ({{ user.email }})
                  </mat-option>
                }
              </mat-select>
              @if (vaultUsers.isLoading()) {
                <mat-hint>Caricamento utenti...</mat-hint>
              } 
            </mat-form-field>
            <button mat-raised-button color="accent" (click)="addMember()" [disabled]="!selectedUser">
              Aggiungi Membro
            </button>
          </div>
           }
         

          <button mat-button (click)="closeMembers()">Chiudi gestione membri</button>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Chiudi</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      padding: 20px 24px;
      min-width: 500px;
      max-height: 60vh;
      overflow-y: auto;
      display: block;
    }

    .groups-section, .create-section, .members-section {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .groups-section h3, .create-section h3, .members-section h3 {
      margin-top: 0;
      margin-bottom: 16px;
      color: #333;
    }

    .empty-message {
      color: #666;
      font-style: italic;
    }

    .group-item, .member-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .group-info, .member-info {
      display: flex;
      flex-direction: column;
    }

    .group-name, .member-name {
      font-weight: 500;
    }

    .member-count, .member-email {
      font-size: 12px;
      color: #666;
    }

    .group-actions {
      display: flex;
      gap: 4px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    .add-member-form {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-top: 16px;
    }

    .add-member-form mat-form-field {
      flex: 1;
    }
  `],
})
export class GroupsDialog {
  private dialogRef = inject(MatDialogRef<GroupsDialog>);
  private vaultService = inject(VaultService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  editingGroup = signal<GroupDto | null>(null);
  managingGroup = signal<GroupDto | null>(null);
  selectedUser: VaultUserDto | null = null;

  groups = rxResource({
    stream: () => this.vaultService.vaultGroupsGet()
  });

  vaultUsers = rxResource({
    stream: () => this.vaultService.vaultUsersVaultEnabledGet()
  });

  // Filtra gli utenti che non sono già membri del gruppo corrente
  availableUsers = computed(() => {
    const groupd = this.groups.value();
    const allUsers = this.vaultUsers.value() || [];
    const currentGroup = this.managingGroup();
    if (!currentGroup?.members) return allUsers;

    const memberIds = new Set(currentGroup.members.map(m => m.userId));
    return allUsers.filter(u => !memberIds.has(u.userId));
  });

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
  });


  constructor() {
    effect(() => {
      const groups = this.groups.value();
      if(groups && this.managingGroup()) {
        const updated = groups.find(g => g.groupId === this.managingGroup()?.groupId);
        if(updated) this.managingGroup.update(() => updated);
      }
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    try {
      const name = this.form.value.name;

      if (this.editingGroup()) {
        await firstValueFrom(this.vaultService.vaultGroupsGroupIdPut({
          groupId: this.editingGroup()!.groupId!,
          updateGroupRequest: { name }
        }));
        this.snackBar.open('Gruppo aggiornato!', 'Chiudi', { duration: 3000 });
      } else {
        await firstValueFrom(this.vaultService.vaultGroupsPost({
          createGroupRequest: { name }
        }));
        this.snackBar.open('Gruppo creato!', 'Chiudi', { duration: 3000 });
      }

      this.form.reset();
      this.editingGroup.set(null);
      this.groups.reload();
    } catch (error: any) {
      this.snackBar.open('Errore: ' + error.message, 'Chiudi', { duration: 5000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  editGroup(group: GroupDto) {
    this.editingGroup.set(group);
    this.form.setValue({ name: group.name || '' });
  }

  cancelEdit() {
    this.editingGroup.set(null);
    this.form.reset();
  }

  async deleteGroup(group: GroupDto) {
    if (!confirm(`Sei sicuro di voler eliminare il gruppo "${group.name}"?`)) return;

    this.isLoading.set(true);
    try {
      await firstValueFrom(this.vaultService.vaultGroupsGroupIdDelete({
        groupId: group.groupId!
      }));
      this.snackBar.open('Gruppo eliminato!', 'Chiudi', { duration: 3000 });
      this.groups.reload();
    } catch (error: any) {
      this.snackBar.open('Errore: ' + error.message, 'Chiudi', { duration: 5000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  manageMembers(group: GroupDto) {
    this.managingGroup.set(group);
  }

  closeMembers() {
    this.managingGroup.set(null);
  }

  async addMember() {
    if (!this.selectedUser || !this.managingGroup()) return;

    this.isLoading.set(true);
    try {
      await firstValueFrom(this.vaultService.vaultGroupsGroupIdMembersPost({
        groupId: this.managingGroup()!.groupId!,
        addGroupMemberRequest: { userId: this.selectedUser.userId! }
      }));
      this.snackBar.open('Membro aggiunto!', 'Chiudi', { duration: 3000 });
      this.selectedUser = null;
      this.groups.reload();
      this.vaultUsers.reload();
      // Aggiorna anche il gruppo corrente
      const updatedGroups = this.groups.value();
      const updated = updatedGroups?.find(g => g.groupId === this.managingGroup()?.groupId);
      if (updated) this.managingGroup.update(() => updated);
    } catch (error: any) {
      this.snackBar.open('Errore: ' + error.message, 'Chiudi', { duration: 5000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async removeMember(userId: number) {
    if (!this.managingGroup()) return;
    if (!confirm('Sei sicuro di voler rimuovere questo membro?')) return;

    this.isLoading.set(true);
    try {
      await firstValueFrom(this.vaultService.vaultGroupsGroupIdMembersUserIdDelete({
        groupId: this.managingGroup()!.groupId!,
        userId
      }));
      this.snackBar.open('Membro rimosso!', 'Chiudi', { duration: 3000 });
      this.groups.reload();
      this.vaultUsers.reload();
      const updatedGroups = this.groups.value();
      const updated = updatedGroups?.find(g => g.groupId === this.managingGroup()?.groupId);
      if (updated) this.managingGroup.update(() => updated);
    } catch (error: any) {
      this.snackBar.open('Errore: ' + error.message, 'Chiudi', { duration: 5000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
