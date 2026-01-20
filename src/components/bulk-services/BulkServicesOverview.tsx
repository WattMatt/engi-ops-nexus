import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Calculator, Building2, FileText, Wrench, Hammer, Activity } from "lucide-react";
import { BulkServicesExportPDFButton } from "./BulkServicesExportPDFButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import { SANS204Calculator } from "./SANS204Calculator";
import { useTaskAutoSync } from "./workflow/useTaskAutoSync";
import { 
  WorkflowSummary,
  Phase1LoadEstimation,
  Phase2BulkRequirements,
  Phase3UtilityApplication,
  Phase4DesignApproval,
  Phase5Construction,
  Phase6Operation
} from "./phases";

interface BulkServicesOverviewProps {
  documentId: string;
  onBack: () => void;
}

export const BulkServicesOverview = ({ documentId, onBack }: BulkServicesOverviewProps) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [reportsRefreshTrigger, setReportsRefreshTrigger] = useState(0);
  const [mapSelectedZone, setMapSelectedZone] = useState<string | null>(null);
  
  const { data: document, isLoading } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["bulk-services-sections", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_sections")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
  });

  // Fetch workflow phases to get phase IDs
  const { data: phases } = useQuery({
    queryKey: ["bulk-services-workflow-phases", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_workflow_phases")
        .select("*")
        .eq("document_id", documentId)
        .order("phase_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Create a map of phase numbers to phase IDs
  const phaseMap = useMemo(() => {
    const map: Record<number, string> = {};
    phases?.forEach(phase => {
      map[phase.phase_number] = phase.id;
    });
    return map;
  }, [phases]);

  // Initialize mapSelectedZone from persisted document data
  useEffect(() => {
    if (document?.climatic_zone && !mapSelectedZone) {
      setMapSelectedZone(document.climatic_zone);
    }
  }, [document?.climatic_zone]);

  // Auto-sync workflow tasks with document data
  useTaskAutoSync(documentId, document);

  const handleNavigateToPhase = (phaseNumber: number) => {
    setActiveTab(`phase-${phaseNumber}`);
  };

  const handleZoneSelect = (zone: string) => {
    setMapSelectedZone(zone);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Document not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <BulkServicesExportPDFButton
          documentId={documentId}
          onReportSaved={() => setReportsRefreshTrigger(prev => prev + 1)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="summary" className="flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
          <TabsTrigger value="phase-1" className="flex items-center gap-1.5">
            <Calculator className="h-4 w-4" />
            <span className="hidden lg:inline">1. Load</span>
          </TabsTrigger>
          <TabsTrigger value="phase-2" className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden lg:inline">2. Bulk</span>
          </TabsTrigger>
          <TabsTrigger value="phase-3" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden lg:inline">3. Utility</span>
          </TabsTrigger>
          <TabsTrigger value="phase-4" className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />
            <span className="hidden lg:inline">4. Design</span>
          </TabsTrigger>
          <TabsTrigger value="phase-5" className="flex items-center gap-1.5">
            <Hammer className="h-4 w-4" />
            <span className="hidden lg:inline">5. Build</span>
          </TabsTrigger>
          <TabsTrigger value="phase-6" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden lg:inline">6. Ops</span>
          </TabsTrigger>
          <TabsTrigger value="zone-map" className="flex items-center gap-1.5">
            <span className="hidden lg:inline">Zone Map</span>
          </TabsTrigger>
        </TabsList>

        {/* Summary Dashboard */}
        <TabsContent value="summary" className="space-y-4">
          <WorkflowSummary 
            documentId={documentId} 
            document={document}
            onNavigateToPhase={handleNavigateToPhase}
          />
        </TabsContent>

        {/* Phase 1: Load Estimation */}
        <TabsContent value="phase-1" className="space-y-4">
          {phaseMap[1] ? (
            <Phase1LoadEstimation 
              documentId={documentId}
              phaseId={phaseMap[1]}
              document={document}
              mapSelectedZone={mapSelectedZone}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Please initialize the workflow from the Summary tab first.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Phase 2: Bulk Requirements */}
        <TabsContent value="phase-2" className="space-y-4">
          {phaseMap[2] ? (
            <Phase2BulkRequirements 
              documentId={documentId}
              phaseId={phaseMap[2]}
              document={document}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Please initialize the workflow from the Summary tab first.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Phase 3: Utility Application */}
        <TabsContent value="phase-3" className="space-y-4">
          {phaseMap[3] ? (
            <Phase3UtilityApplication 
              documentId={documentId}
              phaseId={phaseMap[3]}
              document={document}
              sections={sections || []}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Please initialize the workflow from the Summary tab first.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Phase 4: Design & Approval */}
        <TabsContent value="phase-4" className="space-y-4">
          {phaseMap[4] ? (
            <Phase4DesignApproval 
              documentId={documentId}
              phaseId={phaseMap[4]}
              document={document}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Please initialize the workflow from the Summary tab first.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Phase 5: Construction */}
        <TabsContent value="phase-5" className="space-y-4">
          {phaseMap[5] ? (
            <Phase5Construction 
              documentId={documentId}
              phaseId={phaseMap[5]}
              document={document}
              sections={sections || []}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Please initialize the workflow from the Summary tab first.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Phase 6: Operation */}
        <TabsContent value="phase-6" className="space-y-4">
          {phaseMap[6] ? (
            <Phase6Operation 
              documentId={documentId}
              phaseId={phaseMap[6]}
              document={document}
              reportsRefreshTrigger={reportsRefreshTrigger}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Please initialize the workflow from the Summary tab first.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Zone Map */}
        <TabsContent value="zone-map" className="space-y-4">
          <SANS204Calculator 
            documentId={documentId} 
            onZoneSelect={handleZoneSelect}
            onMunicipalityDetected={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
