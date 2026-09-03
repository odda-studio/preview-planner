import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseColumnRenderComponent } from './base-column-render.component';

describe('BaseColumnRenderComponent', () => {
  let component: BaseColumnRenderComponent;
  let fixture: ComponentFixture<BaseColumnRenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseColumnRenderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BaseColumnRenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
