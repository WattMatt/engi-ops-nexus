import { DesignState } from "@/components/floorplan/types";
import { EQUIPMENT_LABELS } from "@/components/floorplan/constants";

export interface BoqItem {
  code: string;
  description: string;
  unit: string;
  quantity: number;
}

export interface BoqSection {
  title: string;
  items: BoqItem[];
}

export function generateBoq(state: DesignState, projectName: string): string {
  const sections: BoqSection[] = [];

  // Equipment Section
  const equipmentCounts = state.equipment.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (Object.keys(equipmentCounts).length > 0) {
    sections.push({
      title: "ELECTRICAL EQUIPMENT",
      items: Object.entries(equipmentCounts).map(([type, count]) => ({
        code: EQUIPMENT_LABELS[type as any] || type.toUpperCase(),
        description: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        unit: 'Nr',
        quantity: count,
      })),
    });
  }

  // Cables Section
  const cableCounts = state.lines.reduce((acc, line) => {
    const key = `${line.type}-${line.cableSize || 'unknown'}`;
    const desc = `${line.type.toUpperCase()} Cable ${line.cableSize || ''}`;
    if (!acc[key]) {
      acc[key] = { description: desc, totalLength: 0 };
    }
    acc[key].totalLength += line.lengthMeters || 0;
    return acc;
  }, {} as Record<string, { description: string; totalLength: number }>);

  if (Object.keys(cableCounts).length > 0) {
    sections.push({
      title: "CABLES & WIRING",
      items: Object.entries(cableCounts).map(([key, data], index) => ({
        code: `CBL-${index + 1}`,
        description: data.description,
        unit: 'm',
        quantity: Math.ceil(data.totalLength),
      })),
    });
  }

  // Containment Section
  const containmentCounts = state.containment.reduce((acc, cont) => {
    const key = `${cont.type}-${cont.size || 'standard'}`;
    const desc = `${cont.type.split('-').join(' ')} ${cont.size || ''}`;
    if (!acc[key]) {
      acc[key] = { description: desc, totalLength: 0 };
    }
    acc[key].totalLength += cont.lengthMeters || 0;
    return acc;
  }, {} as Record<string, { description: string; totalLength: number }>);

  if (Object.keys(containmentCounts).length > 0) {
    sections.push({
      title: "CONTAINMENT SYSTEMS",
      items: Object.entries(containmentCounts).map(([key, data], index) => ({
        code: `CNT-${index + 1}`,
        description: data.description.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        unit: 'm',
        quantity: Math.ceil(data.totalLength),
      })),
    });
  }

  // Zones Section
  if (state.zones.length > 0) {
    sections.push({
      title: "ZONES & AREAS",
      items: state.zones.map((zone, index) => ({
        code: `ZONE-${index + 1}`,
        description: `${zone.name || zone.type} Zone`,
        unit: 'm²',
        quantity: Math.ceil(zone.areaSqm || 0),
      })),
    });
  }

  // PV Arrays Section
  if (state.pvArrays.length > 0) {
    sections.push({
      title: "SOLAR PV ARRAYS",
      items: state.pvArrays.map((arr, index) => ({
        code: `PV-${index + 1}`,
        description: `PV Array ${arr.rows}x${arr.columns} (${arr.orientation})`,
        unit: 'Nr',
        quantity: arr.totalPanels,
      })),
    });
  }

  // Generate formatted BOQ text
  let boqText = `BILL OF QUANTITIES\n`;
  boqText += `Project: ${projectName}\n`;
  boqText += `Generated: ${new Date().toLocaleDateString()}\n`;
  boqText += `${'='.repeat(80)}\n\n`;

  sections.forEach((section, sectionIndex) => {
    boqText += `${sectionIndex + 1}. ${section.title}\n`;
    boqText += `${'-'.repeat(80)}\n`;
    boqText += `${'Code'.padEnd(12)} ${'Description'.padEnd(40)} ${'Unit'.padEnd(8)} ${'Qty'.padStart(10)}\n`;
    boqText += `${'-'.repeat(80)}\n`;

    section.items.forEach((item) => {
      boqText += `${item.code.padEnd(12)} ${item.description.padEnd(40)} ${item.unit.padEnd(8)} ${item.quantity.toString().padStart(10)}\n`;
    });

    boqText += `\n`;
  });

  return boqText;
}

export function exportBoqToCsv(state: DesignState, projectName: string): string {
  let csv = 'Section,Code,Description,Unit,Quantity\n';

  const sections = generateBoqSections(state);
  
  sections.forEach((section) => {
    section.items.forEach((item) => {
      csv += `"${section.title}","${item.code}","${item.description}","${item.unit}",${item.quantity}\n`;
    });
  });

  return csv;
}

function generateBoqSections(state: DesignState): BoqSection[] {
  const sections: BoqSection[] = [];

  // Equipment
  const equipmentCounts = state.equipment.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (Object.keys(equipmentCounts).length > 0) {
    sections.push({
      title: "ELECTRICAL EQUIPMENT",
      items: Object.entries(equipmentCounts).map(([type, count]) => ({
        code: EQUIPMENT_LABELS[type as any] || type.toUpperCase(),
        description: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        unit: 'Nr',
        quantity: count,
      })),
    });
  }

  return sections;
}
