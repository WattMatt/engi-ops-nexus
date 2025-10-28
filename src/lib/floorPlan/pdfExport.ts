import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FloorPlanState } from './types';

export function generateFloorPlanPDF(state: FloorPlanState, canvasDataUrl: string) {
  const doc = new jsPDF();
  
  // Title Page
  doc.setFontSize(24);
  doc.text('Floor Plan Markup Report', 20, 30);
  doc.setFontSize(12);
  doc.text(`Design Purpose: ${state.designPurpose}`, 20, 45);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 55);
  
  if (state.scaleMetersPerPixel) {
    doc.text(`Scale: 1px = ${state.scaleMetersPerPixel.toFixed(4)}m`, 20, 65);
  }

  // Summary Stats
  doc.setFontSize(14);
  doc.text('Summary Statistics', 20, 85);
  doc.setFontSize(10);
  doc.text(`Equipment: ${state.equipment.length} items`, 30, 95);
  doc.text(`Cables: ${state.cables.length} routes`, 30, 102);
  
  const totalCableLength = state.cables.reduce((sum, c) => sum + (c.lengthMeters || 0), 0);
  doc.text(`Total Cable Length: ${totalCableLength.toFixed(2)}m`, 30, 109);
  
  doc.text(`Zones: ${state.zones.length}`, 30, 116);
  const totalArea = state.zones.reduce((sum, z) => sum + (z.areaSqm || 0), 0);
  doc.text(`Total Zone Area: ${totalArea.toFixed(2)}m²`, 30, 123);

  // Marked-up Drawing
  doc.addPage();
  doc.setFontSize(16);
  doc.text('Marked-up Floor Plan', 20, 20);
  
  if (canvasDataUrl) {
    doc.addImage(canvasDataUrl, 'PNG', 10, 30, 190, 140);
  }

  // Equipment Schedule
  if (state.equipment.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Equipment Schedule', 20, 20);
    
    const equipmentData = state.equipment.map(eq => [
      eq.type,
      eq.label || '-',
      `(${eq.x.toFixed(0)}, ${eq.y.toFixed(0)})`,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Type', 'Label', 'Position']],
      body: equipmentData,
    });
  }

  // Cable Schedule
  if (state.cables.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Cable Schedule', 20, 20);
    
    const cableData = state.cables.map(cable => [
      cable.cableType,
      cable.fromLabel || '-',
      cable.toLabel || '-',
      cable.lengthMeters?.toFixed(2) || '-',
      cable.terminationCount?.toString() || '-',
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Type', 'From', 'To', 'Length (m)', 'Terminations']],
      body: cableData,
    });
  }

  // Zones Schedule
  if (state.zones.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Zones Schedule', 20, 20);
    
    const zoneData = state.zones.map(zone => [
      zone.label || 'Unnamed',
      zone.areaSqm?.toFixed(2) || '-',
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Label', 'Area (m²)']],
      body: zoneData,
    });
  }

  doc.save('floor-plan-report.pdf');
}
