import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CableCalculationFormulasProps {
  schedule: any;
}

export const CableCalculationFormulas = ({ schedule }: CableCalculationFormulasProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculation Standards & Formulas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Standard Reference */}
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Badge variant="outline">SANS 10142-1</Badge>
            Design Standard
          </h3>
          <p className="text-sm text-muted-foreground">
            South African National Standard for the wiring of premises
          </p>
        </div>

        <Separator />

        {/* Current Carrying Capacity */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Current Carrying Capacity
          </h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-1">
            <div><span className="text-primary font-bold">I<sub>z</sub></span> = Design Current (A)</div>
            <div><span className="text-primary font-bold">I<sub>b</sub></span> = Load Current (A)</div>
            <div><span className="text-primary font-bold">I<sub>n</sub></span> = Protection Device Rating (A)</div>
            <div className="pt-2 border-t border-border/50">
              Required: <span className="text-primary font-bold">I<sub>z</sub> ≥ I<sub>n</sub> ≥ I<sub>b</sub></span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cable must handle protection device rating, which must be ≥ load current
          </p>
        </div>

        <Separator />

        {/* Derating Factors */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Derating Factors</h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
            <div>
              <div className="text-primary font-bold mb-1">Effective Rating = I<sub>rated</sub> × C<sub>a</sub> × C<sub>g</sub> × C<sub>i</sub></div>
            </div>
            <div className="space-y-1 text-muted-foreground">
              <div><span className="text-foreground">C<sub>a</sub></span> = Ambient Temperature Factor</div>
              <div><span className="text-foreground">C<sub>g</sub></span> = Grouping Factor (multiple circuits)</div>
              <div><span className="text-foreground">C<sub>i</sub></span> = Thermal Insulation Factor</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground">Ambient Temp</div>
              <div className="font-semibold">30°C baseline</div>
              <div className="text-[10px] text-muted-foreground">+5°C = 0.91×, +10°C = 0.82×</div>
            </div>
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground">Grouping</div>
              <div className="font-semibold">2 circuits = 0.80×</div>
              <div className="text-[10px] text-muted-foreground">3 circuits = 0.70×, 4+ = 0.65×</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Voltage Drop Calculations */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Voltage Drop Calculation</h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
            <div>
              <div className="text-amber-600 dark:text-amber-400 font-bold mb-1">3-Phase Circuits:</div>
              <div className="text-primary font-bold">V<sub>d</sub> = √3 × I<sub>b</sub> × L × (R×cos φ + X×sin φ)</div>
            </div>
            <div className="pt-2 border-t border-border/50">
              <div className="text-blue-600 dark:text-blue-400 font-bold mb-1">Single-Phase Circuits:</div>
              <div className="text-primary font-bold">V<sub>d</sub> = 2 × I<sub>b</sub> × L × (R×cos φ + X×sin φ)</div>
            </div>
            <div className="pt-2 border-t border-border/50 space-y-1 text-muted-foreground">
              <div><span className="text-foreground">V<sub>d</sub></span> = Voltage Drop (V)</div>
              <div><span className="text-foreground">I<sub>b</sub></span> = Load Current (A)</div>
              <div><span className="text-foreground">L</span> = Cable Length (km)</div>
              <div><span className="text-foreground">R</span> = Resistance (Ω/km)</div>
              <div><span className="text-foreground">X</span> = Reactance (Ω/km)</div>
              <div><span className="text-foreground">cos φ</span> = Power Factor</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground">Max Voltage Drop</div>
              <div className="font-semibold text-amber-600 dark:text-amber-400">400V: 5% (20V)</div>
              <div className="text-[10px] text-muted-foreground">230V: 3% (6.9V)</div>
            </div>
            <div className="bg-background p-2 rounded border">
              <div className="text-muted-foreground">Power Factor</div>
              <div className="font-semibold">Typical: 0.85</div>
              <div className="text-[10px] text-muted-foreground">Lighting: 0.95, Motors: 0.80</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Short Circuit Protection */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Short Circuit Protection</h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
            <div className="text-primary font-bold">
              k²S² ≥ I²<sub>f</sub> × t
            </div>
            <div className="space-y-1 text-muted-foreground">
              <div><span className="text-foreground">k</span> = Material constant (Cu: 115, Al: 76)</div>
              <div><span className="text-foreground">S</span> = Cross-sectional area (mm²)</div>
              <div><span className="text-foreground">I<sub>f</sub></span> = Fault current (A)</div>
              <div><span className="text-foreground">t</span> = Disconnection time (s)</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cable must withstand fault current until protection device operates
          </p>
        </div>

        <Separator />

        {/* Parallel Cables */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Parallel Cable Configuration</h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
            <div>
              <div className="text-primary font-bold mb-1">Load per Cable = I<sub>total</sub> / n</div>
              <div className="text-primary font-bold">V<sub>d,parallel</sub> = V<sub>d,single</sub> / n</div>
            </div>
            <div className="pt-2 border-t border-border/50 text-muted-foreground">
              <div><span className="text-foreground">n</span> = Number of parallel cables</div>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded text-xs">
            <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Important:</div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li>All parallel cables must be same type, size, length</li>
              <li>Each cable must have independent protection</li>
              <li>Maximum 4 cables recommended per circuit</li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* Cost Calculation */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Cost Calculation</h3>
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
            <div>
              <div className="text-primary font-bold mb-1">Total Cost = (Supply + Install) × Length × Quantity</div>
            </div>
            <div className="pt-2 border-t border-border/50 space-y-1 text-muted-foreground">
              <div>Supply = Material cost (R/m)</div>
              <div>Install = Labor + accessories (R/m)</div>
              <div>Length = Total cable run (m)</div>
              <div>Quantity = Number of parallel cables</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
