/**
 * Cable Schedule Registration
 * 
 * Defines how Cable Schedule reports are generated.
 * Orientation: Landscape (to fit many columns)
 */

import type { Content } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, tableLayouts } from '../../styles';
import { dataTable, pageBreak } from '../../helpers';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface CableEntry {
  tag: string;
  from: string;
  to: string;
  voltage: string; // "400V" or "230V"
  load: number;    // Amps
  type: string;    // "ECC", "PV", etc.
  size: string;    // "4x16mm²"
  length: number;  // Meters
  voltDrop: number; // Percent
  status?: string;  // "Planned", "Installed"
  notes?: string;
}

export interface CableScheduleData {
  scheduleName: string;
  revision: string;
  entries: CableEntry[];
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

function buildCableScheduleContent(data: CableScheduleData, config: ReportConfig): Content[] {
  // Group by voltage or other criteria? For now, just a flat list.
  // We can group by 'from' location later if requested.

  const tableData = data.entries.map(cable => ({
    tag: cable.tag,
    route: `${cable.from} → ${cable.to}`,
    spec: `${cable.size} ${cable.type}`,
    load: `${cable.load.toFixed(1)}A`,
    len: `${cable.length.toFixed(1)}m`,
    vd: `${cable.voltDrop.toFixed(2)}%`,
    notes: cable.notes || ''
  }));

  return [
    { text: `${config.projectName?.toUpperCase() || 'PROJECT'} - CABLE SCHEDULE`, style: 'headerLabel' },
    { text: data.scheduleName.toUpperCase(), style: 'h2', margin: [0, 10, 0, 15] },
    
    dataTable(
      [
        { header: 'Tag', field: 'tag', width: 60 },
        { header: 'Route (From → To)', field: 'route', width: '*' },
        { header: 'Cable Spec', field: 'spec', width: 120 },
        { header: 'Load', field: 'load', width: 60, align: 'right' },
        { header: 'Length', field: 'len', width: 60, align: 'right' },
        { header: 'Volt Drop', field: 'vd', width: 60, align: 'right' },
        { header: 'Notes', field: 'notes', width: 100 }
      ],
      tableData,
      { layout: 'zebra' }
    ),
    
    // Add page break if needed, though engine handles flow
  ];
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<CableScheduleData>({
  type: 'cable-schedule',
  name: 'Cable Schedule Report',
  description: 'Complete schedule of electrical cables with sizing and voltage drop calculations',
  
  defaultConfig: {
    includeCoverPage: true,
    page: {
      orientation: 'landscape', // Landscape for wide tables
      size: 'A4',
      margins: [20, 20, 20, 20]
    },
  },
  
  buildContent: buildCableScheduleContent,
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'client',
}));
