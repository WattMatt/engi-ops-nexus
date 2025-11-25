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
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 lg:w-auto lg:inline-grid">
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
          <TabsTrigger value="reports" className="gap-2">
            <File className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
            <span className="sm:hidden">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="calculations" className="gap-2">
            <SigmaSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Calculations</span>
            <span className="sm:hidden">Calc</span>
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
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Settings</span>
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

        {/* Reports Tab */}
        <TabsContent value="reports">
          <CableScheduleReports schedule={schedule} />
        </TabsContent>

        {/* Calculations Tab */}
        <TabsContent value="calculations">
          <CableCalculationFormulas schedule={schedule} />
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates">
          <CableRatesManager projectId={schedule.project_id} />
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
