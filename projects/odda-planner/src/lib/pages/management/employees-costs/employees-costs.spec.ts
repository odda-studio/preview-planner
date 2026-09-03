import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeesCosts } from './employees-costs';

describe('EmployeesCosts', () => {
  let component: EmployeesCosts;
  let fixture: ComponentFixture<EmployeesCosts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeesCosts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeesCosts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
