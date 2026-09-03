import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

interface FaqItem {
  question: string;
  answer: string;
  isHtml?: boolean;
}

@Component({
  selector: 'lib-faq',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule, MatCardModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  faqs: FaqItem[] = [
    {
      question: "Cos'è l'OdA e perché è importante?",
      answer: "L'OdA (Ordine d'Acquisto) è il documento che formalizza il tuo ingaggio e ha valore contrattuale a tutti gli effetti. Contiene la tua tariffa giornaliera, le date di inizio e fine incarico e il nome del tuo referente. Conservalo con cura insieme a tutta la documentazione ricevuta."
    },
    {
      question: "Cos'è il timesheet e come si compila?",
      answer: "Il timesheet è la scheda giornaliera in cui registri le ore lavorate, disponibile direttamente sul planner. Compilalo ogni giorno, ma <strong>non confermare il modulo giornalmente</strong>: confermalo solo a fine mese, quando avrai inserito tutte le ore. Una conferma anticipata chiuderebbe il calendario impedendo qualsiasi modifica successiva.",
      isHtml: true
    },
    {
      question: "Come viene calcolata la mia fattura?",
      answer: "A fine mese, moltiplichi il totale delle ore lavorate (risultanti dal timesheet) per la tua tariffa oraria. Il risultato è l'importo da riportare in fattura."
    },
    {
      question: "Posso fare straordinari o trasferte senza autorizzazione?",
      answer: "No. Qualsiasi ora aggiuntiva rispetto a quelle ordinarie (straordinari feriali, festivi o ordinari), trasferte o attività fuori dal normale perimetro di progetto devono essere <strong>preventivamente approvate prima da Odda e poi dal cliente</strong>. Questo vale anche in caso di richieste urgenti del cliente. Le ore non approvate in anticipo potrebbero non essere riconosciute e quindi non pagate.",
      isHtml: true
    },
    {
      question: "Devo fare un report delle attività giornaliere?",
      answer: "Non sempre, ma è fortemente consigliato. Alcuni clienti richiedono a fine mese un report dettagliato delle attività svolte giorno per giorno. Annotare quotidianamente cosa hai fatto ti eviterà di dimenticare i dettagli delle prime giornate quando arriverà il momento di redigere il report."
    },
    {
      question: "Come funziona il processo di approvazione del timesheet e della fattura?",
      answer: `Il flusso si svolge in questi passaggi:
<ol class="py-3 pl-4">
<li>1. L'ultimo giorno lavorativo del mese viene chiuso il timesheet.</li>
<li>2. Odda lo trasmette al cliente per l'approvazione delle ore.</li>
<li>3. Il cliente approva le ore, poi Odda le approva a sua volta.</li>
<li>4. Puoi quindi emettere la fattura.</li>
</ol>
<p>Dalla trasmissione del timesheet all'approvazione della proforma possono trascorrere diversi giorni, fino circa a metà del mese successivo.</p>`,
      isHtml: true
    },
    {
      question: "Processo di fatturazione",
      answer: "A fine mese, dopo aver inviato il timesheet, è necessario caricare la fattura proforma direttamente sul planner: troverete il tasto apposito (icona a forma di nuvoletta) nella sezione superiore del timesheet.<br><br>Una volta ricevuto il benestare dal cliente, Odda approverà le ore e riceverete una mail di conferma con l'autorizzazione a procedere con la fatturazione definitiva.<br><br>La proforma è una bozza di fattura non ancora trasmessa al Sistema di Interscambio (SDI): questo passaggio consente di correggere eventuali errori su ore o tariffe in modo semplice e senza conseguenze.",
      isHtml: true
    },
    {
      question: "Quando vengo pagato?",
      answer: "Il pagamento avviene nei tempi indicati nell'accordo quadro, calcolati a partire dalla presa visione della proforma da parte di Odda, non dalla data di emissione della fattura definitiva."
    },
    {
      question: 'Cosa devo scrivere nella descrizione della fattura?',
      answer: '<i class="font-bold">"Consulenza IT - MM/YY - rate oraria"</i>, esempio "Consulenza IT - '+ (new Date().getMonth() + 1).toString().padStart(2, '0')+ '/' + new Date().getFullYear().toString().substring(2) + ' - 50€/h"<br /> Inserire quindi, dicitura <i>"Consulenza IT, mese e anno di riferimento di lavoro e costo orario"</i>',
      isHtml: true
    },
    {
      question: "Quali sono i dati per la fatturazione?",
      answer: `<ul>
<li><strong>Ragione sociale:</strong> ADDO srl</li>
<li><strong>Indirizzo:</strong> Via Caprini 9, 66023 Francavilla al Mare (CH)</li>
<li><strong>P. IVA:</strong> 02570300695</li>
<li><strong>Codice SDI:</strong> M5UXCR1</li>
</ul>`,
      isHtml: true
    },
    {
      question: "A chi mi rivolgo in caso di problemi?",
      answer: "Per qualsiasi problema con il cliente contatta il team Odda. Per questioni amministrative scrivi a <strong>report@oddastudio.com</strong>, oppure <strong>amministrazione@oddastudio.com</strong>",
      isHtml: true
    }
  ];
}
