import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimesheetHoursDetails } from './timesheet-hours-details';

describe('TimesheetHoursDetails', () => {
  let component: TimesheetHoursDetails;
  let fixture: ComponentFixture<TimesheetHoursDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimesheetHoursDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimesheetHoursDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
