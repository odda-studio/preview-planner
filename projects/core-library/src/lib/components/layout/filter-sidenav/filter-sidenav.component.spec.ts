import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterSidenavComponent } from './filter-sidenav.component';

describe('FilterSidenavComponent', () => {
  let component: FilterSidenavComponent;
  let fixture: ComponentFixture<FilterSidenavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterSidenavComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterSidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
