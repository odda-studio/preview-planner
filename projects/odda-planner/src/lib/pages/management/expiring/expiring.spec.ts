import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Expiring } from './expiring';

describe('Expiring', () => {
  let component: Expiring;
  let fixture: ComponentFixture<Expiring>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Expiring]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Expiring);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
