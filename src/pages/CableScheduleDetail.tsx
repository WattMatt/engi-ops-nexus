import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, FileText, Settings, Download, Tag, TrendingDown, File, BarChart3, DollarSign, SigmaSquare } from "lucide-react";
import { CableScheduleOverview } from "@/components/cable-schedules/CableScheduleOverview";
import { CableSchedulesOverview } from "@/components/cable-schedules/CableSchedulesOverview";
import { CableEntriesManager } from "@/components/cable-schedules/CableEntriesManager";
import { CableCalculationFormulas } from "@/components/cable-schedules/CableCalculationFormulas";
import { CableCostsSummary } from "@/components/cable-schedules/CableCostsSummary";
import { CableRatesManager } from "@/components/cable-schedules/CableRatesManager";
import { CableTagSchedule } from "@/components/cable-schedules/CableTagSchedule";
import { CableSizingOptimizer } from "@/components/cable-schedules/CableSizingOptimizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CableScheduleExportPDFButton } from "@/components/cable-schedules/CableScheduleExportPDFButton";
import { TestCalculationSettings } from "@/components/cable-schedules/TestCalculationSettings";
import { CableScheduleReports } from "@/components/cable-schedules/CableScheduleReports";
import { EditableCableSizingReference } from "@/components/cable-schedules/EditableCableSizingReference";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OfflineSyncStatusBar } from "@/components/pwa/OfflineSyncStatusBar";
import { useCableOfflineSync } from "@/hooks/useCableOfflineSync";

const CableScheduleDetail = () => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"calculations" | "settings" | "tables">("settings");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["cable-schedule", scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!scheduleId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  
  // Offline sync hook
  const {
    unsyncedCount,
    isOnline,
    syncNow,
  } = useCableOfflineSync({ scheduleId: scheduleId || '', enabled: !!scheduleId });
  
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncNow();
      setLastSyncAt(Date.now());
    } finally {
      setIsSyncing(false);
    }
  }, [syncNow]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading cable schedule...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Cable schedule not found</p>
          <Button onClick={() => navigate("/dashboard/cable-schedules")}>
            Back to Schedules
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{schedule.schedule_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule #{schedule.schedule_number} • Rev {schedule.revision} • {new Date(schedule.schedule_date).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSettingsDialogOpen(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Offline Sync Status */}
      <OfflineSyncStatusBar
        pendingCount={unsyncedCount}
        isSyncing={isSyncing}
        onSync={handleSync}
        lastSyncAt={lastSyncAt}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="cables" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Cable Schedule</span>
            <span className="sm:hidden">Cables</span>
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Optimizer</span>
            <span className="sm:hidden">Optimize</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Cable Tags</span>
            <span className="sm:hidden">Tags</span>
          </TabsTrigger>
          <TabsTrigger value="rates" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Rates</span>
            <span className="sm:hidden">Rates</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Costs</span>
            <span className="sm:hidden">Costs</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <File className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
            <span className="sm:hidden">Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <CableSchedulesOverview projectId={schedule.project_id} />
          <CableScheduleOverview schedule={schedule} />
        </TabsContent>

        {/* Cable Entries Tab */}
        <TabsContent value="cables" className="space-y-6">
          <CableEntriesManager scheduleId={scheduleId!} />
        </TabsContent>

        {/* Cable Sizing Optimizer Tab */}
        <TabsContent value="optimizer">
          <CableSizingOptimizer projectId={schedule.project_id} />
        </TabsContent>

        {/* Cable Tag Schedule Tab */}
        <TabsContent value="tags">
          <CableTagSchedule scheduleId={scheduleId!} />
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates">
          <CableRatesManager projectId={schedule.project_id} />
        </TabsContent>

        {/* Cost Summary Tab */}
        <TabsContent value="costs">
          <CableCostsSummary projectId={schedule.project_id} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <CableScheduleReports schedule={schedule} />
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <Tabs value={settingsView} onValueChange={(v) => setSettingsView(v as any)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="calculations" className="gap-2">
                <SigmaSquare className="h-4 w-4" />
                Calculations
              </TabsTrigger>
              <TabsTrigger value="tables" className="gap-2">
                <FileText className="h-4 w-4" />
                Cable Tables
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4">
              <TestCalculationSettings projectId={schedule.project_id} />
            </TabsContent>
            
            <TabsContent value="calculations" className="space-y-4">
              <CableCalculationFormulas schedule={schedule} />
            </TabsContent>
            
            <TabsContent value="tables" className="space-y-4">
              <EditableCableSizingReference />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CableScheduleDetail;
