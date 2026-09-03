import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPreview } from './user-preview';

describe('UserPreview', () => {
  let component: UserPreview;
  let fixture: ComponentFixture<UserPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPreview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
