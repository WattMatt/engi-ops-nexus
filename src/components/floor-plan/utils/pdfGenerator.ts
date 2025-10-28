import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { EquipmentItem, SupplyLine, SupplyZone, Containment, ScaleInfo, ViewState, DesignPurpose, PVPanelConfig, PVArrayItem } from '@/types/floor-plan';

interface GeneratePdfOptions {
  pdfDoc: PDFDocumentProxy | null;
  pdfFile: File | null;
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  scaleInfo: ScaleInfo | null;
  viewState: ViewState;
  projectName: string;
  comments: string;
  designPurpose: DesignPurpose;
  pvPanelConfig: PVPanelConfig | null;
  pvArrays: PVArrayItem[];
}

export async function generatePdf(options: GeneratePdfOptions): Promise<Blob> {
  const {
    pdfDoc,
    equipment,
    lines,
    zones,
    containment,
    scaleInfo,
    projectName,
    comments,
    designPurpose,
    pvPanelConfig,
    pvArrays,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.text(`Design Purpose: ${designPurpose}`, margin, yPosition);
  yPosition += 10;

  // Scale info
  if (scaleInfo) {
    doc.text(`Scale: 1 pixel = ${scaleInfo.metersPerPixel.toFixed(4)} meters`, margin, yPosition);
    yPosition += 10;
  }

  // Comments
  if (comments) {
    doc.setFontSize(11);
    doc.text('Notes & Comments:', margin, yPosition);
    yPosition += 7;
    const splitComments = doc.splitTextToSize(comments, pageWidth - 2 * margin);
    doc.text(splitComments, margin, yPosition);
    yPosition += splitComments.length * 5 + 10;
  }

  // PV Summary
  if (pvPanelConfig && pvArrays.length > 0) {
    doc.addPage();
    yPosition = margin;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PV System Summary', margin, yPosition);
    yPosition += 10;

    const totalPanels = pvArrays.reduce((sum, arr) => sum + arr.rows * arr.cols, 0);
    const totalWattage = totalPanels * pvPanelConfig.panelWattage;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Panel Specification: ${pvPanelConfig.panelLengthM}m x ${pvPanelConfig.panelWidthM}m, ${pvPanelConfig.panelWattage}Wp`, margin, yPosition);
    yPosition += 7;
    doc.text(`Total Panels: ${totalPanels}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Total System Power: ${(totalWattage / 1000).toFixed(2)} kWp`, margin, yPosition);
    yPosition += 15;
  }

  // Equipment table
  if (equipment.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment Schedule', margin, yPosition);
    yPosition += 10;

    const equipmentCounts = new Map<string, number>();
    equipment.forEach(item => {
      equipmentCounts.set(item.type, (equipmentCounts.get(item.type) || 0) + 1);
    });

    const equipmentData = Array.from(equipmentCounts.entries()).map(([type, count]) => [type, count.toString()]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Equipment Type', 'Quantity']],
      body: equipmentData,
      theme: 'striped',
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Lines table
  if (lines.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cable Schedule', margin, yPosition);
    yPosition += 10;

    const linesData = lines.map(line => [
      line.from,
      line.to,
      line.cableType,
      line.length ? line.length.toFixed(2) : 'N/A',
      line.terminationCount?.toString() || 'N/A',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['From', 'To', 'Cable Type', 'Length (m)', 'Terminations']],
      body: linesData,
      theme: 'striped',
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Containment table
  if (containment.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Containment Schedule', margin, yPosition);
    yPosition += 10;

    const containmentSummary = new Map<string, number>();
    containment.forEach(c => {
      const key = `${c.type} (${c.size || 'unspecified'})`;
      containmentSummary.set(key, (containmentSummary.get(key) || 0) + (c.length || 0));
    });

    const containmentData = Array.from(containmentSummary.entries()).map(([type, length]) => [
      type,
      length.toFixed(2),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Containment Type', 'Total Length (m)']],
      body: containmentData,
      theme: 'striped',
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Zones table
  if (zones.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Zone Summary', margin, yPosition);
    yPosition += 10;

    const totalArea = zones.reduce((sum, z) => sum + (z.area || 0), 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Zoned Area: ${totalArea.toFixed(2)} m²`, margin, yPosition);
    yPosition += 10;
  }

  // PDF as attachment (if available)
  if (pdfDoc) {
    try {
      doc.addPage();
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      }
    } catch (error) {
      console.error('Error rendering PDF page:', error);
    }
  }

  return doc.output('blob');
}