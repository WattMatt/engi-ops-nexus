import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Eye, 
  EyeOff, 
  Download, 
  Filter,
  Palette,
  Layers
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface LightingLayerControlsProps {
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  filterType: string | null;
  onFilterTypeChange: (type: string | null) => void;
  colorMode: 'type' | 'status';
  onColorModeChange: (mode: 'type' | 'status') => void;
  onExportToSchedule: () => void;
  placementCount: number;
  totalWattage: number;
}

export const LightingLayerControls = ({
  isVisible,
  onVisibilityChange,
  opacity,
  onOpacityChange,
  filterType,
  onFilterTypeChange,
  colorMode,
  onColorModeChange,
  onExportToSchedule,
  placementCount,
  totalWattage
}: LightingLayerControlsProps) => {
  const fittingTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'downlight', label: 'Downlights' },
    { value: 'panel', label: 'Panels' },
    { value: 'linear', label: 'Linear' },
    { value: 'track', label: 'Track' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'spotlight', label: 'Spotlights' },
  ];

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Lighting Layer
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {placementCount} fittings
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalWattage}W
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visibility Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="lighting-visibility" className="flex items-center gap-2">
            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Show Lighting
          </Label>
          <Switch
            id="lighting-visibility"
            checked={isVisible}
            onCheckedChange={onVisibilityChange}
          />
        </div>

        {/* Opacity Slider */}
        {isVisible && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Layer Opacity</Label>
            <Slider
              value={[opacity]}
              onValueChange={([value]) => onOpacityChange(value)}
              min={0}
              max={100}
              step={5}
            />
            <div className="text-xs text-right text-muted-foreground">{opacity}%</div>
          </div>
        )}

        {/* Filter by Type */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Filter by Type</Label>
          <Select 
            value={filterType || 'all'} 
            onValueChange={(v) => onFilterTypeChange(v === 'all' ? null : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fittingTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color Mode */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Color By</Label>
          <div className="flex gap-2">
            <Button
              variant={colorMode === 'type' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => onColorModeChange('type')}
            >
              <Palette className="h-4 w-4 mr-1" />
              Type
            </Button>
            <Button
              variant={colorMode === 'status' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => onColorModeChange('status')}
            >
              <Filter className="h-4 w-4 mr-1" />
              Status
            </Button>
          </div>
        </div>

        {/* Color Legend based on mode */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {colorMode === 'type' ? 'Type Legend' : 'Status Legend'}
          </Label>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {colorMode === 'type' ? (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Downlight</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-chart-1" />
                  <span>Panel</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-chart-2" />
                  <span>Linear</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-chart-3" />
                  <span>Track</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span>Emergency</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-chart-4" />
                  <span>Spotlight</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Approved</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Changes Req.</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span>No Status</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Export Button */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onExportToSchedule}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Schedule
        </Button>
      </CardContent>
    </Card>
  );
};

export default LightingLayerControls;
