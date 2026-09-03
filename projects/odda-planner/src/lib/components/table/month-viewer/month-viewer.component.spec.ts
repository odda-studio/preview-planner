import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthViewerComponent } from './month-viewer.component';

describe('MonthViewerComponent', () => {
  let component: MonthViewerComponent;
  let fixture: ComponentFixture<MonthViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthViewerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MonthViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
