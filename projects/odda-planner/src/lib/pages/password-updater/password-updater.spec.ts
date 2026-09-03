import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordUpdater } from './password-updater';

describe('PasswordUpdater', () => {
  let component: PasswordUpdater;
  let fixture: ComponentFixture<PasswordUpdater>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordUpdater]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordUpdater);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
