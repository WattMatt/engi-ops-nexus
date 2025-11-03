import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateCableScheduleDialog } from "@/components/cable-schedules/CreateCableScheduleDialog";
import { ProjectSavedReportsList } from "@/components/cable-schedules/ProjectSavedReportsList";
import { AllCableEntriesView } from "@/components/cable-schedules/AllCableEntriesView";
import { CableRatesManager } from "@/components/cable-schedules/CableRatesManager";
import { CableCostsSummary } from "@/components/cable-schedules/CableCostsSummary";
import { CableSizingReferenceView } from "@/components/cable-schedules/CableSizingReferenceView";

const CableSchedules = () => {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const projectId = localStorage.getItem("selectedProjectId");

  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ["cable-schedules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("project_id", projectId)
        .order("revision", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleScheduleClick = (scheduleId: string) => {
    navigate(`/dashboard/cable-schedules/${scheduleId}`);
  };

  if (isLoading) {
    return <div>Loading cable schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cable Schedules</h1>
          <p className="text-muted-foreground">
            Track electrical cable lengths, routes, and costs
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Cable Schedule
        </Button>
      </div>

      <Tabs defaultValue="cables" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="cables" className="text-base">Cable Tables</TabsTrigger>
          <TabsTrigger value="saved" className="text-base">Saved Schedules</TabsTrigger>
          <TabsTrigger value="rates" className="text-base">Rates</TabsTrigger>
          <TabsTrigger value="costs" className="text-base">Costs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cables" className="mt-6">
          <div className="space-y-6">
            <CableSizingReferenceView />
            {projectId && <AllCableEntriesView projectId={projectId} />}
          </div>
        </TabsContent>
        
        <TabsContent value="saved" className="mt-6">
          {projectId && <ProjectSavedReportsList projectId={projectId} />}
        </TabsContent>
        
        <TabsContent value="rates" className="mt-6">
          {projectId && <CableRatesManager projectId={projectId} />}
        </TabsContent>
        
        <TabsContent value="costs" className="mt-6">
          {projectId && <CableCostsSummary projectId={projectId} />}
        </TabsContent>
      </Tabs>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Cable Schedules by Revision</h2>
        {!schedules || schedules.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No cable schedules yet</CardTitle>
              <CardDescription>
                Create your first cable schedule to start tracking electrical cables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Cable Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleScheduleClick(schedule.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {schedule.schedule_name}
                  </CardTitle>
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
                    {schedule.layout_name && (
                      <div>
                        <span className="font-medium">Layout:</span>{" "}
                        {schedule.layout_name}
                      </div>
                    )}
                    {schedule.notes && (
                      <div className="text-muted-foreground truncate">
                        {schedule.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateCableScheduleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
};

export default CableSchedules;
