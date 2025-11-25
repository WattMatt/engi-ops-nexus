import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Route3DViewer } from './Route3DViewer';
import { ComplianceChecker } from './ComplianceChecker';
import { MaterialTakeoffReport } from './MaterialTakeoffReport';
import { TestingCommissioningChecklist } from './TestingCommissioningChecklist';
import { CostBreakdown } from './CostBreakdown';
import { CostTemplateManager } from './CostTemplateManager';
import { RouteVersionHistory } from './RouteVersionHistory';
import { ClashDetection } from './ClashDetection';
import { CableRoute, CostTemplate, RouteVersion } from './types';

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
      <Tabs defaultValue="3d-view" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="3d-view">3D View</TabsTrigger>
          <TabsTrigger value="clash">Clash Detection</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="3d-view" className="space-y-6">
          <Route3DViewer points={route.points} cableDiameter={route.diameter} />
          
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
        </TabsContent>

        <TabsContent value="clash" className="mt-6">
          <ClashDetection points={route.points} cableDiameter={route.diameter} />
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

        <TabsContent value="settings" className="space-y-6">
          <CostTemplateManager onTemplateChange={setCostTemplate} />
          
          {versions.length > 0 && (
            <RouteVersionHistory
              versions={versions}
              currentVersionId={route.id}
              onRevert={handleRevertVersion}
              onDelete={handleDeleteVersion}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
