import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfigureReviewStepComponent } from './configure-review-step.component';
import { ConfigFormValue } from '../../configure-project.component';

const STUB_FORM_VALUE: ConfigFormValue = {
  name: 'My Solar Farm',
  country: 'Spain',
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  price: 0.15,
  panelId: 'panel-123',
  panelNumber: 10,
  tilt: 30,
  azimuth: 180,
  direction: 'south',
  rawSpacing: 1.5,
};

describe('ConfigureReviewStepComponent', () => {
  let fixture: ComponentFixture<ConfigureReviewStepComponent>;
  let component: ConfigureReviewStepComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigureReviewStepComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigureReviewStepComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('formValue', STUB_FORM_VALUE);
    fixture.componentRef.setInput('locationSummary', '40.4000°N, 3.7000°W');
    fixture.componentRef.setInput('polygonCoords', []);
    fixture.detectChanges();
  });

  // ─── Rendering ───

  it('renders the project name from formValue', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('My Solar Farm');
  });

  it('renders country, timezone, currency and price', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Spain');
    expect(text).toContain('Europe/Madrid');
    expect(text).toContain('EUR');
    expect(text).toContain('0.15');
  });

  it('renders location summary', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('40.4000°N, 3.7000°W');
  });

  it('shows "Not defined" when polygon has fewer than 3 points', () => {
    fixture.componentRef.setInput('polygonCoords', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not defined');
  });

  it('shows polygon point count when 3+ points are provided', () => {
    fixture.componentRef.setInput('polygonCoords', [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 3, lng: 3 },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 points defined');
  });

  it('renders panel count from formValue', () => {
    expect(fixture.nativeElement.textContent).toContain('10');
  });

  // ─── Save button state ───

  it('disables the Save button when canSave is false', () => {
    fixture.componentRef.setInput('canSave', false);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('p-button[label="Save Changes"] button'));
    expect(btn?.nativeElement.disabled).toBe(true);
  });

  it('enables the Save button when canSave is true', () => {
    fixture.componentRef.setInput('canSave', true);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('p-button[label="Save Changes"] button'));
    expect(btn?.nativeElement.disabled).toBe(false);
  });

  // ─── Event emission ───

  it('emits save when Save button is clicked', () => {
    fixture.componentRef.setInput('canSave', true);
    fixture.detectChanges();

    const saveSpy = jest.fn();
    component.save.subscribe(saveSpy);

    const btn = fixture.debugElement.query(By.css('p-button[label="Save Changes"]'));
    btn.triggerEventHandler('onClick', {});

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('emits goToStep(1) when edit Location button is clicked', () => {
    const stepSpy = jest.fn();
    component.goToStep.subscribe(stepSpy);

    const editBtns = fixture.debugElement.queryAll(By.css('p-button[pTooltip="Edit Location"]'));
    editBtns[0].triggerEventHandler('onClick', {});

    expect(stepSpy).toHaveBeenCalledWith(1);
  });

  // ─── Error / success messages ───

  it('shows error message when saveError is set', () => {
    fixture.componentRef.setInput('saveError', 'Network error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Network error');
  });

  it('shows success message when saveSuccess is true', () => {
    fixture.componentRef.setInput('saveSuccess', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Project updated successfully');
  });
});
