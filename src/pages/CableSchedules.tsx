import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateCableScheduleDialog } from "@/components/cable-schedules/CreateCableScheduleDialog";
import { ProjectSavedReportsList } from "@/components/cable-schedules/ProjectSavedReportsList";
import { AllCableEntriesView } from "@/components/cable-schedules/AllCableEntriesView";
import { CableRatesManager } from "@/components/cable-schedules/CableRatesManager";
import { CableCostsSummary } from "@/components/cable-schedules/CableCostsSummary";
import { CableSizingReferenceView } from "@/components/cable-schedules/CableSizingReferenceView";
import { EditableCableSizingReference } from "@/components/cable-schedules/EditableCableSizingReference";
import { CableCalculationFormulas } from "@/components/cable-schedules/CableCalculationFormulas";
import { EditableCalculationSettings } from "@/components/cable-schedules/EditableCalculationSettings";

const CableSchedules = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null);
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

  const handleDeleteClick = (e: React.MouseEvent, schedule: any) => {
    e.stopPropagation(); // Prevent card click
    setScheduleToDelete(schedule);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;

    try {
      const { error } = await supabase
        .from("cable_schedules")
        .delete()
        .eq("id", scheduleToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable schedule deleted successfully",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setScheduleToDelete(null);
    }
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

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-12">
          <TabsTrigger value="schedules" className="text-base">Existing Schedules</TabsTrigger>
          <TabsTrigger value="cables" className="text-base">Cable Tables</TabsTrigger>
          <TabsTrigger value="calculations" className="text-base">Calculations</TabsTrigger>
          <TabsTrigger value="saved" className="text-base">Saved Reports</TabsTrigger>
          <TabsTrigger value="rates" className="text-base">Rates</TabsTrigger>
          <TabsTrigger value="costs" className="text-base">Costs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedules" className="mt-6">
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
                  className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                  onClick={() => handleScheduleClick(schedule.id)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => handleDeleteClick(e, schedule)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
        </TabsContent>
        
        
        <TabsContent value="cables" className="mt-6">
          <div className="space-y-6">
            <EditableCableSizingReference />
            {projectId && <AllCableEntriesView projectId={projectId} />}
          </div>
        </TabsContent>
        
        <TabsContent value="calculations" className="mt-6">
          {projectId && <EditableCalculationSettings projectId={projectId} />}
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

      <CreateCableScheduleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cable Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scheduleToDelete?.schedule_name}"? This will also delete all cable entries in this schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CableSchedules;
