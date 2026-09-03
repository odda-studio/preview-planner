import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Worksheet } from './worksheet';

describe('Worksheet', () => {
  let component: Worksheet;
  let fixture: ComponentFixture<Worksheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Worksheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Worksheet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
