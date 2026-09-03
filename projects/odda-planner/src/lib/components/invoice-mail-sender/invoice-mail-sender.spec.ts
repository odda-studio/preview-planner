import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceMailSender } from './invoice-mail-sender';

describe('InvoiceMailSender', () => {
  let component: InvoiceMailSender;
  let fixture: ComponentFixture<InvoiceMailSender>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceMailSender]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceMailSender);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
