import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoditComponent } from './jodit.component';

describe('JoditComponent', () => {
  let component: JoditComponent;
  let fixture: ComponentFixture<JoditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoditComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JoditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
