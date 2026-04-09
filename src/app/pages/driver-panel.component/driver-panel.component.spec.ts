import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverPanelComponent } from './driver-panel.component';

describe('DriverPanelComponent', () => {
  let component: DriverPanelComponent;
  let fixture: ComponentFixture<DriverPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DriverPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
