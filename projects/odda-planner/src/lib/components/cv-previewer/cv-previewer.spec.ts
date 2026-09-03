import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CvPreviewer } from './cv-previewer';

describe('CvPreviewer', () => {
  let component: CvPreviewer;
  let fixture: ComponentFixture<CvPreviewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CvPreviewer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CvPreviewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
