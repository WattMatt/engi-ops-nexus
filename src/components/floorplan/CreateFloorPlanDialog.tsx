import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateFloorPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (floorPlanId: string) => void;
}

export const CreateFloorPlanDialog = ({ open, onOpenChange, onSuccess }: CreateFloorPlanDialogProps) => {
  const [name, setName] = useState("");
  const [designPurpose, setDesignPurpose] = useState<string>("general");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a floor plan name");
      return;
    }

    if (!pdfFile) {
      toast.error("Please select a PDF file");
      return;
    }

    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      toast.error("No project selected");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setUploading(true);

    try {
      // Upload PDF to storage
      const fileExt = pdfFile.name.split(".").pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("floor-plans")
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("floor-plans")
        .getPublicUrl(fileName);

      // Create floor plan record
      const { data: floorPlan, error: insertError } = await supabase
        .from("floor_plans")
        .insert([{
          project_id: projectId,
          name: name.trim(),
          pdf_url: publicUrl,
          design_purpose: designPurpose as any,
          created_by: user.id,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Floor plan created successfully");
      setName("");
      setPdfFile(null);
      setDesignPurpose("general");
      onSuccess(floorPlan.id);
    } catch (error: any) {
      console.error("Error creating floor plan:", error);
      toast.error(error.message || "Failed to create floor plan");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Floor Plan</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Floor Plan Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ground Floor, Level 1"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="design-purpose">Design Purpose</Label>
            <Select value={designPurpose} onValueChange={setDesignPurpose} disabled={uploading}>
              <SelectTrigger id="design-purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="solar_pv">Solar PV</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf-file">PDF File</Label>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {pdfFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {pdfFile.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Floor Plan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
