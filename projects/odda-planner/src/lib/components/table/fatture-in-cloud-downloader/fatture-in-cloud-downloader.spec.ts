import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FattureInCloudDownloader } from './fatture-in-cloud-downloader';

describe('FattureInCloudDownloader', () => {
  let component: FattureInCloudDownloader;
  let fixture: ComponentFixture<FattureInCloudDownloader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FattureInCloudDownloader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FattureInCloudDownloader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
