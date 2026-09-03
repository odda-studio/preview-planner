import { Routes } from '@angular/router';
import { ComparisonOperator, SortingDto } from '../../api';
import { BaseEntityComponent } from './base-entity/base-entity.component';
import { map, Observable, tap } from 'rxjs';
import { SavedQuery } from 'core-library'
import { CvBuilderComponent } from './cv-builder/cv-builder.component';
import { Expiring } from './expiring/expiring';
import { EmployeesCosts } from './employees-costs/employees-costs';

export type dataRouteInfo = {
  title: string | ((ctx: BaseEntityComponent) => Observable<string>),
  createForm?: string | undefined,
  updateForm?: string | undefined,
  tableName: string,
  entityName: string,
  titleUpdatingItem?: (row: any) => string,
  titleCreatingItem?: string,
  allowSelection?: boolean,
  baseFilters?: Record<string, {
    value: any,
    filterOperator: ComparisonOperator
  }> | ((ctx: BaseEntityComponent) => Record<string, {
    value: any,
    filterOperator: ComparisonOperator
  }>),
  baseSorting?: SortingDto[] | ((ctx: BaseEntityComponent) => SortingDto[]),
  baseQueries?: SavedQuery[] | ((ctx: BaseEntityComponent) => SavedQuery[])
}

