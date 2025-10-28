import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { CreateFloorPlanDialog } from "@/components/floorplan/CreateFloorPlanDialog";
import { format } from "date-fns";
import { toast } from "sonner";
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

const FloorPlans = () => {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteFloorPlanId, setDeleteFloorPlanId] = useState<string | null>(null);
  const projectId = localStorage.getItem("selectedProjectId");

  const { data: floorPlans, isLoading, refetch } = useQuery({
    queryKey: ["floor-plans", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plans")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (floorPlanId: string) => {
      const { error } = await supabase
        .from("floor_plans")
        .delete()
        .eq("id", floorPlanId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Floor plan deleted successfully");
      refetch();
      setDeleteFloorPlanId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete floor plan");
    },
  });

  const handleFloorPlanClick = (floorPlanId: string) => {
    navigate(`/dashboard/floor-plans/${floorPlanId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, floorPlanId: string) => {
    e.stopPropagation();
    setDeleteFloorPlanId(floorPlanId);
  };

  const confirmDelete = () => {
    if (deleteFloorPlanId) {
      deleteMutation.mutate(deleteFloorPlanId);
    }
  };

  if (isLoading) {
    return <div>Loading floor plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Floor Plans</h1>
          <p className="text-muted-foreground">
            View and edit floor plan markups with cable routes and equipment
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Floor Plan
        </Button>
      </div>

      {!floorPlans || floorPlans.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No floor plans yet</CardTitle>
            <CardDescription>
              Upload your first floor plan to start marking up cable routes and equipment locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Floor Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {floorPlans.map((plan) => (
            <Card
              key={plan.id}
              className="cursor-pointer hover:shadow-lg transition-shadow relative group"
              onClick={() => handleFloorPlanClick(plan.id)}
            >
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteClick(e, plan.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <CardHeader>
                <CardTitle className="text-lg">
                  {plan.name}
                </CardTitle>
                <CardDescription>
                  {format(new Date(plan.created_at), "MMM dd, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.pdf_url && (
                    <div className="aspect-video bg-muted rounded-md overflow-hidden">
                      <iframe
                        src={plan.pdf_url}
                        className="w-full h-full pointer-events-none"
                        title={plan.name}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Design Purpose:</span>
                      <span className="text-muted-foreground capitalize">
                        {plan.design_purpose.replace(/_/g, " ")}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Scale Calibrated:</span>
                      {plan.scale_meters_per_pixel ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <XCircle className="h-4 w-4" />
                          Not Set
                        </span>
                      )}
                    </div>
                    
                    {plan.scale_meters_per_pixel && (
                      <div className="text-xs text-muted-foreground">
                        1px = {plan.scale_meters_per_pixel.toFixed(4)}m
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateFloorPlanDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(floorPlanId) => {
          refetch();
          setShowCreateDialog(false);
          navigate(`/dashboard/floor-plans/${floorPlanId}`);
        }}
      />

      <AlertDialog open={!!deleteFloorPlanId} onOpenChange={(open) => !open && setDeleteFloorPlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Floor Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the floor plan
              and all associated data (equipment, zones, cables, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FloorPlans;
