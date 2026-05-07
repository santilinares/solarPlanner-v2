import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PanelFormComponent } from './panel-form.component';
import { Panel, PanelCreateRequest } from '@core/models/panel.model';

const STUB_PANEL: Panel = {
  _id: 'p-1',
  id: 'p-1',
  brand: 'SunPower',
  model: 'X22-370',
  wattPeak: 370,
  efficiency: 22.2,
  price: 350,
  warranty: 25,
  dimensions: { width: 1046, height: 1690 },
  gammaPmp: -0.29,
  technology: 'Monocrystalline',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PanelFormComponent', () => {
  let fixture: ComponentFixture<PanelFormComponent>;
  let component: PanelFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelFormComponent],
      providers: [provideNoopAnimations()],
    })
      .overrideTemplate(PanelFormComponent, '<form [formGroup]="panelForm"></form>')
      .compileComponents();

    fixture = TestBed.createComponent(PanelFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('initial state (no panel input)', () => {
    it('form is invalid when all fields are empty', () => {
      expect(component['panelForm'].valid).toBe(false);
    });

    it('isEditMode is false when panel input is null', () => {
      expect(component['isEditMode']()).toBe(false);
    });
  });

  describe('with a panel input', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('panel', STUB_PANEL);
      fixture.detectChanges();
    });

    it('isEditMode is true when a panel is provided', () => {
      expect(component['isEditMode']()).toBe(true);
    });

    it('pre-populates the form with the panel data', () => {
      expect(component['panelForm'].get('brand')?.value).toBe('SunPower');
      expect(component['panelForm'].get('wattPeak')?.value).toBe(370);
    });
  });

  describe('hasError()', () => {
    it('returns false for an untouched field even if invalid', () => {
      expect(component.hasError('brand', 'required')).toBe(false);
    });

    it('returns true for a touched field with the matching error', () => {
      const brandControl = component['panelForm'].get('brand')!;
      brandControl.markAsTouched();
      expect(component.hasError('brand', 'required')).toBe(true);
    });
  });

  describe('onCancel()', () => {
    it('emits the cancel output event', () => {
      let cancelCount = 0;
      component.cancel.subscribe(() => cancelCount++);
      component.onCancel();
      expect(cancelCount).toBe(1);
    });
  });

  describe('onSubmit()', () => {
    it('marks all fields as touched and does not emit when form is invalid', () => {
      const emitted: PanelCreateRequest[] = [];
      component.save.subscribe((v) => emitted.push(v));
      component.onSubmit();
      expect(emitted).toHaveLength(0);
      expect(component['panelForm'].get('brand')?.touched).toBe(true);
    });

    it('emits the save output with the form payload when form is valid', () => {
      fixture.componentRef.setInput('panel', STUB_PANEL);
      fixture.detectChanges();

      const emitted: PanelCreateRequest[] = [];
      component.save.subscribe((v) => emitted.push(v));
      component.onSubmit();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].brand).toBe('SunPower');
      expect(emitted[0].wattPeak).toBe(370);
    });
  });
});
