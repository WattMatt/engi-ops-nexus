import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FloorPlanApp from "@/components/floor-plan/App";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: floorPlanRecord, isLoading } = useQuery({
    queryKey: ['tenant-floor-plan', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_floor_plans')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Preview Mode - Show composite image
  if (!isEditMode && floorPlanRecord?.composite_image_url) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Floor Plan Masking</h3>
          <Button onClick={() => setIsEditMode(true)} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Floor Plan
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-full">
            <img 
              src={floorPlanRecord.composite_image_url} 
              alt="Masked Floor Plan"
              className="w-full h-auto shadow-lg"
            />
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode - Use existing floor plan app
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b gap-2">
        <h3 className="text-lg font-semibold">Floor Plan Masking - Edit Mode</h3>
        {floorPlanRecord?.composite_image_url && (
          <Button onClick={() => setIsEditMode(false)} variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview Saved
          </Button>
        )}
      </div>
      <div className="flex-1">
        <FloorPlanApp user={null} />
      </div>
    </div>
  );
};
