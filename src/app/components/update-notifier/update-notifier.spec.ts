import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateNotifier } from './update-notifier';

describe('UpdateNotifier', () => {
  let component: UpdateNotifier;
  let fixture: ComponentFixture<UpdateNotifier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateNotifier]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateNotifier);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
