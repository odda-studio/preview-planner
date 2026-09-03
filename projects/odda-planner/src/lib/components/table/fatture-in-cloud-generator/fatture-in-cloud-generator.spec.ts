import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FattureInCloudGenerator } from './fatture-in-cloud-generator';

describe('FattureInCloudGenerator', () => {
  let component: FattureInCloudGenerator;
  let fixture: ComponentFixture<FattureInCloudGenerator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FattureInCloudGenerator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FattureInCloudGenerator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