export const MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/dashboard').then(x => x.Dashboard),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./dashboard-home/dashboard-home.component').then(x => x.DashboardHomeComponent),
      },
      {
        path: 'show/:id',
        loadComponent: () => import('./dashboard-home/dashboard-home.component').then(x => x.DashboardHomeComponent),
      },
      {
        path: 'clients',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Lista clienti',
          createForm: 'create-company',
          updateForm: 'update-company',
          tableName: 'companies',
          entityName: 'company',
          titleUpdatingItem: (row) => 'Stai modificando ' + row.businessName,
          titleCreatingItem: 'Compila il form per creare un nuovo cliente',
        } as dataRouteInfo
      },
      {
        path: 'users',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Lista utenti',
          createForm: 'create-user',
          updateForm: 'update-user',
          tableName: 'users',
          entityName: 'user',
          titleUpdatingItem: (row) => 'Stai modificando ' + row.email,
          titleCreatingItem: 'Compila il form per creare un nuovo utente',
        } as dataRouteInfo
      },
      {
        path: 'consultants',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Lista consulenti',
          tableName: 'users',
          entityName: 'user',
          baseFilters: {
            roles: {
              value: [7],
              filterOperator: ComparisonOperator.In
            }
          }
        } as dataRouteInfo
      },
      {
        path: 'roles',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Lista ruoli',
          tableName: 'roles',
          entityName: 'role',
          createForm: 'create-role',
          titleUpdatingItem: (row) => 'Stai modificando ' + row.email,
          titleCreatingItem: 'Compila il form per creare un nuovo utente',
        } as dataRouteInfo
      },
      {
        path: 'orders',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Ordini d\'acquisto',
          tableName: 'orders',
          entityName: 'order',
          createForm: 'create-order',
          updateForm: 'update-order',
          titleCreatingItem: 'Compila il form per creare un nuovo ordine d\'acquisto',
          baseFilters: () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            // Primo giorno del mese corrente
            const startOfMonth = new Date(year, month, 1);

            // Ultimo giorno del mese corrente
            const endOfMonth = new Date(year, month + 1, 0);

            return {
              startDate: {
                value: endOfMonth.toISOString(),
                filterOperator: ComparisonOperator.Lte
              },
              endDate: {
                value: startOfMonth.toISOString(),
                filterOperator: ComparisonOperator.Gte
              }
            };
          },
          baseQueries: () => {
            return [
              {
                id: 'ongoing_orders',
                name: 'Ordini In corso',
                groups: [
                  {
                    id: 'on_going_timesheets_group',
                    logic: 'And',
                    filters: [
                      {
                        id: 'startDate',
                        field: 'startDate',
                        operator: 'Lte',
                        value: new Date().toISOString().split('T')[0]
                      },
                      {
                        id: 'endDate',
                        field: 'endDate',
                        operator: 'Gte',
                        value: new Date().toISOString().split('T')[0]
                      }
                    ]
                  }
                ],
                createdAt: new Date(),
              } as SavedQuery,
              {
                id: 'expired_timesheets',
                name: 'Ordini scaduti',
                groups: [
                  {
                    id: 'expired_timesheets_group',
                    logic: 'And',
                    filters: [
                      {
                        id: 'endDate',
                        field: 'endDate',
                        operator: 'Lte',
                        value: new Date().toISOString().split('T')[0]
                      }
                    ]
                  }
                ],
                createdAt: new Date(),
              } as SavedQuery,
              {
                id: 'going_to_be_expired_timesheets',
                name: 'Ordini in scadenza (31 giorni)',
                groups: [
                  {
                    id: 'expired_timesheets_group',
                    logic: 'And',
                    filters: [
                      {
                        id: 'endDate',
                        field: 'endDate',

                        operator: 'Lte',
                        value: new Date(new Date().setDate(new Date().getDate() + 31)).toISOString().split('T')[0]
                      }
                    ]
                  }
                ],
                createdAt: new Date(),
              } as SavedQuery
            ]
          }
        } as dataRouteInfo,
      },
      {
        path: 'timesheets',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Timesheets',
          tableName: 'timesheets',
          entityName: 'timesheet',
          createForm: 'create-timesheet',
          updateForm: 'update-timesheet',
          allowSelection: true,
          baseFilters: () => ({
            month: {
              value: new Date().getMonth(),
              filterOperator: ComparisonOperator.Eq
            },
            year: {
              value: new Date().getFullYear(),
              filterOperator: ComparisonOperator.Eq
            }
          })
        } as dataRouteInfo,
        children: [
          {
            path: ':id',
            loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
            data: {
              title: (x) => {
                return x.timesheetService.getTimesheetById({
                  id: x.activatedRoute.snapshot.params['id'],
                  includes: 'user.roles.role,order.company,medias,workingDays'
                }).pipe(
                  tap(t => x.customData = {
                    ...t,
                    uuid: t.uuid!,
                  }),
                  map(x => `Stai visualizzando il timesheet di ${x.user?.firstName} ${x.user?.lastName} (${x.order?.company?.businessName})`)
                )
              },
              tableName: 'working-days',
              entityName: 'working-day',
              updateForm: 'update-working-day',
              baseFilters: (
                ctx: BaseEntityComponent
              ) => {
                return {
                  timesheetId: {
                    value: Number(ctx.activatedRoute.snapshot.params['id']),
                    filterOperator: ComparisonOperator.Eq
                  }
                }
              },
              baseSorting: (ctx: BaseEntityComponent) => {
                return [{
                  sortBy: 'day',
                  direction: 'Ascending'
                }]
              }
            } as dataRouteInfo
          },
        ]
      },
      {
        path: 'cvs',
        loadComponent: () => import('./cv-overview/cv-overview').then(x => x.CvOverview)
      },
      {
        path: 'invoices',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Invia proforma a Fatture in Cloud',
          tableName: 'invoices',
          entityName: 'invoice',
        } as dataRouteInfo
      },
      {
        path: 'client-configs',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Configurazioni Client',
          tableName: 'client-configs',
          entityName: 'client-config',
          createForm: 'create-client-config',
          updateForm: 'update-client-config',
          titleUpdatingItem: (row) => `Stai modificando la configurazione per ${row.client?.businessName}`,
          titleCreatingItem: 'Compila il form per creare una nuova configurazione',
        } as dataRouteInfo
      }
      ,
      {
        path: 'mail-templates',
        loadComponent: () => import('./base-entity/base-entity.component').then(x => x.BaseEntityComponent),
        data: {
          title: 'Configurazioni Email',
          tableName: 'mail-templates',
          entityName: 'mail-template',
          createForm: 'create-mail-template',
          updateForm: 'update-mail-template',
          titleUpdatingItem: (row) => `Stai modificando la configurazione per ${row.client?.businessName}`,
          titleCreatingItem: 'Compila il form per creare una nuova configurazione',
        } as dataRouteInfo
      },
      {
        path: 'current-consultants',
        loadComponent: () => import('./monthly-consultant-overview/monthly-consultant-overview').then(x => x.MonthlyConsultantOverview)
      },
      {
        path: 'password-manager',
        loadComponent: () => import('../password/list/list').then(x => x.List),
      },
      {
        path: 'credentials',
        loadComponent: () => import('../password-updater/password-updater').then(x => x.PasswordUpdater),
      },
      {
        path: 'cv-builder',
        loadComponent: () => import('./cv-builder/cv-builder.component').then(x => x.CvBuilderComponent),
      },
      {
        path: 'cv-builder/:id',
        loadComponent: () => import('./cv-builder/cv-builder.component').then(x => x.CvBuilderComponent),
        canDeactivate: [ (ctx: CvBuilderComponent) => {
          if (ctx.hasChanges()) {
            return confirm('Hai modifiche non salvate, sei sicuro di voler uscire?');
          }
          return true;  
        }]
      },
      {
        path: 'employees',
        loadComponent: () => EmployeesCosts
      },
      {
        path: 'expiring',
        loadComponent: () => Expiring
      }
    ]
  }
]
