import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestPasswordChangeComponent } from './request-password-change.component';

describe('RequestPasswordChangeComponent', () => {
  let component: RequestPasswordChangeComponent;
  let fixture: ComponentFixture<RequestPasswordChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestPasswordChangeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RequestPasswordChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
