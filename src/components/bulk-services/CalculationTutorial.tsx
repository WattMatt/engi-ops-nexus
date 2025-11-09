import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, CheckCircle2, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CalculationTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculationType: string;
  onApplyValues?: (values: any) => void;
}

const SANS_204_TABLE = {
  A1: { name: "Entertainment & Public Assembly", zones: [85, 80, 90, 80, 80, 85] },
  A2: { name: "Theatrical & Indoor Sport", zones: [85, 80, 90, 80, 80, 85] },
  A3: { name: "Places of Instruction", zones: [80, 75, 85, 75, 75, 80] },
  A4: { name: "Worship", zones: [80, 75, 85, 75, 75, 80] },
  F1: { name: "Large Shop (Retail)", zones: [90, 85, 95, 85, 85, 90] },
  G1: { name: "Offices", zones: [80, 75, 85, 75, 75, 80] },
  H1: { name: "Hotel", zones: [90, 85, 95, 85, 85, 90] },
};

const CLIMATIC_ZONES = [
  { value: "1", name: "Cold Interior", cities: "Johannesburg, Bloemfontein" },
  { value: "2", name: "Temperate Interior", cities: "Pretoria, Polokwane" },
  { value: "3", name: "Hot Interior", cities: "Makhado, Nelspruit" },
  { value: "4", name: "Temperate Coastal", cities: "Cape Town, Port Elizabeth" },
  { value: "5", name: "Sub-tropical Coastal", cities: "Durban, East London" },
  { value: "6", name: "Arid Interior", cities: "Kimberley, Upington" },
];

