/**
 * Cable Infrastructure Step
 */

import { Info, Cable, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

export function CableInfrastructureStep({ document }: StepContentProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Plan the cable routing from point of supply to main distribution. 
          Consider underground vs overhead options based on site requirements.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Cable className="h-5 w-5 text-primary" />
            <p className="font-medium">Underground Cables</p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• XLPE insulated cables</li>
            <li>• Cable trenches or ducts</li>
            <li>• Joint boxes and terminations</li>
            <li>• Route markers</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-amber-500" />
            <p className="font-medium">Overhead Lines</p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Pole structures</li>
            <li>• Conductor selection</li>
            <li>• Clearances and spans</li>
            <li>• Lightning protection</li>
          </ul>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30">
        <p className="text-sm font-medium mb-2">Design Considerations:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Voltage drop calculations</li>
          <li>• Current carrying capacity</li>
          <li>• Fault level withstand</li>
          <li>• Future expansion provisions</li>
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        Use the Drawing Markup tool in Phase 4 to indicate cable routes.
      </p>
    </div>
  );
}
