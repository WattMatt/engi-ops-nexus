import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { PDFThumbnail } from "@/components/floorplan/PDFThumbnail";

const FloorPlans = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteFloorPlanId, setDeleteFloorPlanId] = useState<string | null>(null);
  const projectId = localStorage.getItem("selectedProjectId");

  const { data: floorPlans, isLoading } = useQuery({
    queryKey: ["floor-plans", projectId],
    queryFn: async () => {
      console.log('🔍 Fetching floor plans for project:', projectId);
      const { data, error } = await supabase
        .from("floor_plans")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      console.log('✅ Loaded floor plans:', data?.length);
      return data;
    },
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (floorPlanId: string) => {
      console.log('🗑️ Deleting floor plan:', floorPlanId);
      const { error } = await supabase
        .from("floor_plans")
        .delete()
        .eq("id", floorPlanId);
      
      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }
      console.log('✅ Floor plan deleted from database');
    },
    onSuccess: () => {
      console.log('✅ Delete successful, invalidating queries');
      toast.success("Floor plan deleted successfully");
      // Invalidate and refetch the floor plans query
      queryClient.invalidateQueries({ queryKey: ["floor-plans", projectId] });
      setDeleteFloorPlanId(null);
    },
    onError: (error: any) => {
      console.error('❌ Delete mutation error:', error);
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

  // Group floor plans by design purpose
  const groupedFloorPlans = useMemo(() => {
    if (!floorPlans) return {};
    
    type FloorPlan = typeof floorPlans[number];
    type PurposeGroup = { label: string; plans: FloorPlan[] };
    type GroupedPlans = Record<string, PurposeGroup>;
    
    const purposes: GroupedPlans = {
      budget_markup: { label: "Budget Mark Up", plans: [] },
      pv_design: { label: "PV Design", plans: [] },
      line_shop: { label: "Line Shop Measurements", plans: [] },
      prelim_design: { label: "Prelim Design Mark Up", plans: [] },
      cable_schedule: { label: "Cable Schedule Markup", plans: [] },
      final_account: { label: "Final Account Markup", plans: [] },
    };

    floorPlans.forEach(plan => {
      if (purposes[plan.design_purpose]) {
        purposes[plan.design_purpose].plans.push(plan);
      }
    });

    // Filter out empty categories
    return Object.entries(purposes).reduce((acc, [key, value]) => {
      if (value.plans.length > 0) {
        acc[key] = value;
      }
      return acc;
    }, {} as GroupedPlans);
  }, [floorPlans]);

  const renderFloorPlanCard = (plan: any) => (
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
            <PDFThumbnail url={plan.pdf_url} className="aspect-video" />
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
  );

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
        <div className="space-y-6">
          {Object.entries(groupedFloorPlans).map(([purposeKey, purposeData]) => (
            <Collapsible key={purposeKey} defaultOpen>
              <div className="flex items-center justify-between mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 hover:bg-transparent">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      {purposeData.label}
                      <span className="text-muted-foreground text-lg">({purposeData.plans.length})</span>
                      <ChevronDown className="h-5 w-5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </h2>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {purposeData.plans.map((plan) => renderFloorPlanCard(plan))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      <CreateFloorPlanDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(floorPlanId) => {
          queryClient.invalidateQueries({ queryKey: ["floor-plans", projectId] });
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