export const CalculationTutorial = ({
  open,
  onOpenChange,
  calculationType,
  onApplyValues,
}: CalculationTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  // SANS 204 state
  const [buildingClass, setBuildingClass] = useState<keyof typeof SANS_204_TABLE>("F1");
  const [climaticZone, setClimaticZone] = useState("1");
  const [projectArea, setProjectArea] = useState("");
  const [diversityFactor, setDiversityFactor] = useState("0.75");

  // SANS 10142 state
  const [buildingType, setBuildingType] = useState("office");
  const [socketLoad, setSocketLoad] = useState("30");
  const [lightingLoad, setLightingLoad] = useState("25");
  const [fixedAppliances, setFixedAppliances] = useState("0");

  // Residential ADMD state
  const [numUnits, setNumUnits] = useState("18");
  const [loadPerUnit, setLoadPerUnit] = useState("4.54");
  const [unitsPerPhase, setUnitsPerPhase] = useState("6");
  const [admdFactor, setAdmdFactor] = useState("0.50");

  const resetTutorial = () => {
    setCurrentStep(0);
  };

  const getTotalSteps = () => {
    if (calculationType === "sans_204") return 6;
    if (calculationType === "sans_10142") return 6;
    if (calculationType === "residential") return 7;
    return 0;
  };

  const handleNext = () => {
    if (currentStep < getTotalSteps() - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (calculationType === "sans_204") {
      const vaPerSqm = SANS_204_TABLE[buildingClass].zones[parseInt(climaticZone) - 1];
      const area = parseFloat(projectArea);
      const diversity = parseFloat(diversityFactor);
      const totalConnected = (area * vaPerSqm) / 1000;
      const maxDemand = totalConnected * diversity;

      onApplyValues?.({
        project_area: area,
        va_per_sqm: vaPerSqm,
        total_connected_load: totalConnected,
        maximum_demand: maxDemand,
        climatic_zone: climaticZone,
        diversity_factor: diversity,
      });
    }
    onOpenChange(false);
    resetTutorial();
  };

  const renderSANS204Step = () => {
    const vaPerSqm = SANS_204_TABLE[buildingClass].zones[parseInt(climaticZone) - 1];
    const area = parseFloat(projectArea) || 0;
    const diversity = parseFloat(diversityFactor) || 0.75;
    const totalConnected = (area * vaPerSqm) / 1000;
    const maxDemand = totalConnected * diversity;

    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Welcome to the SANS 204 Tutorial!</strong>
                <br />
                SANS 204 provides maximum energy demand values for different building types across 
                South Africa's climatic zones. Let's calculate your project's electrical requirements step-by-step.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">What you'll learn:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>How to select the correct building classification</li>
                <li>How to identify your climatic zone</li>
                <li>How to calculate total connected load</li>
                <li>How to apply diversity factors</li>
                <li>How to determine maximum demand</li>
              </ul>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 1: Select Building Classification</strong>
                <br />
                Choose the building type that best matches your project from the SANS 204 Table 1 classifications.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Building Classification</Label>
              <Select value={buildingClass} onValueChange={(value) => setBuildingClass(value as keyof typeof SANS_204_TABLE)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SANS_204_TABLE).map(([code, data]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {data.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Selected:</strong> {buildingClass} - {SANS_204_TABLE[buildingClass].name}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Load range: {Math.min(...SANS_204_TABLE[buildingClass].zones)} - {Math.max(...SANS_204_TABLE[buildingClass].zones)} VA/m²
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 2: Select Climatic Zone</strong>
                <br />
                Choose the climatic zone where your project is located. Different zones have different 
                load requirements due to climate conditions.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Climatic Zone</Label>
              <Select value={climaticZone} onValueChange={setClimaticZone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIMATIC_ZONES.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      Zone {zone.value} - {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Selected Zone:</strong> {CLIMATIC_ZONES.find(z => z.value === climaticZone)?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Major cities: {CLIMATIC_ZONES.find(z => z.value === climaticZone)?.cities}
                </p>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded">
                  <p className="text-sm font-semibold">
                    Applied Load: {vaPerSqm} VA/m²
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 3: Enter Project Area</strong>
                <br />
                Input the total floor area of your project in square meters (m²).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Project Area (m²)</Label>
              <Input
                type="number"
                value={projectArea}
                onChange={(e) => setProjectArea(e.target.value)}
                placeholder="e.g., 5000"
              />
            </div>
            {area > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Floor Area:</span>
                      <span className="font-medium">{area.toLocaleString()} m²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Applied Load:</span>
                      <span className="font-medium">{vaPerSqm} VA/m²</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Connected Load:</span>
                        <span className="font-bold text-lg">{totalConnected.toFixed(2)} kVA</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 4: Set Diversity Factor</strong>
                <br />
                The diversity factor accounts for the fact that not all loads operate simultaneously.
                Typical values: 0.65-0.75 for retail, 0.70-0.80 for offices.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Diversity Factor</Label>
              <Input
                type="number"
                step="0.01"
                min="0.5"
                max="1"
                value={diversityFactor}
                onChange={(e) => setDiversityFactor(e.target.value)}
              />
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Connected Load:</span>
                    <span className="font-medium">{totalConnected.toFixed(2)} kVA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diversity Factor:</span>
                    <span className="font-medium">{diversity}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Maximum Demand:</span>
                      <span className="font-bold text-lg text-green-600">{maxDemand.toFixed(2)} kVA</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold">Calculation Complete!</p>
              </div>
              <p className="text-sm">
                Here's a summary of your SANS 204 calculation. Review the results and apply them to your document.
              </p>
            </div>

            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3">Summary</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Building Type:</span>
                    <span className="font-medium">{buildingClass} - {SANS_204_TABLE[buildingClass].name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Climatic Zone:</span>
                    <span className="font-medium">Zone {climaticZone}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Project Area:</span>
                    <span className="font-medium">{area.toLocaleString()} m²</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Applied Load:</span>
                    <span className="font-medium">{vaPerSqm} VA/m²</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <span className="text-muted-foreground">Total Connected Load:</span>
                    <span className="font-bold">{totalConnected.toFixed(2)} kVA</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Diversity Factor:</span>
                    <span className="font-bold">{diversity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <span className="font-semibold">Maximum Demand:</span>
                    <span className="font-bold text-lg text-green-600">{maxDemand.toFixed(2)} kVA</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Next Steps:</strong>
                <br />
                • Add 15-20% for future expansion
                <br />
                • Consider special equipment or high-load areas
                <br />
                • Document all assumptions in your report
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderSANS10142Step = () => {
    const area = parseFloat(projectArea) || 0;
    const socket = parseFloat(socketLoad) || 0;
    const lighting = parseFloat(lightingLoad) || 0;
    const fixed = parseFloat(fixedAppliances) || 0;
    const diversity = parseFloat(diversityFactor) || 0.75;
    
    const socketLoadKva = (area * socket) / 1000;
    const lightingLoadKva = (area * lighting) / 1000;
    const totalConnected = socketLoadKva + lightingLoadKva + fixed;
    const maxDemand = totalConnected * diversity;

    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Welcome to the SANS 10142-1 Tutorial!</strong>
                <br />
                This method calculates electrical loads based on socket outlets, lighting, and fixed 
                appliances for various building types. Let's work through your calculation.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">What you'll learn:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>How to determine socket outlet loads</li>
                <li>How to calculate lighting requirements</li>
                <li>How to account for fixed appliances</li>
                <li>How to apply diversity factors</li>
                <li>How to calculate total maximum demand</li>
              </ul>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 1: Enter Project Area</strong>
                <br />
                Input the total floor area of your project in square meters.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Project Area (m²)</Label>
              <Input
                type="number"
                value={projectArea}
                onChange={(e) => setProjectArea(e.target.value)}
                placeholder="e.g., 800"
              />
            </div>
            {area > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <strong>Project Area:</strong> {area.toLocaleString()} m²
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 2: Socket Outlet Load</strong>
                <br />
                Enter the socket outlet load in VA/m² based on your building type and area range.
                Reference: Offices (800m²) = 30 VA/m²
              </p>
            </div>
            <div className="space-y-2">
              <Label>Socket Load (VA/m²)</Label>
              <Input
                type="number"
                value={socketLoad}
                onChange={(e) => setSocketLoad(e.target.value)}
                placeholder="e.g., 30"
              />
            </div>
            {area > 0 && socket > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Area:</span>
                      <span className="font-medium">{area.toLocaleString()} m²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Socket Load:</span>
                      <span className="font-medium">{socket} VA/m²</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Socket Load:</span>
                        <span className="font-bold">{socketLoadKva.toFixed(2)} kVA</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 3: Lighting Load</strong>
                <br />
                Enter the lighting load in VA/m². Typical values: Offices = 25 VA/m², Retail = 35 VA/m²
              </p>
            </div>
            <div className="space-y-2">
              <Label>Lighting Load (VA/m²)</Label>
              <Input
                type="number"
                value={lightingLoad}
                onChange={(e) => setLightingLoad(e.target.value)}
                placeholder="e.g., 25"
              />
            </div>
            {area > 0 && lighting > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Socket Load:</span>
                      <span className="font-medium">{socketLoadKva.toFixed(2)} kVA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lighting Load:</span>
                      <span className="font-medium">{lightingLoadKva.toFixed(2)} kVA</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">Subtotal:</span>
                        <span className="font-bold">{(socketLoadKva + lightingLoadKva).toFixed(2)} kVA</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 4: Fixed Appliances</strong>
                <br />
                Enter the total load for fixed appliances (HVAC, lifts, etc.) in kVA.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Fixed Appliances (kVA)</Label>
              <Input
                type="number"
                value={fixedAppliances}
                onChange={(e) => setFixedAppliances(e.target.value)}
                placeholder="e.g., 50"
              />
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Socket + Lighting:</span>
                    <span className="font-medium">{(socketLoadKva + lightingLoadKva).toFixed(2)} kVA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fixed Appliances:</span>
                    <span className="font-medium">{fixed.toFixed(2)} kVA</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Connected Load:</span>
                      <span className="font-bold text-lg">{totalConnected.toFixed(2)} kVA</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold">Calculation Complete!</p>
              </div>
              <p className="text-sm">
                Here's your complete SANS 10142-1 calculation summary.
              </p>
            </div>

            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3">Summary</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Project Area:</span>
                    <span className="font-medium">{area.toLocaleString()} m²</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Socket Load:</span>
                    <span className="font-medium">{socketLoadKva.toFixed(2)} kVA</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Lighting Load:</span>
                    <span className="font-medium">{lightingLoadKva.toFixed(2)} kVA</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Fixed Appliances:</span>
                    <span className="font-medium">{fixed.toFixed(2)} kVA</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <span className="font-semibold">Total Connected:</span>
                    <span className="font-bold">{totalConnected.toFixed(2)} kVA</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Diversity (0.75):</span>
                    <span className="font-medium">×{diversity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <span className="font-semibold">Maximum Demand:</span>
                    <span className="font-bold text-lg text-green-600">{maxDemand.toFixed(2)} kVA</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const renderResidentialStep = () => {
    const units = parseInt(numUnits) || 0;
    const perUnit = parseFloat(loadPerUnit) || 0;
    const perPhase = parseInt(unitsPerPhase) || 0;
    const admd = parseFloat(admdFactor) || 0.50;
    
    const maxDemandPerPhase = perPhase * perUnit * admd;
    const totalMaxDemand = maxDemandPerPhase * 3;
    const designLoad = totalMaxDemand * 1.15;

    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Welcome to the Residential ADMD Tutorial!</strong>
                <br />
                Learn how to calculate maximum demand for multi-unit residential developments using 
                the After Diversity Maximum Demand method.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">What you'll learn:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>How to calculate load per unit</li>
                <li>How to determine units per phase</li>
                <li>How to select ADMD diversity factors</li>
                <li>How to calculate three-phase demand</li>
                <li>How to account for unbalanced loading</li>
              </ul>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 1: Total Number of Units</strong>
                <br />
                Enter the total number of residential units in your development.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Total Units</Label>
              <Input
                type="number"
                value={numUnits}
                onChange={(e) => setNumUnits(e.target.value)}
                placeholder="e.g., 18"
              />
            </div>
            {units > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <strong>Total Units:</strong> {units} units
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    For 3-phase distribution: {Math.floor(units / 3)} units per phase
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 2: Load per Unit (After Diversity)</strong>
                <br />
                This is the diversified load per unit including lighting, sockets, geyser, and stove.
                Typical: 4-5 kW per unit after individual load diversity.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Load per Unit (kW)</Label>
              <Input
                type="number"
                step="0.1"
                value={loadPerUnit}
                onChange={(e) => setLoadPerUnit(e.target.value)}
                placeholder="e.g., 4.54"
              />
            </div>
            {perUnit > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="text-xs font-medium mb-2">Typical breakdown:</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Lighting (5×15W×0.5):</span>
                        <span>38 W</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sockets (1×3000W×0.5):</span>
                        <span>1500 W</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Geyser (1×2000W×1.0):</span>
                        <span>2000 W</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stove (1×2000W×0.5):</span>
                        <span>1000 W</span>
                      </div>
                      <div className="border-t pt-1 mt-1 flex justify-between font-medium">
                        <span>Total per unit:</span>
                        <span>~4.54 kW</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 3: Units per Phase</strong>
                <br />
                For balanced three-phase distribution, divide total units by 3.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Units per Phase</Label>
              <Input
                type="number"
                value={unitsPerPhase}
                onChange={(e) => setUnitsPerPhase(e.target.value)}
                placeholder="Total units ÷ 3"
              />
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Units:</span>
                    <span className="font-medium">{units} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distribution:</span>
                    <span className="font-medium">3-phase</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Units per Phase:</span>
                      <span className="font-bold">{perPhase} units/phase</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 4: Select ADMD Factor</strong>
                <br />
                Choose the diversity factor from the ADMD table based on units per phase.
                For {perPhase} units/phase, typical factor is 0.50.
              </p>
            </div>
            <div className="space-y-2">
              <Label>ADMD Diversity Factor</Label>
              <Select value={admdFactor} onValueChange={setAdmdFactor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.00">1.00 (1 unit/phase)</SelectItem>
                  <SelectItem value="0.72">0.72 (2 units/phase)</SelectItem>
                  <SelectItem value="0.62">0.62 (3 units/phase)</SelectItem>
                  <SelectItem value="0.57">0.57 (4 units/phase)</SelectItem>
                  <SelectItem value="0.53">0.53 (5 units/phase)</SelectItem>
                  <SelectItem value="0.50">0.50 (6 units/phase)</SelectItem>
                  <SelectItem value="0.48">0.48 (7 units/phase)</SelectItem>
                  <SelectItem value="0.47">0.47 (8 units/phase)</SelectItem>
                  <SelectItem value="0.46">0.46 (9 units/phase)</SelectItem>
                  <SelectItem value="0.45">0.45 (10+ units/phase)</SelectItem>
                  <SelectItem value="0.40">0.40 (20+ units/phase)</SelectItem>
                  <SelectItem value="0.36">0.36 (50+ units/phase)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Units per Phase:</span>
                    <span className="font-medium">{perPhase} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Load per Unit:</span>
                    <span className="font-medium">{perUnit} kW</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ADMD Factor:</span>
                    <span className="font-medium">{admd}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Demand per Phase:</span>
                      <span className="font-bold">{maxDemandPerPhase.toFixed(2)} kW</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Step 5: Calculate Total Demand</strong>
                <br />
                Multiply the per-phase demand by 3 to get total three-phase maximum demand.
              </p>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Demand per Phase:</span>
                    <span className="font-medium">{maxDemandPerPhase.toFixed(2)} kW</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Number of Phases:</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Maximum Demand:</span>
                      <span className="font-bold text-lg">{totalMaxDemand.toFixed(2)} kW</span>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                    <p className="text-xs font-medium mb-1">Add 15% for unbalanced loading:</p>
                    <div className="flex justify-between">
                      <span className="text-sm">Design Load:</span>
                      <span className="text-sm font-bold">{designLoad.toFixed(2)} kW</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold">Calculation Complete!</p>
              </div>
              <p className="text-sm">
                Here's your complete Residential ADMD calculation.
              </p>
            </div>

            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3">Summary</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Total Units:</span>
                    <span className="font-medium">{units} units</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Units per Phase:</span>
                    <span className="font-medium">{perPhase} units</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Load per Unit:</span>
                    <span className="font-medium">{perUnit} kW</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">ADMD Factor:</span>
                    <span className="font-medium">{admd}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <span className="font-semibold">Demand per Phase:</span>
                    <span className="font-bold">{maxDemandPerPhase.toFixed(2)} kW</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="font-semibold">Total Demand (3φ):</span>
                    <span className="font-bold">{totalMaxDemand.toFixed(2)} kW</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <span className="font-semibold">Design Load (+15%):</span>
                    <span className="font-bold text-lg text-green-600">{designLoad.toFixed(2)} kW</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">As kVA (PF=0.95):</span>
                    <span className="font-medium">{(designLoad / 0.95).toFixed(2)} kVA</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Recommended Supply:</strong> {Math.ceil(designLoad / 0.95 / 10) * 10} kVA transformer
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderContent = () => {
    if (calculationType === "sans_204") return renderSANS204Step();
    if (calculationType === "sans_10142") return renderSANS10142Step();
    if (calculationType === "residential") return renderResidentialStep();
    return null;
  };

  const totalSteps = getTotalSteps();
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Interactive Calculation Tutorial
          </DialogTitle>
          <DialogDescription>
            {calculationType === "sans_204" && "SANS 204 - Commercial/Retail Buildings"}
            {calculationType === "sans_10142" && "SANS 10142-1 - General Buildings"}
            {calculationType === "residential" && "Residential ADMD Method"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-muted-foreground">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="py-4">{renderContent()}</div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {!isLastStep ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Tutorial
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
