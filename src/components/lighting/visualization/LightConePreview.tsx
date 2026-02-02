import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Box } from 'lucide-react';

interface LightConePreviewProps {
  beamAngle: number;
  mountingHeight: number;
  colorTemperature: number;
  lumens: number;
}

export function LightConePreview({
  beamAngle: initialBeamAngle,
  mountingHeight: initialHeight,
  colorTemperature: initialTemp,
  lumens: initialLumens
}: LightConePreviewProps) {
  const [beamAngle, setBeamAngle] = useState(initialBeamAngle);
  const [mountingHeight, setMountingHeight] = useState(initialHeight);
  const [colorTemp, setColorTemp] = useState(initialTemp);
  const [lumens, setLumens] = useState(initialLumens);

  // Calculate beam spread at floor level
  const beamSpread = 2 * mountingHeight * Math.tan((beamAngle * Math.PI) / 360);
  const illuminatedArea = Math.PI * Math.pow(beamSpread / 2, 2);
  const averageLux = lumens / illuminatedArea;

  // Get color temperature display
  const getTempColor = (temp: number) => {
    if (temp < 3000) return 'bg-orange-400';
    if (temp < 4000) return 'bg-yellow-300';
    if (temp < 5000) return 'bg-white';
    return 'bg-blue-100';
  };

  const getTempLabel = (temp: number) => {
    if (temp < 3000) return 'Warm White';
    if (temp < 4000) return 'Neutral White';
    if (temp < 5000) return 'Cool White';
    return 'Daylight';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Light Cone Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Preview Placeholder */}
        <div className="h-48 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">3D preview temporarily unavailable</p>
            <p className="text-xs mt-1">See calculated values below</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Beam Angle: {beamAngle}°</Label>
            <Slider
              value={[beamAngle]}
              onValueChange={(v) => setBeamAngle(v[0])}
              min={15}
              max={120}
              step={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Mounting Height: {mountingHeight}m</Label>
            <Slider
              value={[mountingHeight]}
              onValueChange={(v) => setMountingHeight(v[0])}
              min={2}
              max={6}
              step={0.5}
            />
          </div>
          <div className="space-y-2">
            <Label>Color Temperature: {colorTemp}K</Label>
            <Slider
              value={[colorTemp]}
              onValueChange={(v) => setColorTemp(v[0])}
              min={2700}
              max={6500}
              step={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Lumens: {lumens}</Label>
            <Slider
              value={[lumens]}
              onValueChange={(v) => setLumens(v[0])}
              min={500}
              max={5000}
              step={100}
            />
          </div>
        </div>

        {/* Calculated Values */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Beam Spread</div>
            <div className="text-lg font-bold">{beamSpread.toFixed(1)}m</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Coverage Area</div>
            <div className="text-lg font-bold">{illuminatedArea.toFixed(1)}m²</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Avg. Illuminance</div>
            <div className="text-lg font-bold">{averageLux.toFixed(0)} lux</div>
          </div>
        </div>

        {/* Color Temperature Badge */}
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${getTempColor(colorTemp)}`} />
          <Badge variant="secondary">{getTempLabel(colorTemp)}</Badge>
          <span className="text-sm text-muted-foreground">{colorTemp}K</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default LightConePreview;
