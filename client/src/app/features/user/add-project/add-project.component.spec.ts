import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';

import { AddProjectComponent } from './add-project.component';
import { PanelService } from '@core/services/panel.service';
import { ProjectService } from '@core/services/project.service';

describe('AddProjectComponent', () => {
  let fixture: ComponentFixture<AddProjectComponent>;
  let component: AddProjectComponent;
  let projectService: {
    calculateOptimalConfig: jest.Mock;
    createProject: jest.Mock;
    getElectricityPriceSuggestion: jest.Mock;
  };

  beforeEach(async () => {
    projectService = {
      calculateOptimalConfig: jest.fn().mockReturnValue(of({
        recommendedPanels: 12,
        estimatedCapacity: 4.8,
        estimatedProduction: 6200,
        coverage: 42,
        surfaceArea: 120,
        latitude: 40,
        recommendedRowSpacing: 1.7,
      })),
      createProject: jest.fn().mockReturnValue(of({})),
      getElectricityPriceSuggestion: jest.fn().mockReturnValue(of({
        price: 0.1845,
        currency: 'EUR',
        source: 'entsoe',
        countryCode: 'ES',
      })),
    };

    await TestBed.configureTestingModule({
      imports: [AddProjectComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProjectService, useValue: projectService },
        { provide: PanelService, useValue: { getAllPanels: jest.fn().mockReturnValue(of({ panels: [] })) } },
        { provide: Router, useValue: { events: new Subject(), navigate: jest.fn(), navigateByUrl: jest.fn() } },
      ],
    })
      .overrideComponent(AddProjectComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AddProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('uses roof-only creation steps for this version', () => {
    expect(component.steps.map((step) => step.label)).toEqual([
      'Project',
      'Site',
      'Energy Price',
      'Installation',
      'Review',
    ]);
    expect(component.steps.some((step) => step.label.toLowerCase().includes('agri'))).toBe(false);
  });

  it('applies an ENTSO-E suggestion when the user has not edited price', () => {
    (component as unknown as { fetchEnergyPriceSuggestion(countryCode: string): void })
      .fetchEnergyPriceSuggestion('ES');

    expect(projectService.getElectricityPriceSuggestion).toHaveBeenCalledWith('ES');
    expect(component.energyPrice()).toBe(0.1845);
    expect(component.priceSuggestion()).toBe(0.1845);
    expect(component.currency()).toBe('EUR');
  });

  it('marks configuration as custom when panel count differs from optimal baseline', () => {
    component.optimalConfig.set({
      recommendedPanels: 12,
      estimatedCapacity: 4.8,
      estimatedProduction: 6200,
      coverage: 42,
      surfaceArea: 120,
      latitude: 40,
      recommendedRowSpacing: 1.7,
    });
    component.optimalBaseline.set({
      panelCount: 12,
      rowSpacing: 1.7,
      config: component.optimalConfig()!,
    });
    component.panelCount.set(10);
    component.rowSpacing.set(1.7);

    expect(component.isUsingOptimalConfig()).toBe(false);
  });

  it('restores the backend optimal panel count and row spacing', () => {
    component.optimalBaseline.set({
      panelCount: 12,
      rowSpacing: 1.7,
      config: {
        recommendedPanels: 12,
        estimatedCapacity: 4.8,
        estimatedProduction: 6200,
        coverage: 42,
        surfaceArea: 120,
        latitude: 40,
        recommendedRowSpacing: 1.7,
      },
    });
    component.panelCount.set(9);
    component.rowSpacing.set(1.2);

    component.restoreOptimal();

    expect(component.panelCount()).toBe(12);
    expect(component.rowSpacing()).toBe(1.7);
    expect(component.isUsingOptimalConfig()).toBe(true);
  });

  it('submits the edited energy price in a roof project payload', () => {
    component.projectName.set('Rooftop Project');
    component.projectDescription.set('Bill-aware estimate');
    component.drawnPolygonPoints.set([
      { lat: 40, lng: -3 },
      { lat: 40.001, lng: -3 },
      { lat: 40.001, lng: -2.999 },
    ]);
    component.addressResult.set('Madrid');
    component.addressLat.set(40);
    component.addressLng.set(-3);
    component.detectedCountry.set('Spain');
    component.detectedCountryCode.set('ES');
    component.detectedTimezone.set('Europe/Madrid');
    component.selectedPanelId.set('panel-1');
    component.panelCount.set(12);
    component.rowSpacing.set(1.7);
    component.currency.set('EUR');
    component.onPriceEdited(0.23);

    component.onSubmit();

    expect(projectService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectType: 'roof',
        price: 0.23,
        currency: 'EUR',
        azimuth: 180,
        country: 'Spain',
        countryCode: 'ES',
        timezone: 'Europe/Madrid',
      }),
    );
  });
});
