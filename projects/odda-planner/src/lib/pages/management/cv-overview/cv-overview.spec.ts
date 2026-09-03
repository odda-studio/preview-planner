import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CvOverview } from './cv-overview';

describe('CvOverview', () => {
  let component: CvOverview;
  let fixture: ComponentFixture<CvOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CvOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CvOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
