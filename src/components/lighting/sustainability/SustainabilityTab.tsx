import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Leaf, 
  Calculator, 
  GitCompare, 
  Award,
  BarChart3
} from 'lucide-react';
import { CarbonCalculator } from './CarbonCalculator';
import { SustainabilityDashboard } from './SustainabilityDashboard';
import { ComparisonAnalysis } from './ComparisonAnalysis';
import { GreenBuildingCompliance } from './GreenBuildingCompliance';

interface SustainabilityTabProps {
  projectId?: string | null;
}

export const SustainabilityTab = ({ projectId }: SustainabilityTabProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock project data - would come from actual project in production
  const projectData = {
    totalWatts: 15000,
    projectArea: 1200,
    fittingCount: 150,
    ledPercentage: 95,
    hasOccupancySensors: true,
    hasDaylightSensors: true,
    hasDimmingControls: true,
    hasTaskLighting: false,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-600" />
              Sustainability & Carbon Analysis
            </CardTitle>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              South African Standards
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Calculate carbon emissions, analyze energy efficiency, compare lighting options, and track 
            compliance with green building standards including SANS 10400-XA, Green Star SA, LEED, and EDGE.
          </p>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Carbon Calculator</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">LED vs Traditional</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Green Building</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SustainabilityDashboard projectData={projectData} />
        </TabsContent>

        <TabsContent value="calculator">
          <CarbonCalculator 
            totalWatts={projectData.totalWatts} 
            projectArea={projectData.projectArea} 
          />
        </TabsContent>

        <TabsContent value="comparison">
          <ComparisonAnalysis />
        </TabsContent>

        <TabsContent value="compliance">
          <GreenBuildingCompliance projectData={projectData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SustainabilityTab;
