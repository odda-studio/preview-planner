import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent } from './data-table.component';
import { TABLE_COMPONENT } from '../../provides/provide-table-data';
import { WINDOW } from '../../tokens/window.token';

describe('DataTableComponent', () => {
  let component: DataTableComponent<any>;
  let fixture: ComponentFixture<DataTableComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [
        {
          provide: TABLE_COMPONENT,
          useValue: {}
        },
        {
          provide: WINDOW,
          useValue: {
            innerWidth: 1024,
            innerHeight: 768
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataTableComponent);
    component = fixture.componentInstance;

    // Mock required inputs
    component.metadata.set({
      name: 'test',
      fields: {},
      tables: {
        default: {
          tableName: 'default',
          columns: {}
        }
      }
    });
    component.tableName.set('default');
    component.rows.set([]);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle pagination', () => {
    // Set total count and test pagination methods
    component.totalCount.set(100);
    component.pageSize.set(10);

    // Initial page should be 1
    expect(component.currentPage()).toBe(1);

    // Test next page
    component.nextPage();
    expect(component.currentPage()).toBe(2);

    // Test previous page
    component.previousPage();
    expect(component.currentPage()).toBe(1);

    // Test go to page
    component.goToPage(5);
    expect(component.currentPage()).toBe(5);

    // Test change page size
    component.changePageSize(25);
    expect(component.pageSize()).toBe(25);
    expect(component.currentPage()).toBe(1); // Should reset to page 1
  });

  it('should handle filtering', () => {
    // Initial filters should be empty
    expect(Object.keys(component.filters()).length).toBe(0);

    // Test apply filter
    component.applyFilter('name', 'test');
    expect(component.filters()['name']).toBe('test');

    // Test clear filter by setting empty value
    component.applyFilter('name', '');
    expect(component.filters()['name']).toBeUndefined();

    // Test apply multiple filters
    component.applyFilter('name', 'test');
    component.applyFilter('age', '30');
    expect(Object.keys(component.filters()).length).toBe(2);

    // Test clear all filters
    component.clearFilters();
    expect(Object.keys(component.filters()).length).toBe(0);
  });
});
