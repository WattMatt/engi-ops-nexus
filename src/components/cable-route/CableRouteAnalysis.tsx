import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComplianceChecker } from './ComplianceChecker';
import { MaterialTakeoffReport } from './MaterialTakeoffReport';
import { TestingCommissioningChecklist } from './TestingCommissioningChecklist';
import { CostBreakdown } from './CostBreakdown';
import { CostTemplateManager } from './CostTemplateManager';
import { RouteVersionHistory } from './RouteVersionHistory';
import { CableRoute, CostTemplate, RouteVersion } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, AlertTriangle } from 'lucide-react';

interface CableRouteAnalysisProps {
  route: CableRoute;
  onRouteUpdate?: (route: CableRoute) => void;
}

export function CableRouteAnalysis({ route, onRouteUpdate }: CableRouteAnalysisProps) {
  const [costTemplate, setCostTemplate] = useState<CostTemplate | null>(null);
  const [versions, setVersions] = useState<RouteVersion[]>([]);

  const handleRevertVersion = (version: RouteVersion) => {
    if (onRouteUpdate) {
      const updatedRoute: CableRoute = {
        ...route,
        points: version.points,
        cableType: version.cableType as any,
        diameter: version.diameter,
        metrics: version.metrics,
      };
      onRouteUpdate(updatedRoute);
    }
  };

  const handleDeleteVersion = (versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {route.metrics && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Route Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Length</div>
                    <div className="text-2xl font-bold">{route.metrics.totalLength.toFixed(1)}m</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Est. Cost</div>
                    <div className="text-2xl font-bold">£{route.metrics.totalCost.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Supports</div>
                    <div className="text-2xl font-bold">{route.metrics.supportCount}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Bends</div>
                    <div className="text-2xl font-bold">{route.metrics.bendCount}</div>
                  </div>
                </div>
              </div>
            )}
            
            <CostBreakdown route={route} />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                3D Visualization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <div className="text-center text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">3D visualization temporarily unavailable</p>
                  <p className="text-xs mt-1">View route metrics above</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <ComplianceChecker route={route} />
        </TabsContent>

        <TabsContent value="materials" className="mt-6">
          <MaterialTakeoffReport route={route} template={costTemplate || undefined} />
        </TabsContent>

        <TabsContent value="testing" className="mt-6">
          <TestingCommissioningChecklist />
        </TabsContent>
      </Tabs>
      
      <CostTemplateManager onTemplateChange={setCostTemplate} />
      
      {versions.length > 0 && (
        <RouteVersionHistory
          versions={versions}
          currentVersionId={route.id}
          onRevert={handleRevertVersion}
          onDelete={handleDeleteVersion}
        />
      )}
    </div>
  );
}
