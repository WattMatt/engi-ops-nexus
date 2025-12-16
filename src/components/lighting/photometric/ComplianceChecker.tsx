import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  FileCheck,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ComplianceCheck {
  id: string;
  name: string;
  requirement: string;
  actual: string | number;
  target: string | number;
  status: 'pass' | 'fail' | 'warning';
  details?: string;
}

interface ComplianceStandard {
  id: string;
  name: string;
  code: string;
  description: string;
  checks: ComplianceCheck[];
}

interface ComplianceCheckerProps {
  projectId?: string | null;
  spaceType?: string;
  actualLux?: number;
  uniformity?: number;
  glareRating?: number;
  colorRendering?: number;
  energyDensity?: number; // W/m²
}

// SANS Standards for different space types
const sansStandards: Record<string, { lux: number; uniformity: number; ugr: number; cri: number; lpd: number }> = {
  office_general: { lux: 500, uniformity: 0.6, ugr: 19, cri: 80, lpd: 12 },
  office_drawing: { lux: 750, uniformity: 0.7, ugr: 16, cri: 90, lpd: 15 },
  retail_general: { lux: 300, uniformity: 0.6, ugr: 22, cri: 80, lpd: 18 },
  retail_display: { lux: 500, uniformity: 0.4, ugr: 22, cri: 90, lpd: 20 },
  warehouse: { lux: 200, uniformity: 0.4, ugr: 25, cri: 60, lpd: 8 },
  classroom: { lux: 500, uniformity: 0.6, ugr: 19, cri: 80, lpd: 12 },
  corridor: { lux: 100, uniformity: 0.4, ugr: 25, cri: 60, lpd: 6 },
  workshop: { lux: 500, uniformity: 0.6, ugr: 22, cri: 80, lpd: 15 },
};

