import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ComplianceCheck, CableRoute } from './types';
import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ComplianceCheckerProps {
  route: CableRoute;
  loadCurrent?: number;
  voltage?: number;
  cableRating?: number;
  isArmoured?: boolean;
}

export function ComplianceChecker({
  route,
  loadCurrent = 32,
  voltage = 400,
  cableRating = 40,
  isArmoured = false,
}: ComplianceCheckerProps) {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);

  useEffect(() => {
    const performChecks = () => {
      const newChecks: ComplianceCheck[] = [];
      const metrics = route.metrics;

      if (!metrics) return [];

      // 1. Voltage Drop Check (BS 7671:525)
      const voltageDropPercentage = ((metrics.totalLength * loadCurrent * 0.029) / voltage) * 100;
      const voltageDropLimit = voltage === 230 ? 3 : 5;

      if (voltageDropPercentage > voltageDropLimit) {
        newChecks.push({
          id: 'voltage-drop',
          regulation: 'BS 7671:525',
          description: 'Voltage Drop',
          status: 'fail',
          message: `Voltage drop of ${voltageDropPercentage.toFixed(2)}% exceeds ${voltageDropLimit}% limit`,
          suggestion: 'Consider increasing cable size or reducing route length',
        });
      } else if (voltageDropPercentage > voltageDropLimit * 0.8) {
        newChecks.push({
          id: 'voltage-drop',
          regulation: 'BS 7671:525',
          description: 'Voltage Drop',
          status: 'warning',
          message: `Voltage drop of ${voltageDropPercentage.toFixed(2)}% is close to ${voltageDropLimit}% limit`,
          suggestion: 'Monitor voltage drop as route may be extended',
        });
      } else {
        newChecks.push({
          id: 'voltage-drop',
          regulation: 'BS 7671:525',
          description: 'Voltage Drop',
          status: 'pass',
          message: `Voltage drop of ${voltageDropPercentage.toFixed(2)}% is within ${voltageDropLimit}% limit`,
        });
      }

      // 2. Current Carrying Capacity (BS 7671:523)
      if (loadCurrent > cableRating) {
        newChecks.push({
          id: 'current-capacity',
          regulation: 'BS 7671:523',
          description: 'Current Carrying Capacity',
          status: 'fail',
          message: `Load current ${loadCurrent}A exceeds cable rating ${cableRating}A`,
          suggestion: 'Increase cable size to accommodate load current',
        });
      } else if (loadCurrent > cableRating * 0.9) {
        newChecks.push({
          id: 'current-capacity',
          regulation: 'BS 7671:523',
          description: 'Current Carrying Capacity',
          status: 'warning',
          message: `Load current ${loadCurrent}A is close to cable rating ${cableRating}A`,
          suggestion: 'Consider derating factors and future load increases',
        });
      } else {
        newChecks.push({
          id: 'current-capacity',
          regulation: 'BS 7671:523',
          description: 'Current Carrying Capacity',
          status: 'pass',
          message: `Load current ${loadCurrent}A is within cable rating ${cableRating}A`,
        });
      }

      // 3. Cable Bending Radius (BS 7671:522.8.3)
      const minBendRadius = route.diameter * (isArmoured ? 12 : 6);
      const hasSharpBends = metrics.bendCount > 0 && metrics.complexity === 'High';

      if (hasSharpBends) {
        newChecks.push({
          id: 'bending-radius',
          regulation: 'BS 7671:522.8.3',
          description: 'Cable Bending Radius',
          status: 'warning',
          message: `Route has ${metrics.bendCount} bends. Minimum radius: ${minBendRadius}mm`,
          suggestion: 'Ensure all bends meet minimum radius requirements during installation',
        });
      } else {
        newChecks.push({
          id: 'bending-radius',
          regulation: 'BS 7671:522.8.3',
          description: 'Cable Bending Radius',
          status: 'pass',
          message: `Route design allows adequate bending radius (min ${minBendRadius}mm)`,
        });
      }

      // 4. Support Spacing (BS 7671:522.8.5)
      const maxSpacing = isArmoured ? 600 : 400;
      const avgSpacing = metrics.totalLength / (metrics.supportCount || 1);

      if (avgSpacing > maxSpacing) {
        newChecks.push({
          id: 'support-spacing',
          regulation: 'BS 7671:522.8.5',
          description: 'Support Spacing',
          status: 'fail',
          message: `Average support spacing ${avgSpacing.toFixed(0)}mm exceeds ${maxSpacing}mm maximum`,
          suggestion: `Add ${Math.ceil((metrics.totalLength / maxSpacing) - metrics.supportCount)} more supports`,
        });
      } else if (avgSpacing > maxSpacing * 0.9) {
        newChecks.push({
          id: 'support-spacing',
          regulation: 'BS 7671:522.8.5',
          description: 'Support Spacing',
          status: 'warning',
          message: `Support spacing ${avgSpacing.toFixed(0)}mm is close to ${maxSpacing}mm limit`,
          suggestion: 'Verify support positions during installation',
        });
      } else {
        newChecks.push({
          id: 'support-spacing',
          regulation: 'BS 7671:522.8.5',
          description: 'Support Spacing',
          status: 'pass',
          message: `Support spacing ${avgSpacing.toFixed(0)}mm meets ${maxSpacing}mm requirement`,
        });
      }

      // 5. Route Length Warning (BS 7671:525)
      if (metrics.totalLength > 100) {
        newChecks.push({
          id: 'route-length',
          regulation: 'BS 7671:525',
          description: 'Route Length',
          status: 'warning',
          message: `Route length ${metrics.totalLength.toFixed(1)}m exceeds 100m`,
          suggestion: 'Verify voltage drop calculations and consider intermediate distribution',
        });
      } else {
        newChecks.push({
          id: 'route-length',
          regulation: 'BS 7671:525',
          description: 'Route Length',
          status: 'pass',
          message: `Route length ${metrics.totalLength.toFixed(1)}m is acceptable`,
        });
      }

      // 6. Mechanical Protection (BS 7671:522.6)
      if (!isArmoured && metrics.complexity === 'High') {
        newChecks.push({
          id: 'mechanical-protection',
          regulation: 'BS 7671:522.6',
          description: 'Mechanical Protection',
          status: 'warning',
          message: 'Non-armoured cable in complex installation',
          suggestion: 'Consider SWA cable or additional conduit protection',
        });
      } else {
        newChecks.push({
          id: 'mechanical-protection',
          regulation: 'BS 7671:522.6',
          description: 'Mechanical Protection',
          status: 'pass',
          message: isArmoured ? 'SWA cable provides adequate protection' : 'Route suitable for cable type',
        });
      }

      // 7. Earth Fault Loop Impedance (BS 7671:411.4)
      newChecks.push({
        id: 'earth-fault',
        regulation: 'BS 7671:411.4',
        description: 'Earth Fault Loop Impedance',
        status: 'info',
        message: 'Verify Zs at installation for protective device operation',
        suggestion: 'Conduct earth fault loop impedance test at furthest point',
      });

      // 8. RCD Requirements (BS 7671:415.1)
      newChecks.push({
        id: 'rcd-protection',
        regulation: 'BS 7671:415.1',
        description: 'RCD Protection',
        status: 'info',
        message: 'Confirm 30mA RCD protection for socket outlets',
        suggestion: 'Verify RCD protection meets regulation requirements',
      });

      // 9. Cable Identification (BS 7671:514)
      newChecks.push({
        id: 'cable-id',
        regulation: 'BS 7671:514',
        description: 'Cable Identification',
        status: 'info',
        message: 'Label cable at both ends and accessible points',
        suggestion: 'Use durable labels showing circuit designation and cable type',
      });

      return newChecks;
    };

    setChecks(performChecks());
  }, [route, loadCurrent, voltage, cableRating, isArmoured]);

  const summary = {
    failures: checks.filter((c) => c.status === 'fail').length,
    warnings: checks.filter((c) => c.status === 'warning').length,
    passes: checks.filter((c) => c.status === 'pass').length,
    info: checks.filter((c) => c.status === 'info').length,
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'fail':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getAlertVariant = (status: string): 'default' | 'destructive' => {
    return status === 'fail' ? 'destructive' : 'default';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>BS 7671 Compliance Checker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{summary.failures}</div>
            <div className="text-sm text-muted-foreground">Failures</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
            <div className="text-2xl font-bold text-yellow-500">{summary.warnings}</div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-500">{summary.passes}</div>
            <div className="text-sm text-muted-foreground">Passes</div>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-500">{summary.info}</div>
            <div className="text-sm text-muted-foreground">Info</div>
          </div>
        </div>

        {/* Compliance Checks */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {checks.map((check) => (
              <Alert key={check.id} variant={getAlertVariant(check.status)}>
                <div className="flex items-start gap-3">
                  {getIcon(check.status)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{check.description}</span>
                      <span className="text-xs text-muted-foreground">{check.regulation}</span>
                    </div>
                    <AlertDescription>{check.message}</AlertDescription>
                    {check.suggestion && (
                      <div className="text-sm text-muted-foreground mt-1">
                        💡 {check.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
