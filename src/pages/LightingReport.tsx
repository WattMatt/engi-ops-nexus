import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Library, 
  FileText, 
  GitCompare, 
  Calendar, 
  FileOutput,
  Settings,
  Map
} from 'lucide-react';
import { LightingRoadmap } from '@/components/lighting/LightingRoadmap';

const LightingReport = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('roadmap');

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
        <Badge variant="secondary" className="text-sm">
          Development Preview
        </Badge>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="roadmap" className="flex items-center gap-1">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Roadmap</span>
          </TabsTrigger>
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
            <span className="hidden sm:inline">Spec Sheets</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Comparison</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <FileOutput className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Roadmap Tab */}
        <TabsContent value="roadmap">
          <LightingRoadmap />
        </TabsContent>

        {/* Overview Tab - Phase 1 */}
        <TabsContent value="overview">
          <PlaceholderTab 
            title="Lighting Overview Dashboard" 
            phase={1} 
            icon={Lightbulb} 
          />
        </TabsContent>

        {/* Library Tab - Phase 1 */}
        <TabsContent value="library">
          <PlaceholderTab 
            title="Lighting Fittings Library" 
            phase={1} 
            icon={Library} 
          />
        </TabsContent>

        {/* Spec Sheets Tab - Phase 2 */}
        <TabsContent value="specs">
          <PlaceholderTab 
            title="Specification Sheet Management" 
            phase={2} 
            icon={FileText} 
          />
        </TabsContent>

        {/* Comparison Tab - Phase 3 */}
        <TabsContent value="comparison">
          <PlaceholderTab 
            title="Fitting Comparison Tool" 
            phase={3} 
            icon={GitCompare} 
          />
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
          <PlaceholderTab 
            title="Lighting Reports" 
            phase={4} 
            icon={FileOutput} 
          />
        </TabsContent>

        {/* Settings Tab - Phase 1 */}
        <TabsContent value="settings">
          <PlaceholderTab 
            title="Lighting Settings" 
            phase={1} 
            icon={Settings} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LightingReport;
