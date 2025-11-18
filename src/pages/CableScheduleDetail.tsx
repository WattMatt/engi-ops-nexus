import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, FileText, Settings, Download } from "lucide-react";
import { CableScheduleOverview } from "@/components/cable-schedules/CableScheduleOverview";
import { CableEntriesManager } from "@/components/cable-schedules/CableEntriesManager";
import { CableCalculationFormulas } from "@/components/cable-schedules/CableCalculationFormulas";
import { CableCostsSummary } from "@/components/cable-schedules/CableCostsSummary";
import { CableSizeCalculator } from "@/components/cable-schedules/CableSizeCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CableScheduleExportPDFButton } from "@/components/cable-schedules/CableScheduleExportPDFButton";
import { TestCalculationSettings } from "@/components/cable-schedules/TestCalculationSettings";

const CableScheduleDetail = () => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();

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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard/cable-schedules")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{schedule.schedule_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule #{schedule.schedule_number} • Rev {schedule.revision} • {new Date(schedule.schedule_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <CableScheduleExportPDFButton schedule={schedule} />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="calculator" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Calculator</span>
            <span className="sm:hidden">Calc</span>
          </TabsTrigger>
          <TabsTrigger value="cables" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Cable Schedule</span>
            <span className="sm:hidden">Cables</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Cost Summary</span>
            <span className="sm:hidden">Costs</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
        </TabsList>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <CableSizeCalculator projectId={schedule.project_id} />
        </TabsContent>

        {/* Cable Entries Tab */}
        <TabsContent value="cables" className="space-y-6">
          <CableEntriesManager scheduleId={scheduleId!} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <CableScheduleOverview schedule={schedule} />
          <CableCalculationFormulas schedule={schedule} />
        </TabsContent>

        {/* Cost Summary Tab */}
        <TabsContent value="costs">
          <CableCostsSummary projectId={schedule.project_id} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <TestCalculationSettings projectId={schedule.project_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CableScheduleDetail;
