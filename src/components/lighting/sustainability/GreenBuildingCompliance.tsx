import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Award, 
  Check, 
  X, 
  AlertTriangle,
  Download,
  Leaf,
  Building,
  Zap
} from 'lucide-react';

interface GreenBuildingComplianceProps {
  projectData?: {
    totalWatts: number;
    projectArea: number;
    hasOccupancySensors: boolean;
    hasDaylightSensors: boolean;
    hasDimmingControls: boolean;
    hasTaskLighting: boolean;
    ledPercentage: number;
  };
}

export const GreenBuildingCompliance = ({ projectData }: GreenBuildingComplianceProps) => {
  const data = projectData || {
    totalWatts: 12000,
    projectArea: 1200,
    hasOccupancySensors: true,
    hasDaylightSensors: true,
    hasDimmingControls: true,
    hasTaskLighting: false,
    ledPercentage: 95,
  };

  const [inputs, setInputs] = useState({
    totalWatts: data.totalWatts,
    projectArea: data.projectArea,
    hasOccupancySensors: data.hasOccupancySensors,
    hasDaylightSensors: data.hasDaylightSensors,
    hasDimmingControls: data.hasDimmingControls,
    hasTaskLighting: data.hasTaskLighting,
    ledPercentage: data.ledPercentage,
    averageLux: 400,
    exteriorLPD: 8,
  });

  const wattsPerSqm = inputs.projectArea > 0 ? inputs.totalWatts / inputs.projectArea : 0;

  // LEED v4.1 Calculations
  const leedCredits = useMemo(() => {
    const credits: { name: string; points: number; maxPoints: number; status: 'achieved' | 'partial' | 'not-achieved'; description: string }[] = [];
    
    // EAc6: Optimize Energy Performance - Lighting (up to 2 points)
    let lightingPoints = 0;
    if (wattsPerSqm <= 8) lightingPoints = 2;
    else if (wattsPerSqm <= 10) lightingPoints = 1;
    credits.push({
      name: 'EAc6: Optimize Energy Performance - Lighting',
      points: lightingPoints,
      maxPoints: 2,
      status: lightingPoints === 2 ? 'achieved' : lightingPoints > 0 ? 'partial' : 'not-achieved',
      description: `Current LPD: ${wattsPerSqm.toFixed(1)} W/m² (Target: ≤8 W/m² for 2 points, ≤10 W/m² for 1 point)`
    });

    // EQc6: Interior Lighting (up to 2 points)
    let interiorLightingPoints = 0;
    if (inputs.hasDimmingControls) interiorLightingPoints += 0.5;
    if (inputs.hasTaskLighting) interiorLightingPoints += 0.5;
    if (inputs.averageLux >= 300 && inputs.averageLux <= 500) interiorLightingPoints += 1;
    interiorLightingPoints = Math.min(2, interiorLightingPoints);
    credits.push({
      name: 'EQc6: Interior Lighting',
      points: interiorLightingPoints,
      maxPoints: 2,
      status: interiorLightingPoints >= 1.5 ? 'achieved' : interiorLightingPoints > 0 ? 'partial' : 'not-achieved',
      description: 'Points for lighting controls, task lighting, and appropriate illuminance levels'
    });

    // EQc7: Daylight (up to 3 points for daylight controls)
    let daylightPoints = 0;
    if (inputs.hasDaylightSensors) daylightPoints = 1;
    credits.push({
      name: 'EQc7: Daylight (Lighting Controls)',
      points: daylightPoints,
      maxPoints: 1,
      status: daylightPoints === 1 ? 'achieved' : 'not-achieved',
      description: 'Automatic daylight-responsive controls for electric lighting'
    });

    // SSc6: Light Pollution Reduction (1 point)
    let lightPollutionPoints = inputs.exteriorLPD <= 6 ? 1 : 0;
    credits.push({
      name: 'SSc6: Light Pollution Reduction',
      points: lightPollutionPoints,
      maxPoints: 1,
      status: lightPollutionPoints === 1 ? 'achieved' : 'not-achieved',
      description: `Exterior LPD: ${inputs.exteriorLPD} W/m² (Target: ≤6 W/m²)`
    });

    return credits;
  }, [wattsPerSqm, inputs]);

  // Green Star SA Calculations
  const greenStarCredits = useMemo(() => {
    const credits: { name: string; points: number; maxPoints: number; status: 'achieved' | 'partial' | 'not-achieved'; description: string }[] = [];
    
    // Ene-1: Lighting Power Density (up to 3 points)
    let lpdPoints = 0;
    if (wattsPerSqm <= 7) lpdPoints = 3;
    else if (wattsPerSqm <= 9) lpdPoints = 2;
    else if (wattsPerSqm <= 11) lpdPoints = 1;
    credits.push({
      name: 'Ene-1: Lighting Power Density',
      points: lpdPoints,
      maxPoints: 3,
      status: lpdPoints >= 2 ? 'achieved' : lpdPoints > 0 ? 'partial' : 'not-achieved',
      description: `Current: ${wattsPerSqm.toFixed(1)} W/m² (3pts: ≤7, 2pts: ≤9, 1pt: ≤11)`
    });

    // Ene-2: Lighting Zoning (up to 2 points)
    let zoningPoints = 0;
    if (inputs.hasOccupancySensors) zoningPoints += 1;
    if (inputs.hasDaylightSensors) zoningPoints += 1;
    credits.push({
      name: 'Ene-2: Lighting Zoning',
      points: zoningPoints,
      maxPoints: 2,
      status: zoningPoints === 2 ? 'achieved' : zoningPoints > 0 ? 'partial' : 'not-achieved',
      description: 'Points for occupancy sensors and daylight-linked controls'
    });

    // IEQ-8: Electric Lighting Levels (up to 2 points)
    let levelsPoints = inputs.averageLux >= 300 && inputs.averageLux <= 500 ? 2 : inputs.averageLux >= 250 ? 1 : 0;
    credits.push({
      name: 'IEQ-8: Electric Lighting Levels',
      points: levelsPoints,
      maxPoints: 2,
      status: levelsPoints === 2 ? 'achieved' : levelsPoints > 0 ? 'partial' : 'not-achieved',
      description: `Current: ${inputs.averageLux} lux (Target: 300-500 lux for full points)`
    });

    // IEQ-9: High Frequency Ballasts (1 point for LED)
    let hfPoints = inputs.ledPercentage >= 90 ? 1 : 0;
    credits.push({
      name: 'IEQ-9: High Frequency Ballasts / LED',
      points: hfPoints,
      maxPoints: 1,
      status: hfPoints === 1 ? 'achieved' : 'not-achieved',
      description: `${inputs.ledPercentage}% LED (Target: ≥90% high-frequency lighting)`
    });

    return credits;
  }, [wattsPerSqm, inputs]);

  // SANS 10400-XA Compliance
  const sansCompliance = useMemo(() => {
    const requirements: { name: string; value: string; target: string; compliant: boolean; description: string }[] = [];
    
    // Office LPD requirement
    const officeLPD = 12; // W/m²
    requirements.push({
      name: 'Office Lighting Power Density',
      value: `${wattsPerSqm.toFixed(1)} W/m²`,
      target: `≤${officeLPD} W/m²`,
      compliant: wattsPerSqm <= officeLPD,
      description: 'SANS 10400-XA maximum allowable LPD for office spaces'
    });

    // Retail LPD requirement
    const retailLPD = 18;
    requirements.push({
      name: 'Retail Lighting Power Density',
      value: `${wattsPerSqm.toFixed(1)} W/m²`,
      target: `≤${retailLPD} W/m²`,
      compliant: wattsPerSqm <= retailLPD,
      description: 'SANS 10400-XA maximum allowable LPD for retail spaces'
    });

    // Automatic controls requirement
    requirements.push({
      name: 'Automatic Lighting Controls',
      value: inputs.hasOccupancySensors || inputs.hasDaylightSensors ? 'Yes' : 'No',
      target: 'Required',
      compliant: inputs.hasOccupancySensors || inputs.hasDaylightSensors,
      description: 'Automatic controls required for spaces >50m²'
    });

    return requirements;
  }, [wattsPerSqm, inputs]);

  // EDGE Certification
  const edgeMetrics = useMemo(() => {
    // EDGE requires 20% better than baseline
    const baselineLPD = 15; // W/m²
    const improvementPercent = baselineLPD > 0 ? ((baselineLPD - wattsPerSqm) / baselineLPD) * 100 : 0;
    const edgeCertified = improvementPercent >= 20;
    const edgeAdvanced = improvementPercent >= 40;
    const edgeZero = improvementPercent >= 60;

    return {
      baselineLPD,
      currentLPD: wattsPerSqm,
      improvementPercent,
      edgeCertified,
      edgeAdvanced,
      edgeZero,
      level: edgeZero ? 'EDGE Zero' : edgeAdvanced ? 'EDGE Advanced' : edgeCertified ? 'EDGE Certified' : 'Not Certified'
    };
  }, [wattsPerSqm]);

  const totalLeedPoints = leedCredits.reduce((sum, c) => sum + c.points, 0);
  const maxLeedPoints = leedCredits.reduce((sum, c) => sum + c.maxPoints, 0);
  const totalGreenStarPoints = greenStarCredits.reduce((sum, c) => sum + c.points, 0);
  const maxGreenStarPoints = greenStarCredits.reduce((sum, c) => sum + c.maxPoints, 0);
  const sansCompliant = sansCompliance.every(r => r.compliant);

  const StatusIcon = ({ status }: { status: 'achieved' | 'partial' | 'not-achieved' | boolean }) => {
    if (status === 'achieved' || status === true) return <Check className="h-4 w-4 text-green-500" />;
    if (status === 'partial') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <X className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Input Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Project Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Total Watts</Label>
            <Input
              type="number"
              value={inputs.totalWatts}
              onChange={(e) => setInputs(i => ({ ...i, totalWatts: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Project Area (m²)</Label>
            <Input
              type="number"
              value={inputs.projectArea}
              onChange={(e) => setInputs(i => ({ ...i, projectArea: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Average Lux</Label>
            <Input
              type="number"
              value={inputs.averageLux}
              onChange={(e) => setInputs(i => ({ ...i, averageLux: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">LED %</Label>
            <Input
              type="number"
              value={inputs.ledPercentage}
              onChange={(e) => setInputs(i => ({ ...i, ledPercentage: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{wattsPerSqm.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">W/m²</div>
          </CardContent>
        </Card>
        <Card className={`text-center ${sansCompliant ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
          <CardContent className="pt-4">
            <StatusIcon status={sansCompliant} />
            <div className="text-lg font-bold mt-1">SANS 10400-XA</div>
            <div className="text-sm text-muted-foreground">{sansCompliant ? 'Compliant' : 'Non-Compliant'}</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-green-600">{totalGreenStarPoints}</div>
            <div className="text-sm text-muted-foreground">/ {maxGreenStarPoints} Green Star</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-blue-600">{totalLeedPoints}</div>
            <div className="text-sm text-muted-foreground">/ {maxLeedPoints} LEED</div>
          </CardContent>
        </Card>
      </div>

      {/* Certification Tabs */}
      <Tabs defaultValue="sans" className="space-y-4">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="sans">SANS 10400-XA</TabsTrigger>
          <TabsTrigger value="greenstar">Green Star SA</TabsTrigger>
          <TabsTrigger value="leed">LEED</TabsTrigger>
          <TabsTrigger value="edge">EDGE</TabsTrigger>
        </TabsList>

        <TabsContent value="sans">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                SANS 10400-XA Energy Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sansCompliance.map((req, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <StatusIcon status={req.compliant} />
                    <div className="flex-1">
                      <div className="font-medium">{req.name}</div>
                      <div className="text-sm text-muted-foreground">{req.description}</div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>Current: <strong>{req.value}</strong></span>
                        <span>Target: <strong>{req.target}</strong></span>
                      </div>
                    </div>
                    <Badge variant={req.compliant ? 'default' : 'destructive'}>
                      {req.compliant ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="greenstar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Green Star SA Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {greenStarCredits.map((credit, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <StatusIcon status={credit.status} />
                    <div className="flex-1">
                      <div className="font-medium">{credit.name}</div>
                      <div className="text-sm text-muted-foreground">{credit.description}</div>
                      <Progress 
                        value={(credit.points / credit.maxPoints) * 100} 
                        className="h-2 mt-2"
                      />
                    </div>
                    <Badge variant="outline">
                      {credit.points} / {credit.maxPoints}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                LEED v4.1 Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leedCredits.map((credit, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <StatusIcon status={credit.status} />
                    <div className="flex-1">
                      <div className="font-medium">{credit.name}</div>
                      <div className="text-sm text-muted-foreground">{credit.description}</div>
                      <Progress 
                        value={(credit.points / credit.maxPoints) * 100} 
                        className="h-2 mt-2"
                      />
                    </div>
                    <Badge variant="outline">
                      {credit.points} / {credit.maxPoints}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edge">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                EDGE Certification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <div className={`text-4xl font-bold ${edgeMetrics.edgeCertified ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {edgeMetrics.level}
                </div>
                <div className="text-lg mt-2">
                  {edgeMetrics.improvementPercent.toFixed(0)}% improvement vs baseline
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Baseline LPD</span>
                  <span>{edgeMetrics.baselineLPD} W/m²</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current LPD</span>
                  <span className="font-bold">{edgeMetrics.currentLPD.toFixed(1)} W/m²</span>
                </div>
                <Progress value={Math.min(100, edgeMetrics.improvementPercent)} className="h-4" />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className={`p-4 rounded-lg ${edgeMetrics.edgeCertified ? 'bg-green-500/20 border border-green-500' : 'bg-muted/50'}`}>
                  <div className="font-medium">EDGE Certified</div>
                  <div className="text-sm text-muted-foreground">≥20% improvement</div>
                </div>
                <div className={`p-4 rounded-lg ${edgeMetrics.edgeAdvanced ? 'bg-green-500/20 border border-green-500' : 'bg-muted/50'}`}>
                  <div className="font-medium">EDGE Advanced</div>
                  <div className="text-sm text-muted-foreground">≥40% improvement</div>
                </div>
                <div className={`p-4 rounded-lg ${edgeMetrics.edgeZero ? 'bg-green-500/20 border border-green-500' : 'bg-muted/50'}`}>
                  <div className="font-medium">EDGE Zero</div>
                  <div className="text-sm text-muted-foreground">≥60% improvement</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Button */}
      <Card>
        <CardContent className="pt-4 flex justify-between items-center">
          <div>
            <div className="font-medium">Export Compliance Report</div>
            <div className="text-sm text-muted-foreground">Generate PDF report for green building submissions</div>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GreenBuildingCompliance;
