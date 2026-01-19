import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Check, Download } from 'lucide-react';
import { LightingFitting } from '../lightingTypes';
import { ComparisonSettings, calculateMetrics } from './comparisonTypes';
import { CostAnalysisPanel } from './CostAnalysisPanel';
import { EnergyAnalysisPanel } from './EnergyAnalysisPanel';
import { EfficiencyMetrics } from './EfficiencyMetrics';
import { generateComparisonPDF } from './comparisonPdfExport';
import { toast } from 'sonner';

interface ComparisonMatrixProps {
  fittings: LightingFitting[];
  settings: ComparisonSettings;
  onSettingsChange: (settings: ComparisonSettings) => void;
}

interface ComparisonRow {
  property: string;
  values: (string | number | null)[];
  bestIndex?: number;
  format?: 'currency' | 'number' | 'text';
  higherIsBetter?: boolean;
}

export const ComparisonMatrix = ({
  fittings,
  settings,
  onSettingsChange,
}: ComparisonMatrixProps) => {
  const [generalOpen, setGeneralOpen] = useState(true);
  const [performanceOpen, setPerformanceOpen] = useState(true);
  const [costsOpen, setCostsOpen] = useState(true);
  const [physicalOpen, setPhysicalOpen] = useState(false);

  const metrics = useMemo(() => {
    return fittings.map((f) => calculateMetrics(f, 1, settings));
  }, [fittings, settings]);

  const findBestIndex = (
    values: (number | null)[],
    higherIsBetter: boolean
  ): number | undefined => {
    const validValues = values.map((v, i) => ({ v, i })).filter((x) => x.v !== null);
    if (validValues.length < 2) return undefined;
    
    const sorted = [...validValues].sort((a, b) =>
      higherIsBetter ? (b.v! - a.v!) : (a.v! - b.v!)
    );
    return sorted[0].i;
  };

  const generalRows: ComparisonRow[] = [
    { property: 'Code', values: fittings.map((f) => f.fitting_code), format: 'text' },
    { property: 'Manufacturer', values: fittings.map((f) => f.manufacturer || '-'), format: 'text' },
    { property: 'Model', values: fittings.map((f) => f.model_name), format: 'text' },
    { property: 'Type', values: fittings.map((f) => f.fitting_type), format: 'text' },
  ];

  const performanceRows: ComparisonRow[] = useMemo(() => {
    const wattages = fittings.map((f) => f.wattage);
    const lumens = fittings.map((f) => f.lumen_output);
    const efficacies = metrics.map((m) => m.efficacy);
    const cris = fittings.map((f) => f.cri);
    const temps = fittings.map((f) => f.color_temperature);

    return [
      {
        property: 'Wattage',
        values: wattages.map((w) => (w ? `${w}W` : '-')),
        bestIndex: findBestIndex(wattages, false),
        format: 'text',
      },
      {
        property: 'Lumen Output',
        values: lumens.map((l) => (l ? `${l}lm` : '-')),
        bestIndex: findBestIndex(lumens, true),
        format: 'text',
      },
      {
        property: 'Efficacy (lm/W)',
        values: efficacies.map((e) => (e > 0 ? e.toFixed(1) : '-')),
        bestIndex: findBestIndex(efficacies, true),
        format: 'text',
      },
      {
        property: 'Color Temp',
        values: temps.map((t) => (t ? `${t}K` : '-')),
        format: 'text',
      },
      {
        property: 'CRI',
        values: cris.map((c) => (c ? c.toString() : '-')),
        bestIndex: findBestIndex(cris, true),
        format: 'text',
      },
      {
        property: 'Beam Angle',
        values: fittings.map((f) => (f.beam_angle ? `${f.beam_angle}°` : '-')),
        format: 'text',
      },
    ];
  }, [fittings, metrics]);

  const costRows: ComparisonRow[] = useMemo(() => {
    const supplyCosts = fittings.map((f) => f.supply_cost);
    const installCosts = fittings.map((f) => f.install_cost);
    const totalCosts = metrics.map((m) => m.totalCost);
    const costPerKLumen = metrics.map((m) => m.costPerKLumen);

    return [
      {
        property: 'Supply Cost',
        values: supplyCosts,
        bestIndex: findBestIndex(supplyCosts, false),
        format: 'currency',
      },
      {
        property: 'Install Cost',
        values: installCosts,
        bestIndex: findBestIndex(installCosts, false),
        format: 'currency',
      },
      {
        property: 'Total Cost',
        values: totalCosts,
        bestIndex: findBestIndex(totalCosts, false),
        format: 'currency',
      },
      {
        property: 'Cost/1000lm',
        values: costPerKLumen.map((c) => (c > 0 ? c : null)),
        bestIndex: findBestIndex(costPerKLumen, false),
        format: 'currency',
      },
    ];
  }, [fittings, metrics]);

  const physicalRows: ComparisonRow[] = [
    { property: 'IP Rating', values: fittings.map((f) => f.ip_rating || '-'), format: 'text' },
    { property: 'IK Rating', values: fittings.map((f) => f.ik_rating || '-'), format: 'text' },
    { property: 'Dimensions', values: fittings.map((f) => f.dimensions || '-'), format: 'text' },
    { property: 'Weight', values: fittings.map((f) => (f.weight ? `${f.weight}kg` : '-')), format: 'text' },
    { property: 'Lifespan', values: fittings.map((f) => (f.lifespan_hours ? `${f.lifespan_hours.toLocaleString()}h` : '-')), format: 'text' },
    { property: 'Dimmable', values: fittings.map((f) => (f.is_dimmable ? 'Yes' : 'No')), format: 'text' },
    { property: 'Driver Type', values: fittings.map((f) => f.driver_type || '-'), format: 'text' },
  ];

  const formatValue = (value: string | number | null, format?: string) => {
    if (value === null || value === '-') return '-';
    if (format === 'currency' && typeof value === 'number') {
      return `R${value.toFixed(2)}`;
    }
    return String(value);
  };

  const exportToPDF = async () => {
    try {
      await generateComparisonPDF({
        fittings,
        generalRows,
        performanceRows,
        costRows,
        physicalRows,
      });
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF');
    }
  };

  const renderSection = (
    title: string,
    rows: ComparisonRow[],
    isOpen: boolean,
    setOpen: (open: boolean) => void
  ) => (
    <Collapsible open={isOpen} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <span className="font-semibold">{title}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: `180px repeat(${fittings.length}, 1fr)` }}
            >
              <div className="p-2 bg-muted/30 font-medium text-sm border-r">
                {row.property}
              </div>
              {row.values.map((value, colIndex) => (
                <div
                  key={colIndex}
                  className={`p-2 text-sm text-center ${
                    row.bestIndex === colIndex ? 'bg-green-50 dark:bg-green-950' : ''
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {formatValue(value, row.format)}
                    {row.bestIndex === colIndex && (
                      <Check className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="space-y-4">
      {/* Comparison Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Comparison Matrix</CardTitle>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
          {/* Header row with fitting names */}
          <div
            className="grid mt-2"
            style={{ gridTemplateColumns: `180px repeat(${fittings.length}, 1fr)` }}
          >
            <div className="p-2" />
            {fittings.map((fitting) => (
              <div key={fitting.id} className="p-2 text-center">
                <Badge variant="outline" className="mb-1">
                  {fitting.fitting_code}
                </Badge>
                <p className="text-xs text-muted-foreground truncate">
                  {fitting.manufacturer}
                </p>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border rounded-lg overflow-hidden">
            {renderSection('General', generalRows, generalOpen, setGeneralOpen)}
            {renderSection('Performance', performanceRows, performanceOpen, setPerformanceOpen)}
            {renderSection('Costs', costRows, costsOpen, setCostsOpen)}
            {renderSection('Physical', physicalRows, physicalOpen, setPhysicalOpen)}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Metrics */}
      <EfficiencyMetrics metrics={metrics} />

      {/* Cost Analysis */}
      <CostAnalysisPanel
        fittings={fittings}
        settings={settings}
      />

      {/* Energy Analysis */}
      <EnergyAnalysisPanel
        fittings={fittings}
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
};
