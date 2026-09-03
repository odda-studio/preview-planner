import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SidenavComponent } from './sidenav.component';
import { LayoutService } from '../layout-service';
import { PLATFORM_ID } from '@angular/core';
import { WINDOW } from '../../../tokens/window.token';

describe('SidenavComponent', () => {
  let component: SidenavComponent;
  let fixture: ComponentFixture<SidenavComponent>;
  let layoutService: LayoutService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavComponent, NoopAnimationsModule],
      providers: [
        LayoutService,
        { provide: PLATFORM_ID, useValue: 'browser' }, // Mock browser platform
        {
          provide: WINDOW,
          useValue: {
            innerWidth: 1024,
            innerHeight: 768,
            addEventListener: () => {},
            removeEventListener: () => {}
          }
        } // Mock window object
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;
    layoutService = TestBed.inject(LayoutService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set position correctly', () => {
    component.position = 'right';
    fixture.detectChanges();
    expect(component.isRight).toBe(true);

    component.position = 'left';
    fixture.detectChanges();
    expect(component.isRight).toBe(false);
  });

  it('should respond to layout service changes', () => {
    // Initially open
    expect(component.isOpen).toBe(true);

    // Close sidenav
    layoutService.closeSidenav();
    fixture.detectChanges();
    expect(component.isOpen).toBe(false);

    // Open sidenav
    layoutService.openSidenav();
    fixture.detectChanges();
    expect(component.isOpen).toBe(true);
  });
});
