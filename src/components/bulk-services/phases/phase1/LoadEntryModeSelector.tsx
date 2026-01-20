/**
 * Load Entry Mode Selector
 * Allows users to choose how to enter connected loads
 */

import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { List, LayoutGrid, Calculator } from 'lucide-react';

export type LoadEntryMode = 'itemized' | 'category' | 'total';

interface LoadEntryModeSelectorProps {
  mode: LoadEntryMode;
  onModeChange: (mode: LoadEntryMode) => void;
}

export function LoadEntryModeSelector({ mode, onModeChange }: LoadEntryModeSelectorProps) {
  return (
    <RadioGroup 
      value={mode} 
      onValueChange={(v) => onModeChange(v as LoadEntryMode)}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <Label
        htmlFor="itemized"
        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
          mode === 'itemized' 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
      >
        <RadioGroupItem value="itemized" id="itemized" className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary" />
            <span className="font-medium">Itemized Schedule</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Add individual loads (HVAC units, motors, lighting circuits) with ratings
          </p>
          <Badge variant="outline" className="mt-2 text-xs">Most Accurate</Badge>
        </div>
      </Label>

      <Label
        htmlFor="category"
        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
          mode === 'category' 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
      >
        <RadioGroupItem value="category" id="category" className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <span className="font-medium">Category Totals</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enter totals per category (lighting kW, HVAC kW, motors kW)
          </p>
          <Badge variant="outline" className="mt-2 text-xs">Balanced</Badge>
        </div>
      </Label>

      <Label
        htmlFor="total"
        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
          mode === 'total' 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
      >
        <RadioGroupItem value="total" id="total" className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="font-medium">Single Total</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enter total connected load directly or use SANS 204 calculator
          </p>
          <Badge variant="outline" className="mt-2 text-xs">Quick Entry</Badge>
        </div>
      </Label>
    </RadioGroup>
  );
}
