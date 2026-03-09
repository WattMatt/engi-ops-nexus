import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import type { TakeoffMeasurement, TakeoffCatalogItem, TakeoffAssembly, TakeoffZone, BOMLine } from './types';
import { exportTakeoffToExcel } from './takeoffExcelExport';

interface Props {
  measurements: TakeoffMeasurement[];
  catalog: TakeoffCatalogItem[];
  assemblies: TakeoffAssembly[];
  zones: TakeoffZone[];
  onDeleteMeasurement: (id: string) => void;
  takeoffName: string;
}

export function TakeoffBOMPanel({ measurements, catalog, assemblies, zones, onDeleteMeasurement, takeoffName }: Props) {
  const catalogMap = useMemo(() => new Map(catalog.map(c => [c.id, c])), [catalog]);
  const assemblyMap = useMemo(() => new Map(assemblies.map(a => [a.id, a])), [assemblies]);
  const zoneMap = useMemo(() => new Map(zones.map(z => [z.id, z])), [zones]);

  const bomLines = useMemo(() => {
    const lines: (BOMLine & { measurementIds: string[] })[] = [];
    const aggregated = new Map<string, BOMLine & { measurementIds: string[] }>();

    for (const m of measurements) {
      let description = '';
      let conduitSize = '';
      let conduitType = '';
      let unit = 'EA';

      if (m.catalog_id) {
        const cat = catalogMap.get(m.catalog_id);
        if (cat) {
          description = cat.name;
          conduitSize = cat.conduit_size || '';
          conduitType = cat.conduit_type || '';
          unit = cat.unit;
        }
      } else if (m.assembly_id) {
        const asm = assemblyMap.get(m.assembly_id);
        if (asm) {
          description = asm.name;
        }
      }

      const location = m.zone_id ? (zoneMap.get(m.zone_id)?.name || '') : '';
      const key = `${description}|${location}|${m.type}`;
      const qty = m.final_quantity || (m.type === 'count' ? 1 : 0);

      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.quantity += qty;
        existing.measurementIds.push(m.id);
        if (m.remarks && !existing.remarks.includes(m.remarks)) {
          existing.remarks = [existing.remarks, m.remarks].filter(Boolean).join('; ');
        }
      } else {
        aggregated.set(key, {
          description,
          conduitSize,
          conduitType,
          location,
          quantity: qty,
          unit,
          remarks: m.remarks || '',
          source: m.source_reference || 'Drawing',
          measurementIds: [m.id],
        });
      }
    }

    return Array.from(aggregated.values());
  }, [measurements, catalogMap, assemblyMap, zoneMap]);

  const handleExport = () => {
    exportTakeoffToExcel(bomLines, takeoffName);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Bill of Materials</h3>
          <Badge variant="secondary" className="text-xs">{bomLines.length} items</Badge>
        </div>
        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={handleExport} disabled={bomLines.length === 0}>
          <Download className="h-3 w-3" />
          Export XLSX
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[200px]">Description</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bomLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                  No measurements yet. Use the tools to count devices or measure runs.
                </TableCell>
              </TableRow>
            ) : (
              bomLines.map((line, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium">{line.description}</TableCell>
                  <TableCell>{line.conduitSize}</TableCell>
                  <TableCell>{line.conduitType}</TableCell>
                  <TableCell>{line.location}</TableCell>
                  <TableCell className="text-right font-mono">{line.quantity.toFixed(line.unit === 'EA' ? 0 : 2)}</TableCell>
                  <TableCell>{line.unit}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{line.remarks}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => line.measurementIds.forEach(id => onDeleteMeasurement(id))}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