export const ComplianceChecker = ({
  projectId,
  spaceType: initialSpaceType = 'office_general',
  actualLux = 0,
  uniformity = 0,
  glareRating = 0,
  colorRendering = 0,
  energyDensity = 0
}: ComplianceCheckerProps) => {
  const [spaceType, setSpaceType] = useState(initialSpaceType);
  const [expandedStandard, setExpandedStandard] = useState<string | null>('sans10114');

  // Get requirements for selected space type
  const requirements = sansStandards[spaceType] || sansStandards.office_general;

  // Generate compliance checks
  const complianceStandards: ComplianceStandard[] = useMemo(() => {
    const luxStatus = actualLux >= requirements.lux ? 'pass' : actualLux >= requirements.lux * 0.9 ? 'warning' : 'fail';
    const uniformityStatus = uniformity >= requirements.uniformity ? 'pass' : uniformity >= requirements.uniformity * 0.9 ? 'warning' : 'fail';
    const glareStatus = glareRating <= requirements.ugr ? 'pass' : glareRating <= requirements.ugr * 1.1 ? 'warning' : 'fail';
    const criStatus = colorRendering >= requirements.cri ? 'pass' : colorRendering >= requirements.cri * 0.95 ? 'warning' : 'fail';
    const lpdStatus = energyDensity <= requirements.lpd ? 'pass' : energyDensity <= requirements.lpd * 1.1 ? 'warning' : 'fail';

    return [
      {
        id: 'sans10114',
        name: 'SANS 10114-1:2005',
        code: 'Interior Lighting',
        description: 'South African standard for interior lighting in buildings',
        checks: [
          {
            id: 'illuminance',
            name: 'Maintained Illuminance (Em)',
            requirement: `≥ ${requirements.lux} lux`,
            actual: actualLux ? `${actualLux} lux` : 'Not measured',
            target: requirements.lux,
            status: actualLux ? luxStatus : 'warning',
            details: 'Minimum maintained illuminance on the task area'
          },
          {
            id: 'uniformity',
            name: 'Illuminance Uniformity (Uo)',
            requirement: `≥ ${requirements.uniformity}`,
            actual: uniformity ? uniformity.toFixed(2) : 'Not measured',
            target: requirements.uniformity,
            status: uniformity ? uniformityStatus : 'warning',
            details: 'Ratio of minimum to average illuminance'
          },
          {
            id: 'glare',
            name: 'Unified Glare Rating (UGR)',
            requirement: `≤ ${requirements.ugr}`,
            actual: glareRating ? glareRating.toString() : 'Not measured',
            target: requirements.ugr,
            status: glareRating ? glareStatus : 'warning',
            details: 'Maximum allowable discomfort glare rating'
          },
          {
            id: 'cri',
            name: 'Colour Rendering Index (Ra)',
            requirement: `≥ ${requirements.cri}`,
            actual: colorRendering ? colorRendering.toString() : 'Not measured',
            target: requirements.cri,
            status: colorRendering ? criStatus : 'warning',
            details: 'Minimum colour rendering capability of light sources'
          }
        ]
      },
      {
        id: 'sans10400xa',
        name: 'SANS 10400-XA:2021',
        code: 'Energy Usage in Buildings',
        description: 'Energy efficiency requirements for buildings',
        checks: [
          {
            id: 'lpd',
            name: 'Lighting Power Density',
            requirement: `≤ ${requirements.lpd} W/m²`,
            actual: energyDensity ? `${energyDensity.toFixed(1)} W/m²` : 'Not measured',
            target: requirements.lpd,
            status: energyDensity ? lpdStatus : 'warning',
            details: 'Maximum installed lighting power per unit floor area'
          },
          {
            id: 'controls',
            name: 'Lighting Controls',
            requirement: 'Required for areas > 50m²',
            actual: 'Manual verification required',
            target: 'N/A',
            status: 'warning',
            details: 'Occupancy sensors or daylight dimming for large areas'
          },
          {
            id: 'efficacy',
            name: 'Lamp Efficacy',
            requirement: '≥ 80 lm/W',
            actual: 'Check individual fittings',
            target: 80,
            status: 'warning',
            details: 'Minimum luminous efficacy for general lighting'
          }
        ]
      }
    ];
  }, [spaceType, actualLux, uniformity, glareRating, colorRendering, energyDensity, requirements]);

  // Calculate overall compliance
  const overallCompliance = useMemo(() => {
    const allChecks = complianceStandards.flatMap(s => s.checks);
    const passed = allChecks.filter(c => c.status === 'pass').length;
    const warnings = allChecks.filter(c => c.status === 'warning').length;
    const failed = allChecks.filter(c => c.status === 'fail').length;
    const total = allChecks.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { passed, warnings, failed, total, percentage };
  }, [complianceStandards]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return <Badge className="bg-green-500/20 text-green-600">Pass</Badge>;
      case 'fail': return <Badge variant="destructive">Fail</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/20 text-yellow-600">Check Required</Badge>;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Compliance Checker
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Space Type Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Space Type:</label>
          <Select value={spaceType} onValueChange={setSpaceType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="office_general">Office - General</SelectItem>
              <SelectItem value="office_drawing">Office - Technical/Drawing</SelectItem>
              <SelectItem value="retail_general">Retail - General</SelectItem>
              <SelectItem value="retail_display">Retail - Display</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
              <SelectItem value="classroom">Classroom</SelectItem>
              <SelectItem value="corridor">Corridor</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overall Compliance Summary */}
        <Card className={`${
          overallCompliance.percentage >= 80 ? 'bg-green-500/10 border-green-500/30' :
          overallCompliance.percentage >= 60 ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-destructive/10 border-destructive/30'
        }`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall Compliance</span>
              <span className="text-2xl font-bold">{overallCompliance.percentage}%</span>
            </div>
            <Progress value={overallCompliance.percentage} className="h-2 mb-3" />
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {overallCompliance.passed} Passed
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                {overallCompliance.warnings} Warnings
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-destructive" />
                {overallCompliance.failed} Failed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Standards Checklist */}
        <div className="space-y-4">
          {complianceStandards.map(standard => (
            <Collapsible
              key={standard.id}
              open={expandedStandard === standard.id}
              onOpenChange={(open) => setExpandedStandard(open ? standard.id : null)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {standard.name}
                          <Badge variant="outline">{standard.code}</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{standard.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {standard.checks.filter(c => c.status === 'pass').length}/{standard.checks.length}
                        </Badge>
                        {expandedStandard === standard.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {standard.checks.map(check => (
                        <div 
                          key={check.id} 
                          className="flex items-start justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-start gap-3">
                            {getStatusIcon(check.status)}
                            <div>
                              <div className="font-medium text-sm">{check.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Required: {check.requirement}
                              </div>
                              {check.details && (
                                <div className="flex items-start gap-1 mt-1">
                                  <Info className="h-3 w-3 mt-0.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{check.details}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{check.actual}</div>
                            {getStatusBadge(check.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>

        {/* Help text */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">About these standards</p>
              <p>
                <strong>SANS 10114</strong> specifies lighting requirements for visual comfort and task performance.
                <strong> SANS 10400-XA</strong> sets energy efficiency requirements to reduce environmental impact.
                Both are mandatory for new buildings and major renovations in South Africa.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceChecker;
