import { Component, effect, ElementRef, inject, input, model, output, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { ExportComponent } from "../../export/export.component";
import { isPlatformBrowser } from '@angular/common';
import { Editor } from "tinymce";
import { FormControl, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { WINDOW } from 'core-library'
import { DomSanitizer } from '@angular/platform-browser';
import { InvoicesDataModel, InvoicesService, TimesheetService } from '../../../api';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

const initialValue = `

<p>Buongiorno {{client}},</p>
<p>Spero che questa mail vi trovi bene.</p>
<p>In allegato report e proforma relativi al mese di {{monthName}} {{consultant}}, attendo vostra approvazione per poter procedere con la fatturazione.</p>
<p>Rimaniamo a disposizione per qualsiasi esigenza, grazie, saluti&nbsp;</p>
<p><strong><em>Sara Castignani</em></strong><br><strong><span style="font-size: xx-small;"><em>Administration &amp; Operation Specialist</em></span></strong><br><br><strong><em>Odda </em></strong><br><span style="font-size: xx-small;">Talent Hub &bull; Digital Consulting</span><br><br><span style="font-size: xx-small;"><strong><em> Dimostriamo che il talento esiste e pu&ograve; essere ovunque! </em></strong></span><br><br><span style="font-size: xx-small;"> Addo s.r.l. </span><br><span style="font-size: xx-small;"> Sede legale: Via Caprini 9, Francavilla al Mare </span><br><span style="font-size: xx-small;"> Sede operativa: Via Salara Vecchia 5, Pescara </span><br><span style="font-size: xx-small;"> Sede operativa: Via Cassala 30, Milano (MI)</span><br><span style="font-size: xx-small;"> oddastudio.com </span><br><span style="font-size: xx-small;"> T &ndash; 3895665078 </span><br><br><span style="font-size: xx-small;"> Questo messaggio di posta elettronica contiene informazioni di carattere confidenziale rivolte esclusivamente al destinatario sopra indicato. E' vietato l'uso, la diffusione, distribuzione o riproduzione da parte di ogni altra persona. Nel caso aveste ricevuto questo messaggio di posta elettronica per errore, siete pregati di segnalarlo immediatamente al mittente e distruggere quanto ricevuto (compresi i file allegati) senza farne copia. Qualsivoglia utilizzo non autorizzato del contenuto di questo messaggio costituisce violazione dell'obbligo di non prendere cognizione della corrispondenza tra altri soggetti, salvo pi&ugrave; grave illecito, ed espone il responsabile alle relative conseguenze. </span></p>
`;

@Component({
  selector: 'lib-invoice-mail-sender-modal',
  imports: [ExportComponent, ReactiveFormsModule],
  templateUrl: './invoice-mail-sender-modal.html',
  styleUrl: './invoice-mail-sender-modal.scss',
})
export class InvoiceMailSenderModal {

  private readonly snackBar = inject(MatSnackBar);
  private readonly invoiceService = inject(InvoicesService);
  private readonly timesheetService = inject(TimesheetService);
  invoice = input.required<InvoicesDataModel>();

  private platform = inject(PLATFORM_ID)
  private readonly window = inject<Window & { tinymce: any }>(WINDOW)
  private readonly domSanitizer = inject(DomSanitizer);

  editor = viewChild.required<ElementRef>("editor");
  exporter = viewChild.required<ExportComponent>("exporter");
  private tiny: Editor[] = [];
  value = model<string | undefined>('');

  private static multiEmailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = (control.value as string).split(',').map(e => e.trim()).filter(e => e).some(e => !emailRegex.test(e));
    return invalid ? { invalidEmail: true } : null;
  }

  formControl = new FormControl('', { nonNullable: true });
  from = new FormControl('sara.ca@oddastudio.com', { nonNullable: true, validators: [Validators.required, InvoiceMailSenderModal.multiEmailValidator] });
  to = new FormControl('', { nonNullable: true, validators: [Validators.required, InvoiceMailSenderModal.multiEmailValidator] });
  cc = new FormControl('', { nonNullable: true, validators: [InvoiceMailSenderModal.multiEmailValidator] });
  bcc = new FormControl('', { nonNullable: true, validators: [InvoiceMailSenderModal.multiEmailValidator] });
  subject = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  get isFormValid(): boolean {
    return this.from.valid && this.to.valid && this.cc.valid && this.bcc.valid && this.subject.valid;
  }

  get clientName(): string {
    return this.invoice()?.company?.referent
      ?? (this.invoice() as any)?.user?.fullName
      ?? 'Cliente';
  }

  previewEmail = signal('')
  blobs = signal<Record<string, Record<number, Blob>>>({});

  attachments = signal<Array<{ name: string, blob: Blob, documentId?: number | null }>>([]);
  loading = signal(true)

  cache: Record<number, string> = {};
  skipDocuments: number[] = [];
  previewPdf(att: { name: string, blob: Blob, documentId?: number | null | undefined }) {
    if (att.documentId) {
      if (this.cache[att.documentId]) {
        window.open(this.cache[att.documentId], '_blank')
        return;
      }
      this.invoiceService.getProforma({ id: att.documentId }).subscribe((res) => {
        window.open(res.url, '_blank')
        this.cache[att.documentId!] = res.url;
      })
      return;
    }
    const url = URL.createObjectURL(att.blob);
    window.open(url, '_blank');
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  removeAttachment(att: { name: string, blob: Blob, documentId?: number | null }) {
    this.snackBar.open(`Vuoi rimuovere "${att.name}"?`, 'Conferma', {
      duration: 5000
    }).onAction().subscribe(() => {
      const currentAttachments = this.attachments();
      const filtered = currentAttachments.filter(a => a !== att);
      this.attachments.set(filtered);
      if(att.documentId) {
        this.skipDocuments.push(att.documentId);
      }
      this.snackBar.open('Allegato rimosso', undefined, { duration: 2000 });
    });
  }


  constructor() {

    effect(() => {
      const invoice = this.invoice();
      const exporter = this.exporter();
      if (!invoice || !exporter) return;

      const blobs = exporter.export(invoice.timesheets ?? [], false, 'none').then(blobs => {
        this.blobs.set(blobs);
        const files = Object.entries(blobs[invoice.company!.id!]);
        const result = files.flatMap(x => {
          const [tId, blob] = x;
          const timesheet = invoice.timesheets!.find(x => x.id! == Number(tId));
          const baseName = `${timesheet?.user?.fullName ?? 'Unknown'}_${timesheet?.month}_${timesheet?.year}.pdf`;
          const entries: Array<{ name: string, blob: Blob, documentId?: number | null }> = [
            { name: `Timesheet_${baseName}`, blob, documentId: null }
          ];
          if (timesheet?.documentId) {
            entries.push({ name: `Proforma_${baseName}`, blob: new Blob([], { type: 'application/pdf' }), documentId: timesheet.documentId });
          }
          return entries;
        })
        this.attachments.set(result);
        this.loading.set(false);
      })
    });
    effect(() => {
      const invoice = this.invoice();
      if (!invoice) return;

      this.to.setValue(invoice.company?.email ?? (invoice as any)?.user?.email ?? '');
      this.cc.setValue('amministrazione@oddastudio.com,sara.ca@oddastudio.com');

      const of = invoice.timesheets?.length! > 1 ? 'relativi' : 'relativo';
      const monthName = new Date(invoice.year!, invoice.month!).toLocaleString('it-IT', { month: 'long' });
      const consultant = invoice.timesheets?.length! > 1 ? 'dei consulenti' : 'del consulente ' + (invoice.timesheets?.[0].user?.fullName ?? 'del consulente');
      const client = this.clientName;
      if (isPlatformBrowser(this.platform)) {
        const editor = this.editor();
        if (editor) {
          import('tinymce').then(() => {

            setTimeout(() => {
              this.window.tinymce.init({
                target: editor.nativeElement,
                height: 512,
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
                this.tiny.at(0)?.setContent(initialValue.replace('{{monthName}}', monthName).replace('{{consultant}}', consultant).replace('{{client}}', client).replace('{{of}}', of));
                this.tiny.at(0)?.on('change', () => {
                  const content = this.tiny.at(0)?.getContent();
                  this.value.set(content);
                  this.formControl.setValue(content as string);
                  this.previewEmail.set(this.domSanitizer.bypassSecurityTrustHtml(content as string) as string);
                  console.log('Content changed:', content);
                })
              });
            }, 400)

          })
        }
      }

    });
  }


  close() {
    // chiusura gestita dal parent tramite sidenav
  }

  sendInvoice() {
    [this.from, this.to, this.cc, this.bcc, this.subject].forEach(c => c.markAsTouched());
    if (!this.isFormValid) {
      this.snackBar.open('Correggi i campi evidenziati prima di inviare', undefined, { duration: 3000 });
      return;
    }
    this.snackBar.open('Confermi di voler inviare le fatture al cliente', 'Conferma', {
      duration: 10000,
      panelClass: 'success-snack'
    }).onAction().subscribe(() => {
      this.timesheetService.sendInvoiceByEmail({
        companyId: this.invoice()!.company?.id!,
        from: this.from.value,
        files: this.attachments().filter(x => !x.documentId).map(x => new File([x.blob], x.name, { type: x.blob.type })),
        to: this.to.value,
        cc: this.cc.value,
        bcc: this.bcc.value,
        template: this.tiny.at(0)?.getContent() as string,
        year: this.invoice()!.year!,
        month: this.invoice()!.month!,
        subject: this.subject.value,
        skipDocuments: this.skipDocuments
      })
      .pipe(catchError(err => {
        this.snackBar.open('Errore durante l\'invio della mail', undefined, { duration: 3000, panelClass: 'error-snack' });
        return throwError(() => err);
      }))
      .subscribe(() => { 
        this.snackBar.open('Fattura inviata con successo', undefined, { duration: 3000 });
      })
    })
  }
}