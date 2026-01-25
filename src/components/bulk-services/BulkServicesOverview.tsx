/**
 * Bulk Services Overview - Two-Row Tab Layout
 * 
 * Row 1: Phase tabs (1-6)
 * Row 2: Step tabs within selected phase
 * Header: Summary metric cards
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, Building2, FileText, Wrench, Hammer, Activity, PlayCircle, Loader2 } from "lucide-react";
import { ClimaticZoneStrip } from "./ClimaticZoneStrip";
import { BulkServicesExportPDFButton } from "./BulkServicesExportPDFButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import { useTaskAutoSync } from "./workflow/useTaskAutoSync";
import { useWorkflowInitializer } from "./workflow/useWorkflowInitializer";
import { PhaseSummaryHeader } from "./phases/PhaseSummaryHeader";
import { PhaseStepTabs } from "./phases/PhaseStepTabs";
import { BULK_SERVICES_WORKFLOW_TEMPLATE } from "./workflow/workflowTemplate";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BulkServicesOverviewProps {
  documentId: string;
  onBack: () => void;
}

export const BulkServicesOverview = ({ documentId, onBack }: BulkServicesOverviewProps) => {
  const [activePhase, setActivePhase] = useState("phase-1");
  const [activeSteps, setActiveSteps] = useState<Record<string, string>>({});
  const [reportsRefreshTrigger, setReportsRefreshTrigger] = useState(0);
  const [mapSelectedZone, setMapSelectedZone] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const { initializeWorkflow } = useWorkflowInitializer(documentId);

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
  const { data: phases, isLoading: phasesLoading, refetch: refetchPhases } = useQuery({
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
  }, [document?.climatic_zone, mapSelectedZone]);

  // Auto-sync workflow tasks with document data
  useTaskAutoSync(documentId, document);

  const handleStepChange = (phaseId: string, stepId: string) => {
    setActiveSteps(prev => ({ ...prev, [phaseId]: stepId }));
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    await initializeWorkflow(document);
    await refetchPhases();
    setIsInitializing(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
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

  // Phase icons
  const phaseIcons = {
    1: Calculator,
    2: Building2,
    3: FileText,
    4: Wrench,
    5: Hammer,
    6: Activity,
  };

  // Short phase names for tabs
  const phaseShortNames = {
    1: "Load",
    2: "Bulk",
    3: "Utility",
    4: "Design",
    5: "Build",
    6: "Ops",
  };

  // Show initialization UI if no phases exist
  const needsInitialization = !phasesLoading && (!phases || phases.length === 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Top Bar */}
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

      {/* Header Cards - Summary Metrics */}
      <PhaseSummaryHeader documentId={documentId} document={document} />

      {/* Climatic Zone Map Strip */}
      <ClimaticZoneStrip documentId={documentId} document={document} />

      {/* Initialization Card (if needed) */}
      {needsInitialization ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Initialize Utility Application Workflow</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Set up the 6-phase process for obtaining electrical power from a utility. 
                  This will create a comprehensive checklist based on industry best practices.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {BULK_SERVICES_WORKFLOW_TEMPLATE.map((phase) => (
                  <Badge key={phase.phaseNumber} variant="outline">
                    {phase.phaseNumber}. {phase.phaseName}
                  </Badge>
                ))}
              </div>
              <Button 
                onClick={handleInitialize} 
                disabled={isInitializing}
                className="mt-4"
              >
                {isInitializing ? 'Initializing...' : 'Start Workflow'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Two-Row Tab Structure */
        <Tabs value={activePhase} onValueChange={setActivePhase} className="w-full">
          {/* Row 1: Phase Tabs */}
          <TabsList className="w-full h-auto grid grid-cols-6 p-1">
            {[1, 2, 3, 4, 5, 6].map((phaseNum) => {
              const phase = phases?.find(p => p.phase_number === phaseNum);
              const Icon = phaseIcons[phaseNum as keyof typeof phaseIcons];
              const isComplete = phase?.status === 'completed';
              const isActive = phase?.status === 'in_progress';
              
              return (
                <TabsTrigger
                  key={phaseNum}
                  value={`phase-${phaseNum}`}
                  disabled={!phase}
                  className={cn(
                    "flex items-center gap-2 py-3 relative",
                    isComplete && "text-chart-2",
                    isActive && "text-chart-1"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {phaseNum}. {phaseShortNames[phaseNum as keyof typeof phaseShortNames]}
                  </span>
                  <span className="sm:hidden">{phaseNum}</span>
                  
                  {/* Status indicator */}
                  {isComplete && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-chart-2" />
                  )}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-chart-1" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Row 2: Step Tabs Content for Each Phase */}
          {[1, 2, 3, 4, 5, 6].map((phaseNum) => {
            const phase = phases?.find(p => p.phase_number === phaseNum);
            
            return (
              <TabsContent key={phaseNum} value={`phase-${phaseNum}`} className="mt-6">
                {phase ? (
                  <PhaseStepTabs
                    phaseId={phase.id}
                    phaseName={phase.phase_name}
                    phaseNumber={phase.phase_number}
                    documentId={documentId}
                    document={document}
                    activeStep={activeSteps[phase.id] || ''}
                    onStepChange={(stepId) => handleStepChange(phase.id, stepId)}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Phase not initialized
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};
