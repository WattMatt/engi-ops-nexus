import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreateCableScheduleDialog } from "@/components/cable-schedules/CreateCableScheduleDialog";
import { ProjectSavedReportsList } from "@/components/cable-schedules/ProjectSavedReportsList";
import { AllCableEntriesView } from "@/components/cable-schedules/AllCableEntriesView";
import { CableRatesManager } from "@/components/cable-schedules/CableRatesManager";
import { CableCostsSummary } from "@/components/cable-schedules/CableCostsSummary";
import { EditableCableSizingReference } from "@/components/cable-schedules/EditableCableSizingReference";
import { EditableCalculationSettings } from "@/components/cable-schedules/EditableCalculationSettings";
import { CableSchedulesOverview } from "@/components/cable-schedules/CableSchedulesOverview";
import { CableSizingOptimizer } from "@/components/cable-schedules/CableSizingOptimizer";

const CableSchedules = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const projectId = localStorage.getItem("selectedProjectId");

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["cable-schedules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Auto-redirect to the single schedule if it exists
  useEffect(() => {
    if (schedules && schedules.length === 1) {
      navigate(`/dashboard/cable-schedules/${schedules[0].id}`, { replace: true });
    }
  }, [schedules, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If there's exactly one schedule, the useEffect will redirect
  // This will only show if there are 0 or multiple schedules
  if (!schedules || schedules.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cable Schedule</h1>
            <p className="text-muted-foreground">
              Create a cable schedule to track electrical cables, routes, and costs
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Cable Schedule Yet</CardTitle>
            <CardDescription>
              Create your first cable schedule to start tracking electrical cables for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Cable Schedule
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-12">
            <TabsTrigger value="overview" className="text-base">Overview</TabsTrigger>
            <TabsTrigger value="cables" className="text-base">Cable Tables</TabsTrigger>
            <TabsTrigger value="optimizer" className="text-base">Optimizer</TabsTrigger>
            <TabsTrigger value="calculations" className="text-base">Settings</TabsTrigger>
            <TabsTrigger value="rates" className="text-base">Rates</TabsTrigger>
            <TabsTrigger value="costs" className="text-base">Costs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            {projectId && <CableSchedulesOverview projectId={projectId} />}
          </TabsContent>
          
          <TabsContent value="cables" className="mt-6">
            <div className="space-y-6">
              <EditableCableSizingReference />
              {projectId && <AllCableEntriesView projectId={projectId} />}
            </div>
          </TabsContent>
          
          <TabsContent value="optimizer" className="mt-6">
            {projectId && <CableSizingOptimizer projectId={projectId} />}
          </TabsContent>
          
          <TabsContent value="calculations" className="mt-6">
            {projectId && <EditableCalculationSettings projectId={projectId} />}
          </TabsContent>
          
          <TabsContent value="rates" className="mt-6">
            {projectId && <CableRatesManager projectId={projectId} />}
          </TabsContent>
          
          <TabsContent value="costs" className="mt-6">
            {projectId && <CableCostsSummary projectId={projectId} />}
          </TabsContent>
        </Tabs>

        <CreateCableScheduleDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            // Query will refetch and redirect will happen
          }}
        />
      </div>
    );
  }

  // If multiple schedules exist (shouldn't happen per requirements, but handle gracefully)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Multiple Cable Schedules Found</h1>
        <p className="text-muted-foreground">
          This project has multiple cable schedules. Please select one to continue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <Card
            key={schedule.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/dashboard/cable-schedules/${schedule.id}`)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{schedule.schedule_name}</CardTitle>
              <CardDescription>
                Schedule #{schedule.schedule_number} - {schedule.revision}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Date:</span>{" "}
                  {new Date(schedule.schedule_date).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CableSchedules;
