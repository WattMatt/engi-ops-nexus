import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratePdfParams, EquipmentType, SupplyLine, Task } from '../types';
import { calculateLvCableSummary } from './styleUtils';
import { renderMarkupsToContext } from './drawing';

const MARGIN = 14; // mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

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
};

const addPageFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
    }
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
    const y = (PAGE_HEIGHT - renderHeight) / 2 + 10; // Shift down slightly

    doc.addPage();
    addPageHeader(doc, 'Floor Plan Layout', params.projectName);
    doc.addImage(imageData, 'JPEG', x, y, renderWidth, renderHeight);
};

const addSchedulesPage = (doc: jsPDF, params: GeneratePdfParams) => {
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
        // FIX: Correctly calculate GP wire length and add Label column.
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

export const generatePdf = async (params: GeneratePdfParams) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.deletePage(1); 

    await addLayoutPage(doc, params);
    
    if (hasScheduleData(params)) {
        addSchedulesPage(doc, params);
    }
    
    addPageFooter(doc);
    
    doc.save(`${params.projectName}.pdf`);
};
