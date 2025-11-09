import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreateBulkServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentCreated: () => void;
}

export const CreateBulkServicesDialog = ({
  open,
  onOpenChange,
  onDocumentCreated,
}: CreateBulkServicesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");

  const selectedProjectId = localStorage.getItem("selectedProjectId");

  const { data: projectData } = useQuery({
    queryKey: ["project-baseline", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", selectedProjectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId && open,
  });

  const handleCreate = async () => {
    if (!selectedProjectId || !documentNumber.trim()) {
      toast.error("Please enter a document number");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the document with auto-populated baseline data
      const { data: document, error: docError } = await supabase
        .from("bulk_services_documents")
        .insert({
          project_id: selectedProjectId,
          document_number: documentNumber,
          created_by: user.id,
          primary_voltage: projectData?.primary_voltage,
          connection_size: projectData?.connection_size,
          supply_authority: projectData?.supply_authority,
          electrical_standard: projectData?.electrical_standard,
          diversity_factor: projectData?.diversity_factor,
          load_category: projectData?.load_category,
          tariff_structure: projectData?.tariff_structure,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create default sections
      const defaultSections = [
        { section_number: "1", section_title: "Supply Capacity", sort_order: 1 },
        { section_number: "2", section_title: "Distribution Strategy", sort_order: 2 },
        { section_number: "3", section_title: "Load Calculations", sort_order: 3 },
        { section_number: "4", section_title: "Protection & Earthing", sort_order: 4 },
        { section_number: "5", section_title: "Cable Sizing", sort_order: 5 },
        { section_number: "6", section_title: "Future Expansion", sort_order: 6 },
      ];

      const { error: sectionsError } = await supabase
        .from("bulk_services_sections")
        .insert(
          defaultSections.map((section) => ({
            document_id: document.id,
            ...section,
          }))
        );

      if (sectionsError) throw sectionsError;

      toast.success("Bulk services document created successfully");
      setDocumentNumber("");
      onDocumentCreated();
    } catch (error: any) {
      console.error("Error creating document:", error);
      toast.error(error.message || "Failed to create document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Bulk Services Document</DialogTitle>
          <DialogDescription>
            Create a new bulk electrical services document. Baseline data will be auto-populated from project settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document_number">Document Number</Label>
            <Input
              id="document_number"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="BS-001"
              disabled={loading}
            />
          </div>

          {projectData && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <p className="text-sm font-medium">Auto-populated baseline data:</p>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div>Supply: {projectData.primary_voltage || "Not set"}</div>
                <div>Capacity: {projectData.connection_size || "Not set"}</div>
                <div>Authority: {projectData.supply_authority || "Not set"}</div>
                <div>Standard: {projectData.electrical_standard || "SANS 10142-1"}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Document"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
