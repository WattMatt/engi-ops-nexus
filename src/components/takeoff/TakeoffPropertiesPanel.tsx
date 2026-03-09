import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Ruler, Hash, Square, Trash2 } from 'lucide-react';
import type { TakeoffMeasurement, TakeoffZone, TakeoffCatalogItem } from './types';

interface Props {
  scaleRatio: number | null;
  measurementUnit: string;
  measurements: TakeoffMeasurement[];
  zones: TakeoffZone[];
  catalog: TakeoffCatalogItem[];
  onDeleteZone: (id: string) => void;
}

export function TakeoffPropertiesPanel({ scaleRatio, measurementUnit, measurements, zones, catalog, onDeleteZone }: Props) {
  const countMeasurements = measurements.filter(m => m.type === 'count').length;
  const linearMeasurements = measurements.filter(m => m.type === 'linear');
  const totalLinearLength = linearMeasurements.reduce((s, m) => s + (m.final_quantity || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</p>

        {/* Scale status */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><Ruler className="h-3 w-3" /> Scale</Label>
          {scaleRatio ? (
            <Badge variant="default" className="text-xs">
              Calibrated ({scaleRatio.toFixed(2)} px/{measurementUnit})
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
              Not set — use Scale tool
            </Badge>
          )}
        </div>

        <Separator />

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-md p-2 text-center">
            <Hash className="h-4 w-4 mx-auto text-primary" />
            <p className="text-lg font-bold">{countMeasurements}</p>
            <p className="text-[10px] text-muted-foreground">Points</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2 text-center">
            <Ruler className="h-4 w-4 mx-auto text-primary" />
            <p className="text-lg font-bold">{totalLinearLength.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">{measurementUnit} runs</p>
          </div>
        </div>

        <Separator />

        {/* Zones */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><Square className="h-3 w-3" /> Zones ({zones.length})</Label>
          {zones.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No zones defined</p>
          ) : (
            <div className="space-y-1">
              {zones.map(z => (
                <div key={z.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                  <div className="h-3 w-3 rounded" style={{ backgroundColor: z.color }} />
                  <span className="flex-1 truncate">{z.name}</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onDeleteZone(z.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
