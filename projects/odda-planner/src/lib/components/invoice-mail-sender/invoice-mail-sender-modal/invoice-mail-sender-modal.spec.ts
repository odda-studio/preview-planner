import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceMailSenderModal } from './invoice-mail-sender-modal';

describe('InvoiceMailSenderModal', () => {
  let component: InvoiceMailSenderModal;
  let fixture: ComponentFixture<InvoiceMailSenderModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceMailSenderModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceMailSenderModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
