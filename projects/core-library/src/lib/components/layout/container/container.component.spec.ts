import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerComponent } from './container.component';
import { LayoutService } from '../layout-service';

describe('ContainerComponent', () => {
  let component: ContainerComponent;
  let fixture: ComponentFixture<ContainerComponent>;
  let layoutService: LayoutService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContainerComponent],
      providers: [LayoutService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContainerComponent);
    component = fixture.componentInstance;
    layoutService = TestBed.inject(LayoutService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set sidenav position correctly', () => {
    component.sidenavPosition = 'right';
    fixture.detectChanges();
    const element = fixture.nativeElement;
    expect(element.querySelector('.layout').classList.contains('sidenav-right')).toBe(true);

    component.sidenavPosition = 'left';
    fixture.detectChanges();
    expect(element.querySelector('.layout').classList.contains('sidenav-right')).toBe(false);
  });

  it('should respond to layout service changes', () => {
    // Initially open
    expect(component.isSidenavOpen).toBe(true);

    // Close sidenav
    layoutService.closeSidenav();
    fixture.detectChanges();
    expect(component.isSidenavOpen).toBe(false);
    const element = fixture.nativeElement;
    expect(element.querySelector('.layout').classList.contains('sidenav-closed')).toBe(true);

    // Open sidenav
    layoutService.openSidenav();
    fixture.detectChanges();
    expect(component.isSidenavOpen).toBe(true);
    expect(element.querySelector('.layout').classList.contains('sidenav-closed')).toBe(false);
  });
});
