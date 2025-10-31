import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing floor plan from database
  useEffect(() => {
    loadFloorPlan();
  }, [projectId]);

  const loadFloorPlan = async () => {
    setIsLoading(true);
    try {
      const { data: floorPlan, error } = await supabase
        .from('project_floor_plans')
        .select('composite_image_url')
        .eq('project_id', projectId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (floorPlan?.composite_image_url) {
        setFloorPlanUrl(floorPlan.composite_image_url);
      }
    } catch (error: any) {
      console.error('Error loading floor plan:', error);
      toast.error('Failed to load floor plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or PDF file');
      return;
    }

    try {
      setIsLoading(true);
      
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${projectId}/marked-floor-plan.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(filePath);

      // Save to database
      const { error: upsertError } = await supabase
        .from('project_floor_plans')
        .upsert({
          project_id: projectId,
          composite_image_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id'
        });

      if (upsertError) throw upsertError;
      
      setFloorPlanUrl(publicUrl);
      toast.success("Marked floor plan uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload floor plan");
    } finally {
      setIsLoading(false);
    }

    e.target.value = '';
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete the floor plan?')) return;

    try {
      setIsLoading(true);
      
      // Delete from database
      const { error } = await supabase
        .from('project_floor_plans')
        .update({ composite_image_url: null })
        .eq('project_id', projectId);

      if (error) throw error;
      
      setFloorPlanUrl(null);
      toast.success("Floor plan deleted");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete floor plan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (floorPlanUrl) {
      window.open(floorPlanUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading floor plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <Button onClick={() => fileInputRef.current?.click()} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {floorPlanUrl ? 'Replace' : 'Upload'} Marked Floor Plan
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        {floorPlanUrl && (
          <>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleDelete} variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Upload a pre-marked floor plan showing tenant areas, DB locations, and measurements.
        Accepted formats: PDF, PNG, JPG
      </div>

      {floorPlanUrl ? (
        <div className="border rounded-lg overflow-hidden bg-gray-100">
          {floorPlanUrl.endsWith('.pdf') ? (
            <iframe
              src={floorPlanUrl}
              className="w-full"
              style={{ height: '800px' }}
              title="Floor Plan PDF"
            />
          ) : (
            <img
              src={floorPlanUrl}
              alt="Marked Floor Plan"
              className="w-full h-auto"
            />
          )}
        </div>
      ) : (
        <div className="border rounded-lg bg-gray-50 p-12 text-center">
          <p className="text-muted-foreground mb-4">No floor plan uploaded yet</p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Marked Floor Plan
          </Button>
        </div>
      )}
    </div>
  );
};
