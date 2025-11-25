import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { CableRoute, Material } from './types';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MaterialTakeoffReportProps {
  route: CableRoute;
  template?: {
    materialMultiplier: number;
    installationMultiplier: number;
    supportsMultiplier: number;
  };
}

const CABLE_PRICES: Record<string, number> = {
  'PVC/PVC': 5.5,
  'PVC/SWA/PVC': 12.5,
  'XLPE/SWA/PVC': 18.0,
  'LSZH': 9.5,
};

export function MaterialTakeoffReport({
  route,
  template = { materialMultiplier: 1, installationMultiplier: 1, supportsMultiplier: 1 },
}: MaterialTakeoffReportProps) {
  const materials = useMemo(() => {
    if (!route.metrics) return [];

    const items: Material[] = [];
    const { totalLength, supportCount, bendCount, complexity } = route.metrics;

    // 1. Cable with waste factor
    const cableLength = totalLength * 1.1; // 10% waste
    const cablePrice = CABLE_PRICES[route.cableType] || 10;
    items.push({
      description: `${route.cableType} Cable`,
      partNumber: `CABLE-${route.cableType.replace(/\//g, '-')}`,
      quantity: Math.ceil(cableLength),
      unit: 'm',
      unitPrice: cablePrice * template.materialMultiplier,
      supplier: 'TLC Direct / CEF',
      notes: 'Includes 10% waste factor',
    });

    // 2. Cable tray brackets
    const brackets = supportCount || Math.ceil(totalLength / 400);
    items.push({
      description: 'Cable Tray Bracket',
      partNumber: 'BRACKET-CT100',
      quantity: brackets * template.supportsMultiplier,
      unit: 'pcs',
      unitPrice: 8.5,
      supplier: 'Unistrut / Hilti',
    });

    // 3. M10 Anchor Bolts
    items.push({
      description: 'M10 x 100mm Anchor Bolt',
      partNumber: 'ANCHOR-M10-100',
      quantity: brackets * 4,
      unit: 'pcs',
      unitPrice: 0.75,
      supplier: 'Screwfix',
      notes: '4 per bracket',
    });

    // 4. Cable glands (2 per termination)
    items.push({
      description: `Cable Gland ${route.diameter}mm`,
      partNumber: `GLAND-${route.diameter}`,
      quantity: 2,
      unit: 'pcs',
      unitPrice: 12.0,
      supplier: 'RS Components',
    });

    // 5. Earth bonding clamps
    items.push({
      description: 'Earth Bonding Clamp',
      partNumber: 'CLAMP-EARTH',
      quantity: 2,
      unit: 'pcs',
      unitPrice: 6.5,
      supplier: 'RS Components',
    });

    // 6. Cable ties (every 300mm)
    const tieCount = Math.ceil((totalLength * 1000) / 300);
    items.push({
      description: 'Heavy Duty Cable Tie 300mm',
      partNumber: 'TIE-HD-300',
      quantity: tieCount,
      unit: 'pcs',
      unitPrice: 0.25,
      supplier: 'RS Components',
    });

    // 7. Cable bend restrictors
    if (bendCount > 0) {
      items.push({
        description: 'Cable Bend Restrictor',
        partNumber: 'BEND-REST',
        quantity: bendCount,
        unit: 'pcs',
        unitPrice: 15.0,
        supplier: 'RS Components',
      });
    }

    // 8. Warning labels
    items.push({
      description: 'Electrical Warning Label',
      partNumber: 'LABEL-WARN',
      quantity: Math.ceil(totalLength / 10),
      unit: 'pcs',
      unitPrice: 0.5,
      supplier: 'RS Components',
      notes: 'Every 10m',
    });

    // 9. Fire barriers (for high complexity)
    if (complexity === 'High') {
      items.push({
        description: 'Intumescent Fire Barrier',
        partNumber: 'FIRE-BARRIER',
        quantity: Math.ceil(totalLength / 10),
        unit: 'pcs',
        unitPrice: 45.0,
        supplier: 'RS Components',
        notes: 'For penetrations',
      });
    }

    // 10. Cable marker strips
    items.push({
      description: 'Cable Marker Strip 5m',
      partNumber: 'MARKER-5M',
      quantity: Math.ceil(totalLength / 5),
      unit: 'roll',
      unitPrice: 8.0,
      supplier: 'RS Components',
    });

    return items;
  }, [route, template]);

  const totalCost = materials.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleExportCSV = () => {
    const headers = ['Description', 'Part Number', 'Quantity', 'Unit', 'Unit Price', 'Total', 'Supplier', 'Notes'];
    const rows = materials.map((m) => [
      m.description,
      m.partNumber,
      m.quantity,
      m.unit,
      m.unitPrice.toFixed(2),
      (m.quantity * m.unitPrice).toFixed(2),
      m.supplier,
      m.notes || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
      '',
      `Total Cost,£${totalCost.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-takeoff-${route.name}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  // Group materials by supplier
  const groupedMaterials = materials.reduce((acc, item) => {
    if (!acc[item.supplier]) {
      acc[item.supplier] = [];
    }
    acc[item.supplier].push(item);
    return acc;
  }, {} as Record<string, Material[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Material Takeoff Report</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {Object.entries(groupedMaterials).map(([supplier, items]) => (
            <div key={supplier}>
              <h3 className="font-semibold text-lg mb-3">{supplier}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">£{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        £{(item.quantity * item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Material Cost</div>
            <div className="text-3xl font-bold text-primary">£{totalCost.toFixed(2)}</div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Supplier Contact Information:</strong></p>
          <p>• TLC Direct: 0800 023 5252 | www.tlc-direct.co.uk</p>
          <p>• CEF: 0333 900 9595 | www.cef.co.uk</p>
          <p>• RS Components: 0330 123 1000 | uk.rs-online.com</p>
          <p>• Unistrut: 0121 326 1110 | www.unistrut.co.uk</p>
          <p>• Hilti: 0800 886 100 | www.hilti.co.uk</p>
          <p>• Screwfix: 0330 123 4140 | www.screwfix.com</p>
        </div>
      </CardContent>
    </Card>
  );
}
