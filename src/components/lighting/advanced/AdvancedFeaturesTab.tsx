import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Map, 
  Box, 
  Calculator, 
  FileCheck, 
  Building2, 
  FileText,
  RefreshCw
} from 'lucide-react';

// Import Phase 5 components
import { FloorPlanLightingOverlay } from '../floorplan/FloorPlanLightingOverlay';
import { LightingLayerControls } from '../floorplan/LightingLayerControls';
import { LightConePreview } from '../visualization/LightConePreview';
import { LuxSimulation } from '../visualization/LuxSimulation';
import { IESFileParser } from '../photometric/IESFileParser';
import { PhotometricReport } from '../photometric/PhotometricReport';
import { ComplianceChecker } from '../photometric/ComplianceChecker';
import { SupplierManagement } from '../suppliers/SupplierManagement';
import { SupplierQuoteRequest } from '../suppliers/SupplierQuoteRequest';
import { SupplierPriceSync } from '../suppliers/SupplierPriceSync';

interface AdvancedFeaturesTabProps {
  projectId?: string | null;
}

export const AdvancedFeaturesTab = ({ projectId }: AdvancedFeaturesTabProps) => {
  const [activeSection, setActiveSection] = useState('visualization');
  
  // State for floor plan integration demo
  const [showLightingLayer, setShowLightingLayer] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(100);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<'type' | 'status'>('type');

  // Demo photometric data
  const demoPhotometricData = {
    candelas: [1000, 950, 850, 700, 500, 300, 150, 50, 10],
    verticalAngles: [0, 10, 20, 30, 40, 50, 60, 70, 80],
    horizontalAngles: [0, 90, 180, 270],
    lumens: 3000,
    watts: 30
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Advanced Features</h2>
          <p className="text-sm text-muted-foreground">
            Floor plan integration, 3D visualization, photometric analysis, and supplier management
          </p>
        </div>
        <Badge className="bg-purple-500/20 text-purple-400">Phase 5</Badge>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="visualization" className="flex items-center gap-1">
            <Box className="h-4 w-4" />
            <span className="hidden sm:inline">3D Visualization</span>
          </TabsTrigger>
          <TabsTrigger value="photometric" className="flex items-center gap-1">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Photometric</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-1">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Suppliers</span>
          </TabsTrigger>
        </TabsList>

        {/* 3D Visualization Tab */}
        <TabsContent value="visualization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LightConePreview 
              beamAngle={60}
              mountingHeight={3}
              colorTemperature={4000}
              lumens={2000}
            />
            <LuxSimulation projectId={projectId} />
          </div>
        </TabsContent>

        {/* Photometric Analysis Tab */}
        <TabsContent value="photometric" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IESFileParser />
            <PhotometricReport 
              data={demoPhotometricData}
              fittingName="Demo Fitting"
            />
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <ComplianceChecker 
            projectId={projectId}
            spaceType="office_general"
            actualLux={520}
            uniformity={0.65}
            glareRating={18}
            colorRendering={85}
            energyDensity={10.5}
          />
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <Tabs defaultValue="management" className="space-y-4">
            <TabsList>
              <TabsTrigger value="management">
                <Building2 className="h-4 w-4 mr-1" />
                Suppliers
              </TabsTrigger>
              <TabsTrigger value="quotes">
                <FileText className="h-4 w-4 mr-1" />
                Quote Requests
              </TabsTrigger>
              <TabsTrigger value="sync">
                <RefreshCw className="h-4 w-4 mr-1" />
                Price Sync
              </TabsTrigger>
            </TabsList>

            <TabsContent value="management">
              <SupplierManagement />
            </TabsContent>

            <TabsContent value="quotes">
              <SupplierQuoteRequest projectId={projectId} />
            </TabsContent>

            <TabsContent value="sync">
              <SupplierPriceSync projectId={projectId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Floor Plan Integration Note */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Map className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Floor Plan Integration</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The floor plan lighting overlay is available when viewing floor plans. 
                Navigate to a floor plan to place lighting fittings directly on the drawing 
                and automatically generate schedules based on placement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedFeaturesTab;
