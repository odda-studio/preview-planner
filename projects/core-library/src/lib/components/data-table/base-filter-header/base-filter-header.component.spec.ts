import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseFilterHeaderComponent } from './base-filter-header.component';

describe('BaseFilterHeaderComponent', () => {
  let component: BaseFilterHeaderComponent;
  let fixture: ComponentFixture<BaseFilterHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseFilterHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseFilterHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle menu visibility', () => {
    expect(component.isMenuOpen()).toBe(false);
    component.toggleMenu();
    expect(component.isMenuOpen()).toBe(true);
    component.toggleMenu();
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should select an operation', () => {
    component.selectOperation(component.filterOperations()[1].operator);
    expect(component.filterOperator()).toBe(component.filterOperations()[1].operator);
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should clear filter value', () => {
    component.filterValue.set('test value');
    component.clearFilter();
    expect(component.filterValue()).toBe('');
  });

  it('should compute current operation correctly', () => {
    const operation = component.currentOperation();
    expect(operation?.operator).toBe(component.filterOperator());
  });
});

