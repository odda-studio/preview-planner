import { Component, input, computed, inject, signal } from '@angular/core';
import { DataTableComponent, RightActionSidenavComponent } from 'core-library';
import { InvoicesDataModel, UiFieldMetadata, UiTableColumnMetadata } from '../../api';
import { InvoiceMailSenderModal } from './invoice-mail-sender-modal/invoice-mail-sender-modal';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'lib-invoice-mail-sender',
  imports: [RightActionSidenavComponent, InvoiceMailSenderModal, DatePipe],
  templateUrl: './invoice-mail-sender.html',
  styleUrl: './invoice-mail-sender.scss',
})
export class InvoiceMailSender {
  field = input.required<UiFieldMetadata>();
  tableField = input.required<UiTableColumnMetadata>();
  textValue = computed(() => "")
  context = input.required<InvoicesDataModel>();
  value = input.required<string>();
  componentContext = input.required<DataTableComponent<InvoicesDataModel>>();

  show = signal(false);
  showEmailsList = signal(false);

  hasEmailsSent = computed(() => {
    const emails = this.context()?.emails;
    return emails && emails.length > 0 && emails.some(e => e.sent);
  });

  hasEmails = computed(() => {
    const emails = this.context()?.emails;
    return emails && emails.length > 0;
  });

  openDialog() {
    this.show.set(true);
  }

  openEmailsList() {
    this.showEmailsList.set(true);
  }
}
