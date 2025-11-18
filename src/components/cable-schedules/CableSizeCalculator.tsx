import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { calculateCableSize } from "@/utils/cableSizing";
import { useCalculationSettings } from "@/hooks/useCalculationSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface CableSizeCalculatorProps {
  projectId: string;
}

export const CableSizeCalculator = ({ projectId }: CableSizeCalculatorProps) => {
  const { data: settings } = useCalculationSettings(projectId);
  
  const [inputs, setInputs] = useState({
    loadAmps: "",
    voltage: "400",
    length: "",
    cableMaterial: "Aluminium",
    installMethod: "air",
    powerFactor: "0.85",
    ambientTemp: "30",
    groupingFactor: "1.0",
    voltDropLimit: "5.0",
  });

  const [result, setResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  // Update defaults when settings load
  useEffect(() => {
    if (settings) {
      setInputs(prev => ({
        ...prev,
        cableMaterial: settings.default_cable_material || "Aluminium",
        installMethod: settings.default_installation_method || "air",
        powerFactor: settings.power_factor_power?.toString() || "0.85",
        ambientTemp: settings.ambient_temp_baseline?.toString() || "30",
        voltDropLimit: (inputs.voltage === "400" 
          ? settings.voltage_drop_limit_400v?.toString() 
          : settings.voltage_drop_limit_230v?.toString()) || "5.0",
      }));
    }
  }, [settings]);

  // Auto-calculate when inputs change
  useEffect(() => {
    const loadAmps = parseFloat(inputs.loadAmps);
    const voltage = parseFloat(inputs.voltage);
    const length = parseFloat(inputs.length);

    if (loadAmps && voltage && length && loadAmps > 0 && length > 0) {
      calculate();
    } else {
      setResult(null);
    }
  }, [inputs]);

  const calculate = () => {
    setCalculating(true);
    
    try {
      const loadAmps = parseFloat(inputs.loadAmps);
      const voltage = parseFloat(inputs.voltage);
      const length = parseFloat(inputs.length);
      const powerFactor = parseFloat(inputs.powerFactor);

      if (!loadAmps || !voltage || !length) {
        setResult(null);
        return;
      }

      const calcResult = calculateCableSize({
        loadAmps,
        voltage,
        totalLength: length,
        material: inputs.cableMaterial.toLowerCase() as "copper" | "aluminium",
        installationMethod: inputs.installMethod as "ground" | "ducts" | "air",
        safetyMargin: settings?.cable_safety_margin || 1.15,
        voltageDropLimit: parseFloat(inputs.voltDropLimit),
      });

      setResult(calcResult);
    } catch (error) {
      console.error("Calculation error:", error);
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  const voltDropColor = result 
    ? result.voltDropPercentage > parseFloat(inputs.voltDropLimit) 
      ? "text-destructive" 
      : "text-success"
    : "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Cable Size Calculator</CardTitle>
        </div>
        <CardDescription>
          Instant cable sizing calculations per SANS 10142-1
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Load Current */}
          <div className="space-y-2">
            <Label htmlFor="calc-load">Load Current (A) *</Label>
            <Input
              id="calc-load"
              type="number"
              placeholder="500"
              value={inputs.loadAmps}
              onChange={(e) => setInputs({ ...inputs, loadAmps: e.target.value })}
              className="font-mono"
            />
          </div>

          {/* Voltage */}
          <div className="space-y-2">
            <Label htmlFor="calc-voltage">Voltage (V) *</Label>
            <Select
              value={inputs.voltage}
              onValueChange={(value) => {
                setInputs({ 
                  ...inputs, 
                  voltage: value,
                  voltDropLimit: value === "400" 
                    ? (settings?.voltage_drop_limit_400v?.toString() || "5.0")
                    : (settings?.voltage_drop_limit_230v?.toString() || "3.0")
                });
              }}
            >
              <SelectTrigger id="calc-voltage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="230">230V (Single Phase)</SelectItem>
                <SelectItem value="400">400V (Three Phase)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Length */}
          <div className="space-y-2">
            <Label htmlFor="calc-length">Cable Length (m) *</Label>
            <Input
              id="calc-length"
              type="number"
              placeholder="50"
              value={inputs.length}
              onChange={(e) => setInputs({ ...inputs, length: e.target.value })}
              className="font-mono"
            />
          </div>

          {/* Cable Material */}
          <div className="space-y-2">
            <Label htmlFor="calc-material">Material</Label>
            <Select
              value={inputs.cableMaterial}
              onValueChange={(value) => setInputs({ ...inputs, cableMaterial: value })}
            >
              <SelectTrigger id="calc-material">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Copper">Copper</SelectItem>
                <SelectItem value="Aluminium">Aluminium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Installation Method */}
          <div className="space-y-2">
            <Label htmlFor="calc-method">Installation</Label>
            <Select
              value={inputs.installMethod}
              onValueChange={(value) => setInputs({ ...inputs, installMethod: value })}
            >
              <SelectTrigger id="calc-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="air">In Air / On Cable Tray</SelectItem>
                <SelectItem value="ducts">In Ducts / Conduit</SelectItem>
                <SelectItem value="ground">Underground</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Power Factor */}
          <div className="space-y-2">
            <Label htmlFor="calc-pf">Power Factor</Label>
            <Input
              id="calc-pf"
              type="number"
              step="0.01"
              min="0.1"
              max="1"
              value={inputs.powerFactor}
              onChange={(e) => setInputs({ ...inputs, powerFactor: e.target.value })}
              className="font-mono"
            />
          </div>
        </div>

        <Separator />

        {/* Advanced Parameters */}
        <details className="space-y-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Advanced Parameters
          </summary>
          <div className="grid gap-4 md:grid-cols-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="calc-temp">Ambient Temp (°C)</Label>
              <Input
                id="calc-temp"
                type="number"
                value={inputs.ambientTemp}
                onChange={(e) => setInputs({ ...inputs, ambientTemp: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-grouping">Grouping Factor</Label>
              <Input
                id="calc-grouping"
                type="number"
                step="0.1"
                value={inputs.groupingFactor}
                onChange={(e) => setInputs({ ...inputs, groupingFactor: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-vdrop">Max V-Drop (%)</Label>
              <Input
                id="calc-vdrop"
                type="number"
                step="0.1"
                value={inputs.voltDropLimit}
                onChange={(e) => setInputs({ ...inputs, voltDropLimit: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>
        </details>

        <Separator />

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="font-semibold text-lg">Calculation Results</h3>
            </div>

            {/* Main Result Card */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Recommended Cable Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {result.cableSize}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {inputs.cableMaterial} Cable
                  </p>
                </CardContent>
              </Card>

              <Card className={result.voltDropPercentage > parseFloat(inputs.voltDropLimit) ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Voltage Drop
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${voltDropColor}`}>
                    {result.voltDropPercentage.toFixed(2)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.voltDrop.toFixed(2)}V drop
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Technical Details */}
            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Current Rating</p>
                <p className="font-semibold font-mono">{result.currentRating}A</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Resistance</p>
                <p className="font-semibold font-mono">{result.resistance.toFixed(4)} Ω/km</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Total Cost</p>
                <p className="font-semibold font-mono">R {result.totalCost.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Cost/Meter</p>
                <p className="font-semibold font-mono">
                  R {(result.totalCost / parseFloat(inputs.length)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Warnings */}
            {result.voltDropPercentage > parseFloat(inputs.voltDropLimit) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Voltage drop exceeds {inputs.voltDropLimit}% limit. Consider using a larger cable size or reducing cable length.
                </AlertDescription>
              </Alert>
            )}

            {/* Parallel Cables Alternative */}
            {result.isParallel && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Running {result.cablesInParallel} cables in parallel ({result.cableSize} each)
                </AlertDescription>
              </Alert>
            )}

            {/* Calculation Method */}
            <div className="text-xs text-muted-foreground">
              <p>• Calculated per SANS 10142-1 standard</p>
              <p>• Derating factor: {parseFloat(inputs.groupingFactor).toFixed(2)}</p>
              <p>• Safety margin: {((settings?.cable_safety_margin || 1.15) * 100 - 100).toFixed(0)}%</p>
            </div>
          </div>
        )}

        {!result && inputs.loadAmps && inputs.length && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enter load current, voltage, and cable length to see instant results
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
