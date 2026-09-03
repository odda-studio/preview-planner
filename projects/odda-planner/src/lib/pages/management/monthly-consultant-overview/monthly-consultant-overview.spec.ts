import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyConsultantOverview } from './monthly-consultant-overview';

describe('MonthlyConsultantOverview', () => {
  let component: MonthlyConsultantOverview;
  let fixture: ComponentFixture<MonthlyConsultantOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyConsultantOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyConsultantOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
