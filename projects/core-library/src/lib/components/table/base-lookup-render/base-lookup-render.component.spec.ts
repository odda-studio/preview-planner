import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseLookupRenderComponent } from './base-lookup-render.component';

describe('BaseLookupRenderComponent', () => {
  let component: BaseLookupRenderComponent;
  let fixture: ComponentFixture<BaseLookupRenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLookupRenderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BaseLookupRenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
