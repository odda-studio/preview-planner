import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseLookupInputComponent } from './base-lookup-input.component';

describe('BaseLookupInputComponent', () => {
  let component: BaseLookupInputComponent;
  let fixture: ComponentFixture<BaseLookupInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLookupInputComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BaseLookupInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
