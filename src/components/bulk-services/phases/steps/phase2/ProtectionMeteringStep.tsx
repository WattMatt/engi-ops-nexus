/**
 * Protection & Metering Step
 */

import { Info, Shield, Gauge, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

const PROTECTION_ITEMS = [
  { category: 'Circuit Breakers', items: ['Main incomer breaker', 'Feeder breakers', 'Earth leakage protection'] },
  { category: 'Protection Relays', items: ['Overcurrent protection', 'Earth fault protection', 'Under/over voltage protection'] },
  { category: 'Metering', items: ['Main utility meter', 'Sub-metering (if required)', 'Power quality monitoring'] },
];

export function ProtectionMeteringStep({ document }: StepContentProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Define circuit protection and metering equipment requirements. 
          All equipment must comply with utility specifications and SANS standards.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROTECTION_ITEMS.map(({ category, items }) => (
          <div key={category} className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-3">
              {category.includes('Breaker') && <Shield className="h-4 w-4 text-primary" />}
              {category.includes('Relay') && <Shield className="h-4 w-4 text-amber-500" />}
              {category.includes('Meter') && <Gauge className="h-4 w-4 text-green-500" />}
              <p className="font-medium text-sm">{category}</p>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-muted/30">
        <p className="text-sm font-medium mb-2">Key Requirements:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Metering must be utility-approved type and sealed</li>
          <li>• Protection settings coordinated with utility network</li>
          <li>• Fault level ratings appropriate for installation</li>
          <li>• Test facilities for periodic inspection</li>
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        Document protection and metering specifications in the Sections tab.
      </p>
    </div>
  );
}
