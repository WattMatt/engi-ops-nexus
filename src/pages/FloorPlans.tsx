import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { CreateFloorPlanDialog } from "@/components/floorplan/CreateFloorPlanDialog";
import { format } from "date-fns";

const FloorPlans = () => {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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

  const handleFloorPlanClick = (floorPlanId: string) => {
    navigate(`/dashboard/floor-plans/${floorPlanId}`);
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
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleFloorPlanClick(plan.id)}
            >
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
    </div>
  );
};

export default FloorPlans;
