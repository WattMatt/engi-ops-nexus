/**
 * Floor Plan PDF Generator
 * 
 * ⚠️ IMPORTANT: This PDF generator currently uses a custom format.
 * 
 * For NEW PDF export features, you MUST use the standardized cover page format.
 * See: src/utils/README_PDF_EXPORTS.md
 * 
 * Quick start: src/utils/PDF_QUICK_START.md
 * Standards: src/utils/PDF_EXPORT_STANDARDS.md
 * 
 * TODO: Migrate this floor plan exporter to use the standard cover page format
 * from src/utils/pdfCoverPage.ts
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratePdfParams, EquipmentType, SupplyLine, Task, EquipmentItem, Containment } from '../types';
import { calculateLvCableSummary } from './styleUtils';
import { renderMarkupsToContext } from './drawing';
import { 
  CABLE_TYPES, 
  CIRCUIT_TYPE_MAPPINGS, 
  getDefaultCableForCircuit,
  CableTypeDefinition,
  calculateCableLengths
} from '../components/cable-types';
import { FIXTURE_TYPE_MARKS, LIGHTING_TYPE_MARKS, EQUIPMENT_TYPE_MARKS } from '../components/schedules/schedule-types';

// A4 Portrait dimensions
const MARGIN = 14; // mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// A3 Landscape dimensions (for drawing sheets)
const A3_WIDTH = 420;
const A3_HEIGHT = 297;
const A3_MARGIN = 10;

// Colors for professional appearance
const HEADER_COLORS = {
  primary: '#1e40af',    // Blue
  secondary: '#059669',  // Green
  warning: '#d97706',    // Amber
  danger: '#dc2626',     // Red
  neutral: '#374151',    // Gray
  cable: '#7c3aed',      // Purple
};

interface CableTakeoffItem {
  circuit: string;
  cableType: string;
  cableSize: string;
  liveLength: number;
  neutralLength: number;
  earthLength: number;
  totalLength: number;
}

interface CableQuantitySummary {
  cableFamily: string;
  cableSize: string;
  totalLength: number;
  reelsRequired: number;
}

// Equipment to circuit type mapping for cable takeoff
const EQUIPMENT_TO_CIRCUIT: Record<string, string> = {
  'General Light Switch': 'L1',
  'Dimmer Switch': 'L1',
  '2-Way Light Switch': 'L1',
  'Watertight Light Switch': 'L1',
  'Ceiling Mounted Light Fitting': 'L1',
  '600x600 Recessed LED Panel': 'L2',
  '1200x600 Recessed LED Panel': 'L2',
  '2-Tube Surface Mounted Fluorescent': 'L2',
  'Single Surface Mounted Fluorescent': 'L2',
  'LED Strip Light': 'L2',
  'Floodlight': 'L2',
  'Ceiling Mounted Floodlight': 'L2',
  'Wall Mounted Light Fitting': 'L2',
  '16A Switched Socketed Outlet': 'P1',
  'Double Switched Socket Outlet': 'P1',
  'Clean Power Outlet': 'P2',
  '16A Emergency Switched Socket': 'P2',
  'Blue UPS Switched Socket': 'P2',
  'Single Phase Outlet': 'P1',
  'Three Phase Outlet': 'P1',
  '16A TP (5pin) Socket Outlet': 'P1',
  'Geyser Outlet': 'GY',
  'Data Socket Outlet': 'DB',
  'Telephone Outlet Point': 'DB',
  'TV Outlet Point': 'DB',
};

// Calculate cable takeoff from equipment
function calculateCableTakeoff(
  equipment: EquipmentItem[], 
  containment: Containment[],
  scaleRatio: number
): CableTakeoffItem[] {
  const circuitLengths: Record<string, { equipment: EquipmentItem[], totalLength: number }> = {};
  
  // Group equipment by circuit type
  equipment.forEach(item => {
    const circuit = EQUIPMENT_TO_CIRCUIT[item.type] || 'S1';
    if (!circuitLengths[circuit]) {
      circuitLengths[circuit] = { equipment: [], totalLength: 0 };
    }
    circuitLengths[circuit].equipment.push(item);
  });

  // Estimate cable lengths based on equipment positions
  // Use containment lengths if available, otherwise estimate from positions
  const containmentLength = containment.reduce((sum, c) => sum + (c.length || 0), 0);
  
  const takeoffItems: CableTakeoffItem[] = [];
  
  Object.entries(circuitLengths).forEach(([circuit, data]) => {
    const cableType = getDefaultCableForCircuit(circuit);
    if (!cableType) return;
    
    // Estimate length: average distance from equipment to DB + routing overhead
    const avgDistancePerItem = 8; // meters average
    const routeLength = data.equipment.length * avgDistancePerItem;
    const adjustedLength = routeLength * 1.1; // 10% waste allowance
    
    const cableFamily = cableType.name.split(' ')[0]; // GP, Flattex, T&E
    const cableSize = cableType.live.size + 'mm²';
    
    takeoffItems.push({
      circuit,
      cableType: cableType.shortName,
      cableSize,
      liveLength: adjustedLength,
      neutralLength: adjustedLength,
      earthLength: adjustedLength,
      totalLength: adjustedLength * 3,
    });
  });

  return takeoffItems.sort((a, b) => a.circuit.localeCompare(b.circuit));
}

// Calculate cable quantity summary
function calculateCableQuantitySummary(takeoffItems: CableTakeoffItem[]): CableQuantitySummary[] {
  const summaryMap: Record<string, { totalLength: number; cableFamily: string; cableSize: string }> = {};
  
  takeoffItems.forEach(item => {
    const key = item.cableType;
    if (!summaryMap[key]) {
      const parts = item.cableType.split(' ');
      summaryMap[key] = {
        cableFamily: parts[0],
        cableSize: item.cableSize,
        totalLength: 0,
      };
    }
    summaryMap[key].totalLength += item.totalLength;
  });

  return Object.entries(summaryMap).map(([key, data]) => ({
    cableFamily: data.cableFamily,
    cableSize: data.cableSize,
    totalLength: data.totalLength,
    reelsRequired: Math.ceil(data.totalLength / 100), // 100m per reel
  })).sort((a, b) => a.cableFamily.localeCompare(b.cableFamily));
}

const addTitleBlock = (doc: jsPDF, params: GeneratePdfParams, isA3: boolean = false) => {
  const width = isA3 ? A3_WIDTH : PAGE_WIDTH;
  const height = isA3 ? A3_HEIGHT : PAGE_HEIGHT;
  const margin = isA3 ? A3_MARGIN : MARGIN;
  
  // Title block in bottom right
  const blockWidth = 80;
  const blockHeight = 40;
  const blockX = width - margin - blockWidth;
  const blockY = height - margin - blockHeight;
  
  // Title block border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(blockX, blockY, blockWidth, blockHeight);
  
  // Horizontal dividers
  doc.line(blockX, blockY + 10, blockX + blockWidth, blockY + 10);
  doc.line(blockX, blockY + 20, blockX + blockWidth, blockY + 20);
  doc.line(blockX, blockY + 30, blockX + blockWidth, blockY + 30);
  
  // Vertical divider
  doc.line(blockX + 40, blockY + 10, blockX + 40, blockY + 40);
  
  // Title block content
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(params.projectName, blockX + blockWidth / 2, blockY + 7, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Drawing:', blockX + 2, blockY + 17);
  doc.text('Floor Plan', blockX + 42, blockY + 17);
  
  doc.text('Date:', blockX + 2, blockY + 27);
  doc.text(new Date().toLocaleDateString(), blockX + 42, blockY + 27);
  
  doc.text('Rev:', blockX + 2, blockY + 37);
  doc.text('A', blockX + 42, blockY + 37);
  
  doc.text('Scale:', blockX + 55, blockY + 37);
  doc.text('NTS', blockX + 70, blockY + 37);
};

const addPageHeader = (doc: jsPDF, title: string, projectName: string) => {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName, MARGIN, MARGIN);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(title, MARGIN, MARGIN + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString();
  doc.text(`Date: ${date}`, PAGE_WIDTH - MARGIN, MARGIN, { align: 'right' });
  
  doc.setDrawColor(200);
  doc.line(MARGIN, MARGIN + 12, PAGE_WIDTH - MARGIN, MARGIN + 12);
  
  doc.setTextColor(0);
};

const addPageFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
  }
  doc.setTextColor(0);
};

const addRevisionTable = (doc: jsPDF, startY: number) => {
  autoTable(doc, {
    startY,
    head: [['Rev', 'Date', 'Description', 'By', 'Checked']],
    body: [
      ['A', new Date().toLocaleDateString(), 'Initial Issue', '-', '-'],
    ],
    margin: { left: MARGIN, right: MARGIN },
    headStyles: { fillColor: HEADER_COLORS.neutral, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 25 },
      2: { cellWidth: 80 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
    },
  });
  return (doc as any).lastAutoTable.finalY + 10;
};

const addLayoutPage = async (doc: jsPDF, params: GeneratePdfParams) => {
  const { canvases, ...projectData } = params;
  const { pdf } = canvases;
  if (!pdf) throw new Error('PDF canvas not available for PDF generation.');
  if (!params.scaleInfo.ratio) throw new Error('Scale information is required for PDF generation.');

  // Create a new canvas for drawing markups with correct dimensions
  const drawingCanvasForPdf = document.createElement('canvas');
  drawingCanvasForPdf.width = pdf.width;
  drawingCanvasForPdf.height = pdf.height;
  const drawCtx = drawingCanvasForPdf.getContext('2d');
  if (!drawCtx) throw new Error('Could not create a 2D context for the drawing canvas.');

  // Render all markups onto this new canvas with a 1:1 scale (zoom=1)
  renderMarkupsToContext(drawCtx, { ...projectData, zoom: 1 });

  // Composite the background PDF and the newly rendered markups
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = pdf.width;
  compositeCanvas.height = pdf.height;
  const ctx = compositeCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a 2D context for the composite canvas.');

  ctx.drawImage(pdf, 0, 0);
  ctx.drawImage(drawingCanvasForPdf, 0, 0);

  const imageData = compositeCanvas.toDataURL('image/jpeg', 0.85);
  const imgWidth = pdf.width;
  const imgHeight = pdf.height;
  const ratio = imgWidth / imgHeight;
  const availableWidth = PAGE_WIDTH - (MARGIN * 2);
  const availableHeight = PAGE_HEIGHT - (MARGIN * 2) - 20;

  let renderWidth = availableWidth;
  let renderHeight = renderWidth / ratio;

  if (renderHeight > availableHeight) {
    renderHeight = availableHeight;
    renderWidth = renderHeight * ratio;
  }

  const x = (PAGE_WIDTH - renderWidth) / 2;
  const y = (PAGE_HEIGHT - renderHeight) / 2 + 10;

  doc.addPage();
  addPageHeader(doc, 'Floor Plan Layout', params.projectName);
  doc.addImage(imageData, 'JPEG', x, y, renderWidth, renderHeight);
  addTitleBlock(doc, params);
};

const addCableSchedulePage = (doc: jsPDF, params: GeneratePdfParams) => {
  const scaleRatio = params.scaleInfo.ratio || 0.01;
  const takeoffItems = calculateCableTakeoff(params.equipment, params.containment, scaleRatio);
  const quantitySummary = calculateCableQuantitySummary(takeoffItems);
  
  if (takeoffItems.length === 0) return;
  
  doc.addPage();
  addPageHeader(doc, 'Cable Schedule', params.projectName);
  let lastY = MARGIN + 20;
  
  const didDrawPage = () => addPageHeader(doc, 'Cable Schedule', params.projectName);

  // Cable Takeoff Schedule
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CABLE TAKEOFF SCHEDULE', MARGIN, lastY);
  lastY += 6;

  const takeoffBody = takeoffItems.map(item => [
    item.circuit,
    item.cableType,
    item.liveLength.toFixed(1),
    item.neutralLength.toFixed(1),
    item.earthLength.toFixed(1),
    item.totalLength.toFixed(1),
  ]);

  // Add totals row
  const totalLive = takeoffItems.reduce((sum, i) => sum + i.liveLength, 0);
  const totalNeutral = takeoffItems.reduce((sum, i) => sum + i.neutralLength, 0);
  const totalEarth = takeoffItems.reduce((sum, i) => sum + i.earthLength, 0);
  const grandTotal = takeoffItems.reduce((sum, i) => sum + i.totalLength, 0);
  takeoffBody.push(['TOTAL', '', totalLive.toFixed(1), totalNeutral.toFixed(1), totalEarth.toFixed(1), grandTotal.toFixed(1)]);

  autoTable(doc, {
    startY: lastY,
    head: [['Circuit', 'Cable Type', 'Live (m)', 'Neutral (m)', 'Earth (m)', 'Total (m)']],
    body: takeoffBody,
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage,
    headStyles: { fillColor: HEADER_COLORS.cable, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: '#f9fafb' },
    foot: [],
    didParseCell: (data: any) => {
      // Style the totals row
      if (data.row.index === takeoffBody.length - 1) {
        data.cell.styles.fillColor = '#e5e7eb';
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  lastY = (doc as any).lastAutoTable.finalY + 15;

  // Cable Quantity Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CABLE QUANTITY SUMMARY', MARGIN, lastY);
  lastY += 6;

  const summaryBody = quantitySummary.map(item => [
    item.cableFamily,
    item.cableSize,
    item.totalLength.toFixed(1),
    item.reelsRequired.toString(),
  ]);

  // Add totals
  const totalSummaryLength = quantitySummary.reduce((sum, i) => sum + i.totalLength, 0);
  const totalReels = quantitySummary.reduce((sum, i) => sum + i.reelsRequired, 0);
  summaryBody.push(['TOTAL', '', totalSummaryLength.toFixed(1), totalReels.toString()]);

  autoTable(doc, {
    startY: lastY,
    head: [['Cable Type', 'Size', 'Total Length (m)', 'Reels Required']],
    body: summaryBody,
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage,
    headStyles: { fillColor: HEADER_COLORS.secondary, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 30 },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    alternateRowStyles: { fillColor: '#f0fdf4' },
    didParseCell: (data: any) => {
      if (data.row.index === summaryBody.length - 1) {
        data.cell.styles.fillColor = '#d1fae5';
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  lastY = (doc as any).lastAutoTable.finalY + 15;

  // Cable Type Reference
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CABLE TYPE REFERENCE', MARGIN, lastY);
  lastY += 6;

  const cableRefBody = Object.values(CABLE_TYPES).map(cable => [
    cable.shortName,
    `L: ${cable.live.size}mm² | N: ${cable.neutral.size}mm² | E: ${cable.earth.size}mm²`,
    `${cable.maxCurrent}A`,
    cable.usedFor.slice(0, 2).join(', '),
  ]);

  autoTable(doc, {
    startY: lastY,
    head: [['Cable Type', 'Conductor Sizes', 'Max Current', 'Applications']],
    body: cableRefBody,
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage,
    headStyles: { fillColor: HEADER_COLORS.neutral, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: '#f3f4f6' },
  });
};

const addEnhancedSchedulesPage = (doc: jsPDF, params: GeneratePdfParams) => {
  doc.addPage();
  addPageHeader(doc, 'Equipment Schedules', params.projectName);
  let lastY = MARGIN + 20;

  const didDrawPage = () => addPageHeader(doc, 'Equipment Schedules', params.projectName);

  // Lighting Fixture Schedule with Type Marks
  const lightingEquipment = params.equipment.filter(e => 
    e.type.toLowerCase().includes('light') || 
    e.type.toLowerCase().includes('led') ||
    e.type.toLowerCase().includes('fluorescent')
  );

  if (lightingEquipment.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LIGHTING FIXTURE SCHEDULE', MARGIN, lastY);
    lastY += 6;

    const lightingSummary: Record<string, number> = {};
    lightingEquipment.forEach(e => {
      lightingSummary[e.type] = (lightingSummary[e.type] || 0) + 1;
    });

    const lightingBody = Object.entries(lightingSummary).map(([type, qty]) => {
      const typeMark = LIGHTING_TYPE_MARKS[type];
      return [
        typeMark?.mark || '-',
        type,
        typeMark?.description || type,
        typeMark?.wattage ? `${typeMark.wattage}W` : '-',
        typeMark?.lumens ? `${typeMark.lumens}lm` : '-',
        qty.toString(),
      ];
    });

    autoTable(doc, {
      startY: lastY,
      head: [['Type Mark', 'Symbol', 'Description', 'Wattage', 'Lumens', 'Qty']],
      body: lightingBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: HEADER_COLORS.warning, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 55 },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: '#fffbeb' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Electrical Fixture Schedule with Type Marks
  const electricalEquipment = params.equipment.filter(e => 
    e.type.toLowerCase().includes('socket') || 
    e.type.toLowerCase().includes('outlet') ||
    e.type.toLowerCase().includes('data') ||
    e.type.toLowerCase().includes('telephone')
  );

  if (electricalEquipment.length > 0) {
    if (lastY > PAGE_HEIGHT - 80) {
      doc.addPage();
      addPageHeader(doc, 'Equipment Schedules', params.projectName);
      lastY = MARGIN + 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ELECTRICAL FIXTURE SCHEDULE', MARGIN, lastY);
    lastY += 6;

    const electricalSummary: Record<string, number> = {};
    electricalEquipment.forEach(e => {
      electricalSummary[e.type] = (electricalSummary[e.type] || 0) + 1;
    });

    const electricalBody = Object.entries(electricalSummary).map(([type, qty]) => {
      const typeMark = FIXTURE_TYPE_MARKS[type];
      return [
        typeMark?.mark || '-',
        type,
        typeMark?.description || type,
        qty.toString(),
      ];
    });

    autoTable(doc, {
      startY: lastY,
      head: [['Type Mark', 'Symbol', 'Description', 'Qty']],
      body: electricalBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: HEADER_COLORS.primary, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 85 },
        3: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: '#eff6ff' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Distribution Equipment Schedule
  const dbEquipment = params.equipment.filter(e => 
    e.type.toLowerCase().includes('board') || 
    e.type.toLowerCase().includes('distribution')
  );

  if (dbEquipment.length > 0) {
    if (lastY > PAGE_HEIGHT - 80) {
      doc.addPage();
      addPageHeader(doc, 'Equipment Schedules', params.projectName);
      lastY = MARGIN + 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUTION EQUIPMENT SCHEDULE', MARGIN, lastY);
    lastY += 6;

    const dbBody = dbEquipment.map((e, idx) => {
      const typeMark = EQUIPMENT_TYPE_MARKS[e.type];
      return [
        typeMark?.mark || 'DB',
        `DB-${String(idx + 1).padStart(2, '0')}`,
        e.name || e.type,
        typeMark?.rating || '-',
      ];
    });

    autoTable(doc, {
      startY: lastY,
      head: [['Type Mark', 'Panel Name', 'Description', 'Rating']],
      body: dbBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: HEADER_COLORS.danger, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 30, fontStyle: 'bold' },
        2: { cellWidth: 85 },
        3: { cellWidth: 30, halign: 'center' },
      },
      alternateRowStyles: { fillColor: '#fef2f2' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Conduit Run Schedule
  if (params.containment.length > 0) {
    if (lastY > PAGE_HEIGHT - 80) {
      doc.addPage();
      addPageHeader(doc, 'Equipment Schedules', params.projectName);
      lastY = MARGIN + 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDUIT & CONTAINMENT SCHEDULE', MARGIN, lastY);
    lastY += 6;

    const containmentSummary: Record<string, { type: string; size: string; length: number; count: number }> = {};
    params.containment.forEach(c => {
      const key = `${c.type}___${c.size}`;
      if (!containmentSummary[key]) {
        containmentSummary[key] = { type: c.type, size: c.size, length: 0, count: 0 };
      }
      containmentSummary[key].length += c.length || 0;
      containmentSummary[key].count += 1;
    });

    const containmentBody = Object.values(containmentSummary).map(item => [
      item.type.charAt(0).toUpperCase(),
      item.type,
      item.size,
      item.count.toString(),
      item.length.toFixed(1) + 'm',
    ]);

    autoTable(doc, {
      startY: lastY,
      head: [['Mark', 'Type', 'Size', 'Runs', 'Total Length']],
      body: containmentBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: HEADER_COLORS.secondary, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: '#f0fdf4' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Add revision table at bottom
  if (lastY < PAGE_HEIGHT - 60) {
    addRevisionTable(doc, lastY);
  }
};

const addSchedulesPage = (doc: jsPDF, params: GeneratePdfParams) => {
  // Pre-check if there's any content to render on this page
  const hasComments = params.comments && params.comments.trim() !== '';
  const hasPv = params.pvPanelConfig && params.pvArrays && params.pvArrays.length > 0;
  const hasEquipment = params.equipment.length > 0;
  const hasContainment = params.containment.length > 0;
  const hasZones = params.zones.length > 0;
  const hasTasks = params.tasks && params.tasks.length > 0;
  
  // Check for line summaries
  const checkMvTotal = params.lines.filter(l => l.type === 'mv').reduce((s, l) => s + l.length, 0);
  const checkDcTotal = params.lines.filter(l => l.type === 'dc').reduce((s, l) => s + l.length, 0);
  const checkLvLines = params.lines.filter(l => l.type === 'lv' && l.cableType);
  const hasLineSummary = checkMvTotal > 0 || checkDcTotal > 0 || checkLvLines.length > 0;
  
  // If no content, don't add an empty page
  if (!hasComments && !hasPv && !hasEquipment && !hasContainment && !hasZones && !hasTasks && !hasLineSummary) {
    console.log('[PDF] Skipping empty schedules page - no content to render');
    return;
  }
  
  doc.addPage();
  addPageHeader(doc, 'Schedules & Summaries', params.projectName);
  let lastY = MARGIN + 20;

  const didDrawPage = (data: any) => addPageHeader(doc, 'Schedules & Summaries', params.projectName);
  
  if (params.comments && params.comments.trim() !== '') {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes & Comments', MARGIN, lastY);
    lastY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitComments = doc.splitTextToSize(params.comments, PAGE_WIDTH - MARGIN * 2);
    doc.text(splitComments, MARGIN, lastY);
    lastY += (splitComments.length * 4) + 10;

    if (lastY > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      addPageHeader(doc, 'Schedules & Summaries', params.projectName);
      lastY = MARGIN + 20;
    }
  }
  
  // PV Design Summary
  if (params.pvPanelConfig && params.pvArrays && params.pvArrays.length > 0) {
    const { pvPanelConfig, pvArrays } = params;
    const totalPanels = pvArrays.reduce((sum, arr) => sum + arr.rows * arr.columns, 0);
    const totalWattage = totalPanels * pvPanelConfig.wattage;

    autoTable(doc, {
      startY: lastY,
      head: [['PV Panel Configuration', '']],
      body: [
        ['Dimensions', `${pvPanelConfig.length}m x ${pvPanelConfig.width}m`],
        ['Wattage', `${pvPanelConfig.wattage} Wp`],
      ],
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#16a085' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: lastY,
      head: [['PV System Summary', '']],
      body: [
        ['Total Arrays', `${pvArrays.length}`],
        ['Total Panels', `${totalPanels}`],
        ['Total DC Power', `${(totalWattage / 1000).toFixed(2)} kWp`],
      ],
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#27ae60' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Equipment Summary
  const equipmentSummary = Object.entries(
    params.equipment.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<EquipmentType, number>)
  ).map(([type, quantity]) => [type, quantity]);

  if (equipmentSummary.length > 0) {
    autoTable(doc, {
      startY: lastY,
      head: [['Equipment Type', 'Quantity']],
      body: equipmentSummary,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#2980b9' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Containment Schedule
  const containmentSummary = params.containment.reduce((acc, item) => {
    const key = `${item.type}___${item.size}`;
    acc[key] = (acc[key] || 0) + item.length;
    return acc;
  }, {} as Record<string, number>);

  const containmentBody = Object.entries(containmentSummary).map(([key, length]) => {
    const [type, size] = key.split('___');
    return [type, size, (length as number).toFixed(2) + 'm'];
  });

  if (containmentBody.length > 0) {
    autoTable(doc, {
      startY: lastY,
      head: [['Containment Type', 'Size', 'Total Length']],
      body: containmentBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#16a085' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Line Summary
  const lineSummaryBody = [];
  const mvTotal = params.lines.filter(l => l.type === 'mv').reduce((s, l) => s + l.length, 0);
  if (mvTotal > 0) lineSummaryBody.push(['MV Lines', mvTotal.toFixed(2) + 'm']);
  const dcTotal = params.lines.filter(l => l.type === 'dc').reduce((s, l) => s + l.length, 0);
  if (dcTotal > 0) lineSummaryBody.push(['DC Lines', dcTotal.toFixed(2) + 'm']);
  
  if (lineSummaryBody.length > 0) {
     autoTable(doc, {
      startY: lastY,
      head: [['Line Type', 'Total Length']],
      body: lineSummaryBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#c0392b' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Supply Zones Summary
  const zonesBody = params.zones.map(z => [z.name, z.area.toFixed(2) + 'm²']);
  if (zonesBody.length > 0) {
    autoTable(doc, {
      startY: lastY,
      head: [['Supply Zone', 'Area']],
      body: zonesBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#f39c12' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // LV Cable Summary
  const { summary: lvSummaryMap } = calculateLvCableSummary(params.lines);
  const lvLines = params.lines.filter(l => l.type === 'lv' && l.cableType);

  const cableSummaryBody = Array.from(lvSummaryMap.entries())
    .map(([type, { totalLength }]) => [type, totalLength.toFixed(2) + 'm']);

  if (cableSummaryBody.length > 0) {
    autoTable(doc, {
      startY: lastY,
      head: [['LV/AC Cable Type', 'Total Length']],
      body: cableSummaryBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#8e44ad' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 15;
  }

  if (lvLines.length > 0) {
    const lvLinesBody = lvLines.map(l => {
      const isGpWire = l.cableType?.includes('GP');
      const pathLen = l.pathLength ?? l.length;
      const startH = l.startHeight ?? 0;
      const endH = l.endHeight ?? 0;

      const calculatedLength = isGpWire ? (pathLen * 3) + startH + endH : l.length;
      let lengthStr = `${calculatedLength.toFixed(2)}m`;

      if (l.pathLength !== undefined) {
        if (isGpWire) {
          lengthStr += ` (${pathLen.toFixed(2)}m x3 + ${startH}m + ${endH}m)`;
        } else {
          lengthStr += ` (${pathLen.toFixed(2)}m + ${startH}m + ${endH}m)`;
        }
      } else if (isGpWire) {
        lengthStr += ` (${l.length.toFixed(2)}m x3)`;
      }

      return [l.label || '', l.from || 'N/A', l.to || 'N/A', l.cableType || 'N/A', lengthStr, l.terminationCount || 0];
    });

    doc.setFontSize(14);
    doc.text('Full LV/AC Cable Schedule', MARGIN, lastY);
    lastY += 6;
    autoTable(doc, {
      startY: lastY,
      head: [['Label', 'From', 'To', 'Cable Type', 'Calculated Length', 'Terminations']],
      body: lvLinesBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#34495e' },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Task List Schedule
  if (params.tasks && params.tasks.length > 0) {
    const getItemName = (id: string) => {
      const eq = params.equipment.find(e => e.id === id);
      if (eq) return eq.name || eq.type;
      const zone = params.zones.find(z => z.id === id);
      if (zone) return zone.name;
      return 'N/A';
    };

    const tasksBody = params.tasks.map(t => [
      t.title,
      getItemName(t.linkedItemId),
      t.status,
      t.assignedTo || 'Unassigned',
      t.description || ''
    ]);
    
    doc.setFontSize(14);
    doc.text('Task List', MARGIN, lastY);
    lastY += 6;
    autoTable(doc, {
      startY: lastY,
      head: [['Title', 'Linked To', 'Status', 'Assigned To', 'Description']],
      body: tasksBody,
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage,
      headStyles: { fillColor: '#2c3e50' },
    });
  }
};

const hasScheduleData = (params: GeneratePdfParams): boolean => {
  return params.equipment.length > 0 ||
         params.containment.length > 0 ||
         params.lines.length > 0 ||
         params.zones.length > 0 ||
         (!!params.pvArrays && params.pvArrays.length > 0) ||
         (!!params.tasks && params.tasks.length > 0) ||
         (!!params.comments && params.comments.trim() !== '');
};

export const generatePdf = async (params: GeneratePdfParams, returnBlob: boolean = false): Promise<Blob | void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.deletePage(1); 

  await addLayoutPage(doc, params);
  
  // Add cable schedule page (new)
  if (params.equipment.length > 0) {
    addCableSchedulePage(doc, params);
  }
  
  // Add enhanced equipment schedules with type marks (new)
  if (params.equipment.length > 0 || params.containment.length > 0) {
    addEnhancedSchedulesPage(doc, params);
  }
  
  if (hasScheduleData(params)) {
    addSchedulesPage(doc, params);
  }
  
  addPageFooter(doc);
  
  if (returnBlob) {
    return doc.output('blob');
  } else {
    const blob = doc.output('blob');
    doc.save(`${params.projectName}.pdf`);
    return blob;
  }
};
