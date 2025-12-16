import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Library, 
  FileText, 
  GitCompare, 
  Calendar, 
  FileOutput,
  Settings,
  Map,
  FlaskConical,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { LightingRoadmap } from '@/components/lighting/LightingRoadmap';
import { LightingLibraryTab } from '@/components/lighting/LightingLibraryTab';
import { LightingOverview } from '@/components/lighting/LightingOverview';
import { LightingTestDashboard } from '@/components/lighting/testing/LightingTestDashboard';
import { SpecSheetUploadTab } from '@/components/lighting/specsheets/SpecSheetUploadTab';
import { FittingComparisonTab, LightingSettingsTab } from '@/components/lighting/comparison';
import { LightingReportTab } from '@/components/lighting/reports/LightingReportTab';
import { AdvancedFeaturesTab } from '@/components/lighting/advanced/AdvancedFeaturesTab';
import { AnalyticsTab } from '@/components/lighting/analytics';

const LightingReport = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    setProjectId(storedProjectId);
  }, []);

  // Placeholder components for future phases
  const PlaceholderTab = ({ title, phase, icon: Icon }: { title: string; phase: number; icon: React.ElementType }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-muted rounded-full mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          This feature will be available after completing Phase {phase} of the development roadmap.
        </p>
        <Badge variant="outline">Phase {phase}</Badge>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lighting Module</h1>
            <p className="text-muted-foreground">
              Comprehensive lighting management, specifications, and reporting
            </p>
          </div>
        </div>
        <Badge variant="default" className="text-sm bg-green-500/20 text-green-400">
          Phase 5 Complete
        </Badge>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-11 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-1">
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="specs" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Specs</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <FileOutput className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-1">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="flex items-center gap-1">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Roadmap</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Phase 1 */}
        <TabsContent value="overview">
          <LightingOverview projectId={projectId} />
        </TabsContent>

        {/* Library Tab - Phase 1 */}
        <TabsContent value="library">
          <LightingLibraryTab projectId={projectId} />
        </TabsContent>

        {/* Spec Sheets Tab - Phase 2 */}
        <TabsContent value="specs">
          <SpecSheetUploadTab projectId={projectId} />
        </TabsContent>

        {/* Comparison Tab - Phase 3 */}
        <TabsContent value="comparison">
          <FittingComparisonTab projectId={projectId} />
        </TabsContent>

        {/* Schedule Tab - Phase 1 */}
        <TabsContent value="schedule">
          <PlaceholderTab 
            title="Project Lighting Schedule" 
            phase={1} 
            icon={Calendar} 
          />
        </TabsContent>

        {/* Reports Tab - Phase 4 */}
        <TabsContent value="reports">
          <LightingReportTab projectId={projectId} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        {/* Advanced Tab - Phase 5 */}
        <TabsContent value="advanced">
          <AdvancedFeaturesTab projectId={projectId} />
        </TabsContent>

        {/* Settings Tab - Phase 3 */}
        <TabsContent value="settings">
          <LightingSettingsTab projectId={projectId} />
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests">
          <LightingTestDashboard />
        </TabsContent>

        {/* Roadmap Tab */}
        <TabsContent value="roadmap">
          <LightingRoadmap />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LightingReport;
