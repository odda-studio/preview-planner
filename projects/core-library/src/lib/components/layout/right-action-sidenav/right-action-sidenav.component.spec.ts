import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightActionSidenavComponent } from './right-action-sidenav.component';

describe('RightActionSidenavComponent', () => {
  let component: RightActionSidenavComponent;
  let fixture: ComponentFixture<RightActionSidenavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightActionSidenavComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RightActionSidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
