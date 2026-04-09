import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { PlanData } from '../models';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  generateProjectPDF(planData: PlanData): void {
    const doc = new jsPDF();
    const { project, panelDetails, totalCapacityKw, estimatedAnnualProduction, generatedAt } = planData;

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = 22;

    const section = (title: string) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 120, 60);
      doc.text(title, margin, y);
      y += 1;
      doc.setDrawColor(30, 120, 60);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      doc.setTextColor(40, 40, 40);
    };

    const row = (label: string, value: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(value, pageW / 2, y);
      y += 7;
    };

    // ── Title ──
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 80, 40);
    doc.text(`${project.name}`, margin, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Solar Installation Plan', margin, y);
    y += 12;

    // ── Project Details ──
    section('Project Details');
    row('Location (lat / lon)', `${project.lat ?? '—'}, ${project.lon ?? '—'}`);
    row('Surface area', project.surface != null ? `${project.surface.toFixed(0)} m²` : '—');
    row('Tilt', `${project.tilt}°`);
    row('Direction', project.direction);
    if (project.country) row('Country', project.country);
    if (project.installDate) row('Install date', new Date(project.installDate).toLocaleDateString());
    y += 4;

    // ── Panel Details ──
    if (panelDetails) {
      section('Panel Details');
      row('Panel', panelDetails.name);
      row('Technology', panelDetails.technology);
      row('Capacity per panel', `${panelDetails.capacity} W`);
      row('Dimensions', `${panelDetails.width} m × ${panelDetails.height} m`);
      y += 4;
    }

    // ── Production Estimates ──
    section('Production Estimates');
    row('Number of panels', String(project.panelNumber));
    row('Total installed capacity', `${totalCapacityKw.toFixed(2)} kW`);
    row('Est. annual production', `${estimatedAnnualProduction.toFixed(0)} kWh`);
    y += 8;

    // ── Footer ──
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Generated: ${new Date(generatedAt).toLocaleString()}`,
      margin,
      doc.internal.pageSize.getHeight() - 10,
    );

    doc.save('solar-plan.pdf');
  }
}
