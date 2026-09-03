import {ApplicationConfig, importProvidersFrom} from '@angular/core';
import {ApiModule, Configuration, FormKind, UserService, WebApiPlannerService} from './api';
import {
  BaseLookupInputComponent,
  BaseLookupRenderComponent,
  configureBaseCrudAdmin,
  configureBaseCrudAdminGetMetadata,
  JoditComponent,
  MonacoEditorFormComponent,
  provideFormComponents,
  provideSubmitForm,
  provideTableComponents,
  UiResourceMetadata
} from 'core-library'
import {catchError, map, Observable, of, throwError} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FormGroup} from '@angular/forms';
import {MonthViewerComponent} from './components/table/month-viewer/month-viewer.component';
import { FattureInCloudGenerator } from './components/table/fatture-in-cloud-generator/fatture-in-cloud-generator';
import { FattureInCloudDownloader } from './components/table/fatture-in-cloud-downloader/fatture-in-cloud-downloader';
import { TimesheetHoursDetailsColumn } from './components/timesheet-hours-details/timesheet-hours-details';
import { InvoiceMailSender } from './components/invoice-mail-sender/invoice-mail-sender';


export const plannerAppConfig: ApplicationConfig = {
  providers: [
    provideTableComponents({
      lookup: BaseLookupRenderComponent,
      monthViewer: MonthViewerComponent,
      proformaGenerator: FattureInCloudGenerator,
      'fatture-incloud-document': FattureInCloudDownloader,
      'timesheet-details': TimesheetHoursDetailsColumn,
      invoiceMailSender: InvoiceMailSender
    }),
    provideFormComponents({
      lookup: BaseLookupInputComponent,
      wysiwyg: JoditComponent,
      monaco: MonacoEditorFormComponent
    }),
    configureBaseCrudAdminGetMetadata((api: WebApiPlannerService) => {
      return (name: string) => {
        return api.getMetadataByName({name}).pipe(map((metadata) => {
          return {
            ...metadata,
          } as UiResourceMetadata
        }));
      }
    }, [WebApiPlannerService]),
    {
      provide: 'BASE_CRUD_ADMIN_PATH',
      useValue: ''
    },
    configureBaseCrudAdmin((userService: UserService, httpClient: HttpClient) => {
      return (entity, search) => {
        if (entity.name === 'user')
          return userService.usersSearchPost({
            page: search.page || 1,
            pageSize: search.pageSize,
            includes: "roles,paymentTerms",
            paginatedRequestDto: {
              filters: !!search.filters?.children?.length ? search.filters : undefined,
              sorting: search.sorting,
            }
          }).pipe(map((data) => {
            return {
              data: data.items ?? [],
              totalCount: data.totalCount!
            }
          }))

        return httpClient.post<{ items: [], totalCount: number }>('/' + entity.api! + '/search',
          {
            filters: !!search.filters?.children?.length ? search.filters : undefined,
            sorting: search.sorting,
          }
          , {
          params: {
            search: search.query || '',
            page: search.page || 1,
            pageSize: search.pageSize,
            includes: search.includes?.join(',') || '',
            query: search.query || ''
          }
        }).pipe(map((data) => {
          if(entity.name === 'talent') {
            return {
              data: (data as any).data,
              totalCount: 1000
            }
          }
          return {
            data: data.items,
            totalCount: data.totalCount
          }
        }))
      }
    }, [UserService, HttpClient]),
    provideSubmitForm(
      (httpClient: HttpClient, snackBar: MatSnackBar) => {
        return (met, jsonForm, formGroup, kind, data, id) => {
          if (met.enablePost && kind === FormKind.Post && formGroup instanceof FormGroup) {
            return httpClient
              .post<any>('/' + met.postApi!, data).pipe(
                catchError(x => {
                  if(x.error.formErrors) {
                    for(const [key, value] of Object.entries(x.error.formErrors)) {
                      formGroup.controls[key].setErrors({
                        __error: value
                      })
                    }
                  }
                  return throwError(() => x)
                })
              )
          }
          if (met.enablePatch && kind === FormKind.Patch && formGroup instanceof FormGroup) {
            return httpClient
              .patch<any>('/' + met.patchApi! + '/' + id, data).pipe(
                catchError(x => {
                  if(x.error.formErrors) {
                    for(const [key, value] of Object.entries(x.error.formErrors)) {
                      formGroup.controls[key].setErrors({
                        __error: value
                      })
                    }
                  }
                  return throwError(() => x)
                })
              )
          }
          if(met.enableDelete && kind === FormKind.Delete){
            return new Observable((observer) => {
              const snackBarRef = snackBar.open('Confermi la cancellazione?', 'Conferma', {
                duration: 10000,
                panelClass: 'error-snack'
              });

              let confirmed = false;

              snackBarRef.onAction().subscribe(() => {
                confirmed = true;
                httpClient
                  .delete<any>('/' + (met.deleteApi ?? met.api) + '/' + id)
                  .subscribe({
                    next: (result) => {
                      snackBar.open('Elemento eliminato con successo', 'Chiudi', {
                        duration: 3000,
                        panelClass: 'success-snack'
                      });
                      observer.next(result);
                      observer.complete();
                    },
                    error: (err) => {
                      snackBar.open('Errore durante l\'eliminazione', 'Chiudi', {
                        duration: 3000,
                        panelClass: 'error-snack'
                      });
                      observer.error(err);
                    }
                  });
              });

              snackBarRef.afterDismissed().subscribe(() => {
                if (!confirmed) {
                  observer.next(undefined as any);
                  observer.complete();
                }
              });
            });
          }
          return of()
        }
      }, [HttpClient, MatSnackBar]
    ),
    importProvidersFrom(
      ApiModule.forRoot(() => {
        return new Configuration({
          basePath: ''
        });
      })
    )
  ]
}
