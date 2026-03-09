import * as XLSX from 'xlsx';
import type { BOMLine } from './types';

export function exportTakeoffToExcel(bomLines: BOMLine[], takeoffName: string) {
  const headers = [
    'Item Description',
    'Conduit Size',
    'Conduit Type',
    'Location',
    'Quantity',
    'Unit of Measure',
    'Remarks for Special Conditions',
    'Source',
  ];

  const rows = bomLines.map(line => [
    line.description,
    line.conduitSize,
    line.conduitType,
    line.location,
    line.quantity,
    line.unit,
    line.remarks,
    line.source,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, // Description
    { wch: 12 }, // Conduit Size
    { wch: 12 }, // Conduit Type
    { wch: 18 }, // Location
    { wch: 10 }, // Qty
    { wch: 10 }, // Unit
    { wch: 30 }, // Remarks
    { wch: 15 }, // Source
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Takeoff');
  XLSX.writeFile(wb, `${takeoffName.replace(/[^a-zA-Z0-9]/g, '_')}_Takeoff.xlsx`);
}
