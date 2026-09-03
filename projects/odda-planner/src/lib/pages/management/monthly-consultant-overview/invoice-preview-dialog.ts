import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface InvoicePreviewData {
  xmlContent: string;
  fileName: string;
}

@Component({
  selector: 'lib-invoice-preview-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <div class="invoice-preview-dialog">
      <h2 mat-dialog-title class="text-xl font-bold border-b pb-3 mb-4">
        Preview Fattura
        <button 
          (click)="downloadXml()" 
          class="float-right px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          title="Scarica XML">
          <svg xmlns="http://www.w3.org/2000/svg" class="inline-block w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Scarica XML
        </button>
      </h2>
      <mat-dialog-content class="overflow-auto max-h-[70vh]">
        <div [innerHTML]="htmlContent" class="invoice-content"></div>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="border-t pt-3 mt-4">
        <button 
          mat-button 
          (click)="close()"
          class="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
          Chiudi
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .invoice-preview-dialog {
      min-width: 800px;
      max-width: 90vw;
    }

    ::ng-deep .invoice-content {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    ::ng-deep .invoice-content .xml-element {
      margin-left: 20px;
      margin-bottom: 8px;
    }

    ::ng-deep .invoice-content .xml-tag {
      color: #1e40af;
      font-weight: 600;
    }

    ::ng-deep .invoice-content .xml-value {
      color: #047857;
      margin-left: 8px;
    }

    ::ng-deep .invoice-content .xml-attribute {
      color: #9333ea;
    }

    ::ng-deep .invoice-content .section-header {
      background: #dbeafe;
      padding: 8px 12px;
      margin: 12px 0 8px 0;
      border-left: 4px solid #2563eb;
      font-weight: bold;
      color: #1e40af;
      border-radius: 4px;
    }

    ::ng-deep .invoice-content .key-value {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 12px;
      padding: 6px 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    ::ng-deep .invoice-content .key-value:hover {
      background: #f3f4f6;
    }

    ::ng-deep .invoice-content .key {
      font-weight: 600;
      color: #374151;
    }

    ::ng-deep .invoice-content .value {
      color: #1f2937;
    }

    ::ng-deep .invoice-content .group {
      background: white;
      padding: 16px;
      margin: 12px 0;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
  `]
})
export class InvoicePreviewDialogComponent {
  private dialogRef = inject(MatDialogRef<InvoicePreviewDialogComponent>);
  private sanitizer = inject(DomSanitizer);
  data = inject<InvoicePreviewData>(MAT_DIALOG_DATA);

  htmlContent: SafeHtml;

  constructor() {
    this.htmlContent = this.sanitizer.bypassSecurityTrustHtml(
      this.xmlToHtml(this.data.xmlContent)
    );
  }

  close() {
    this.dialogRef.close();
  }

  downloadXml() {
    const blob = new Blob([this.data.xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.data.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private xmlToHtml(xml: string): string {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');

    // Mappa per tradurre i tag XML in nomi leggibili
    const tagNames: Record<string, string> = {
      'FatturaElettronica': 'Fattura Elettronica',
      'FatturaElettronicaHeader': 'Intestazione',
      'DatiTrasmissione': 'Dati Trasmissione',
      'IdTrasmittente': 'ID Trasmittente',
      'IdPaese': 'Paese',
      'IdCodice': 'Codice',
      'ProgressivoInvio': 'Progressivo Invio',
      'FormatoTrasmissione': 'Formato Trasmissione',
      'CodiceDestinatario': 'Codice Destinatario',
      'CedentePrestatore': 'Cedente/Prestatore',
      'DatiAnagrafici': 'Dati Anagrafici',
      'IdFiscaleIVA': 'Partita IVA',
      'CodiceFiscale': 'Codice Fiscale',
      'Anagrafica': 'Anagrafica',
      'Denominazione': 'Denominazione',
      'Nome': 'Nome',
      'Cognome': 'Cognome',
      'RegimeFiscale': 'Regime Fiscale',
      'Sede': 'Sede',
      'Indirizzo': 'Indirizzo',
      'NumeroCivico': 'Numero Civico',
      'CAP': 'CAP',
      'Comune': 'Comune',
      'Provincia': 'Provincia',
      'Nazione': 'Nazione',
      'CessionarioCommittente': 'Cessionario/Committente',
      'FatturaElettronicaBody': 'Corpo Fattura',
      'DatiGenerali': 'Dati Generali',
      'DatiGeneraliDocumento': 'Dati Generali Documento',
      'TipoDocumento': 'Tipo Documento',
      'Divisa': 'Divisa',
      'Data': 'Data',
      'Numero': 'Numero',
      'ImportoTotaleDocumento': 'Importo Totale',
      'Causale': 'Causale',
      'DatiBeniServizi': 'Beni e Servizi',
      'DettaglioLinee': 'Dettaglio Linee',
      'NumeroLinea': 'N. Linea',
      'Descrizione': 'Descrizione',
      'Quantita': 'Quantità',
      'PrezzoUnitario': 'Prezzo Unitario',
      'PrezzoTotale': 'Prezzo Totale',
      'AliquotaIVA': 'Aliquota IVA',
      'DatiRiepilogo': 'Riepilogo IVA',
      'ImponibileImporto': 'Imponibile',
      'Imposta': 'Imposta',
      'DatiPagamento': 'Dati Pagamento',
      'CondizioniPagamento': 'Condizioni Pagamento',
      'DettaglioPagamento': 'Dettaglio Pagamento',
      'ModalitaPagamento': 'Modalità Pagamento',
      'ImportoPagamento': 'Importo Pagamento',
      'DataScadenzaPagamento': 'Data Scadenza',
      'IstitutoFinanziario': 'Istituto Finanziario',
      'IBAN': 'IBAN',
      'BIC': 'BIC'
    };

    let html = '<div class="xml-preview">';

    const processNode = (node: Element, level: number = 0): string => {
      let result = '';
      const tagName = node.tagName;
      const displayName = tagNames[tagName] || tagName;

      // Se ha solo testo, mostra in formato chiave-valore
      if (node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE) {
        const value = node.textContent?.trim() || '';
        if (value) {
          result += `<div class="key-value">
            <span class="key">${displayName}:</span>
            <span class="value">${value}</span>
          </div>`;
        }
      } else if (node.children.length > 0) {
        // Ha figli, crea una sezione
        if (level === 0 || level === 1) {
          result += `<div class="section-header">${displayName}</div>`;
          result += '<div class="group">';
        } else {
          result += `<div class="group">
            <div style="font-weight: 600; margin-bottom: 8px; color: #4b5563;">${displayName}</div>`;
        }

        Array.from(node.children).forEach(child => {
          result += processNode(child as Element, level + 1);
        });

        result += '</div>';
      }

      return result;
    };

    const root = xmlDoc.documentElement;
    if (root) {
      html += processNode(root);
    }

    html += '</div>';
    return html;
  }
}
