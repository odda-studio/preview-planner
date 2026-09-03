import { Component, computed, effect, ElementRef, inject, input, InputSignal, model, PLATFORM_ID, Signal, TemplateRef, viewChild } from '@angular/core';
import { isPlatformBrowser } from "@angular/common";
import { Editor } from "tinymce";
import { WINDOW } from '../../../tokens/window.token';
import { DataTableComponent } from '../../data-table/data-table.component';
import { UiTableColumnMetadata } from '../../../base-crud-admin/models/model/uiTableColumnMetadata';
import { IBaseFormInputComponent } from '../base-form-input/base-form-input.component';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiFormFieldWithField } from '../json-forms/json-forms.component';
import { UiResourceMetadata } from '../../../base-crud-admin/models/model/uiResourceMetadata';
import { UiResourceRefMetadata } from '../../../base-crud-admin/models/model/uiResourceRefMetadata';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { MatFormField, MatInput, MatLabel } from "@angular/material/input";
import { MatIcon } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

export const defaultTextValue = `

<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Planner | Odda</title>
</head>
<body style="margin:0; padding:0; min-width:100%; background-color:#f4f7fb;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Comunicazione importante dalla tua piattaforma.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; width:100%; background-color:#f4f7fb; margin:0; padding:0;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="border-collapse:collapse; width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e5e7eb;">
                <tr>
                    <td align="center" style="padding:32px 24px 16px 24px; background-color:white;">
                        <div style="font-family:Arial, Helvetica, sans-serif; font-size:24px; line-height:32px; font-weight:bold;">
                            <img style="width: 200px" src="https://planner.oddacoding.net/logo_odda.png">
                        </div>
                    </td>
                </tr>

                <tr>
                    <td style="padding:32px 24px 8px 24px; font-family:Arial, Helvetica, sans-serif; color:#111827;">
                        <div style="font-size:24px; line-height:32px; font-weight:bold; margin:0 0 12px 0;">
                            Ciao {{name}},
                        </div>
                        <div style="font-size:16px; line-height:24px; color:#374151; margin:0 0 16px 0;">
                            Abbiamo ricevuto una richiesta per il cambio della password del tuo account. Se non hai effettuato questa richiesta, puoi ignorare questa email. Altrimenti, clicca sul pulsante qui sotto per reimpostare la tua password.
                        </div>
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px 24px 24px 24px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
                            <tr>
                                <td align="center" bgcolor="#2563eb" style="border-radius:6px;">
                                    <a href="{{cta_url}}" target="_blank" style="display:inline-block; padding:14px 24px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:20px; font-weight:bold; color:#ffffff; text-decoration:none; background-color:black;">
                                        {{cta_label}}
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding:0 24px 24px 24px; font-family:Arial, Helvetica, sans-serif; color:#374151;">
                        <div style="font-size:14px; line-height:22px; margin:0 0 12px 0;">
                            Se hai bisogno di supporto o desideri maggiori informazioni, puoi contattarci tramite email a 
                            <a style="color: black;font-weight: 700;" href="mailto:support@oddastudio.com">support</a> oppure ad <a style="color: black;font-weight: 700;" href="mailto:amministrazione@oddastudio.com">amministrazione</a> .
                        </div>
                        <div style="font-size:16px; line-height:24px; margin:0;">
                            Grazie,<br />
                            <strong>Il team di Odda.</strong>
                        </div>
                    </td>
                </tr>

                <tr>
                    <td style="padding:20px 24px; background-color:#f9fafb; border-top:1px solid #e5e7eb; font-family:Arial, Helvetica, sans-serif; color:#6b7280; font-size:12px; line-height:18px;">
                        <div style="margin:0 0 12px 0;">
                            Hai ricevuto questa email perché fai parte del team Odda.
                        </div>
                        
                        <div style="margin:0 0 16px 0;">
                            Seguici anche su <a style="color: black;font-weight: 700;" href="https://www.linkedin.com/company/oddastudio/">LinkedIn</a> e <a style="color: black;font-weight: 700;" href="https://www.instagram.com/oddastudio/">Instagram</a> per rimanere aggiornato su tutte le novità e i progetti di Odda.
                        </div>
                        <div style="margin:0 0 16px 0; color: black;">
                            Oppure visita il nostro sito <a style="color: black; font-weight: 700" href="https://www.oddastudio.com">Oddastudio</a>
                        </div>
                        
                        <div style="border-top:1px solid #e5e7eb; padding-top:16px; margin-top:16px;">
                            <div style="font-weight:bold; color:#111827; margin:0 0 8px 0;">
                                Oddastudio S.r.l.
                            </div>
                            <div style="margin:0 0 4px 0;">
                                Via Example, 123 - 00000 Roma (RM), Italia
                            </div>
                            <div style="margin:0 0 4px 0;">
                                P.IVA: IT00000000000
                            </div>
                            <div style="margin:0 0 4px 0;">
                                Tel: +39 00 0000 0000
                            </div>
                            <div style="margin:0 0 4px 0;">
                                Email: <a style="color: #2563eb; text-decoration:none;" href="mailto:info@oddastudio.com">info@oddastudio.com</a>
                            </div>
                            <div style="margin:0 0 4px 0;">
                                PEC: <a style="color: #2563eb; text-decoration:none;" href="mailto:oddastudio@pec.it">oddastudio@pec.it</a>
                            </div>
                            <div style="margin:12px 0 0 0;">
                                © 2026 Oddastudio. Tutti i diritti riservati.
                            </div>
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
`

@Component({
  selector: 'lib-jodit',
  standalone: true,
  imports: [MatFormField, MatLabel, ReactiveFormsModule, MatInput, MatIcon, MatTooltipModule],
  templateUrl: './jodit.component.html',
  styleUrl: './jodit.component.scss'
})
export class JoditComponent implements IBaseFormInputComponent<any, string | undefined> {

  private readonly httpClient = inject(HttpClient)
  private readonly dialog = inject(MatDialog);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly snackBar = inject(MatSnackBar);
  editor = viewChild.required<ElementRef>("editor");
  modalPreview = viewChild.required<TemplateRef<HTMLDivElement>>("modalPreview");
  private jodit: any;
  private platform = inject(PLATFORM_ID)
  private tiny: Editor[] = [];
  window = inject<Window & { tinymce: any }>(WINDOW)
  previewEmail = model<string>('');
  emailFormControl = new FormControl('', [Validators.required, (control: AbstractControl) => {
    const email = control.value;
    if (!email) return null;
    const emails = email.split(',').map((e: string) => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmail = emails.some((e: string) => !emailRegex.test(e));
    return invalidEmail ? { invalidEmail: true } : null;
  }]);

  hasPreview = computed(() => {
    const value = this.context();
    return value?.__identifier;
  })
  value = model<string | undefined>(defaultTextValue);

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platform)) {
        const editor = this.editor();
        if (editor) {
          import('tinymce').then(() => {

            setTimeout(() => {
              this.window.tinymce.init({
                target: editor.nativeElement,
                height: 700,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                license_key: 'gpl',
                promotion: false,
                menubar: true,
                toolbar: 'undo redo | blocks | ' +
                  'bold italic backcolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'removeformat | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
                contextmenu: false
              }).then((x: Editor[]) => {
                this.tiny = x;
                this.tiny.at(0)?.setContent(this.formControl().value ?? defaultTextValue);
                this.tiny.at(0)?.on('change', () => {
                  const content = this.tiny.at(0)?.getContent();
                  this.value.set(content);
                  this.formControl().setValue(content);
                  console.log('Content changed:', content);
                })
              });
            }, 400)

          })
        }
      }

    });
  }
  formControl = input.required<FormControl<any>>();
  formGroup = input.required<FormGroup<any>>();
  formField = input.required<UiFormFieldWithField>();
  entityMetadata = input.required<UiResourceMetadata | UiResourceRefMetadata>();
  textValue = computed(() => { return '' })
  tableField = input.required<UiTableColumnMetadata>();
  context = input.required<any>();
  componentContext = input.required<DataTableComponent<any>>();

  showPreviewFull() {

    this.dialog.open(this.modalPreview(), {
      maxHeight: '90vh',
      width: '1366px',
      maxWidth: '100%',
      panelClass: 'full-screen-dialog'
    });
    this.httpClient.post('/email/preview', {
      to: 'simonge',
      subject: 'Test email',
      key: this.formGroup().get('key')?.value,
      templateData: this.formGroup().get('templateDataTest')?.value
    }).subscribe({
      next: (d) => {
        this.previewEmail.set(this.domSanitizer.bypassSecurityTrustHtml(d as string) as string);
      },
      error: (error) => {
        this.snackBar.open(
          'Errore durante il caricamento dell\'anteprima',
          'Chiudi',
          { duration: 3000, panelClass: ['error-snack'] }
        );
        console.error('Errore preview email:', error);
      }
    })
  }

  sendTestEmail() {
    this.httpClient.post('/email/test', {
      to: this.emailFormControl.value,
      subject: 'Test email',
      key: this.formGroup().get('key')?.value,
      templateData: this.formGroup().get('templateDataTest')?.value
    }).subscribe({
      next: () => {
        this.snackBar.open(
          'Email di test inviata con successo',
          'Chiudi',
          { duration: 3000, panelClass: ['success-snack'] }
        );
      },
      error: (error) => {
        this.snackBar.open(
          'Errore durante l\'invio dell\'email di test',
          'Chiudi',
          { duration: 3000, panelClass: ['error-snack'] }
        );
        console.error('Errore invio email test:', error);
      }
    })
  }
}
