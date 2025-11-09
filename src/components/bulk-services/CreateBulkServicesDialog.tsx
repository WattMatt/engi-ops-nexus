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

      // Create default sections with SANS 204 compliant content
      const defaultSections = [
        { 
          section_number: "1", 
          section_title: "Introduction", 
          sort_order: 1,
          content: `The following report has been put together based on the instruction as received from the client.\n\nThe information for this report has been based on the areas as derived from the leasing layout as received from the architect.`
        },
        { 
          section_number: "2", 
          section_title: "Load Clarification", 
          sort_order: 2,
          content: `Being a ${projectData?.load_category || 'commercial'} development, the electrical load sizing will be done in accordance with SANS 204 which deals with energy efficiency in buildings.\n\n## SANS 204 Classification\n\nFor this portion the following has been derived from the SANS regulation Table 1:\n\n| Classification | Description | Max Demand (VA/m²) |\n|---|---|---|\n| F1 | Large shop | 90 |\n| G1 | Offices | 80 |\n| A1 | Entertainment/Assembly | 85 |\n\n## Climatic Zones of South Africa\n\n| Zone | Description | Major Centre |\n|---|---|---|\n| 1 | Cold interior | Johannesburg, Bloemfontein |\n| 2 | Hot interior | Makhado, Nelspruit |\n| 3 | Temperate coastal | Cape Town, Port Elizabeth |\n| 4 | Sub-tropical coastal | East London, Durban |\n| 5 | Arid interior | Upington, Kimberley |\n\nThe total proposed area will have a floor area of [AREA]m² of ${projectData?.load_category || 'retail'}. Based on the required allowances from SANS 204, an applied load of [VA/m²] has been applied.\n\nOn this basis, a total connected nominated maximum demand of ${projectData?.connection_size || '[SIZE]'} would be required for this development.`
        },
        { 
          section_number: "3", 
          section_title: "Connection Classification", 
          sort_order: 3,
          content: `The supply authority in the region is ${projectData?.supply_authority || '[SUPPLY AUTHORITY]'}.\n\nThe primary supply voltage in the area is ${projectData?.primary_voltage || '[VOLTAGE]'} and the bulk connection will be taken at the same. This will be done by means of the placement of a ${projectData?.primary_voltage === '11kV' ? 'Metering type Ring Main Unit' : 'suitable metering equipment'} on the Erf boundary.`
        },
        { 
          section_number: "4", 
          section_title: "Bulk Connection Point", 
          sort_order: 4,
          content: `Placement of the connection equipment to be as per electrical layout drawing.\n\nArea required for the placement of the council equipment is 3m x 6m, accessible from the road side.\n\nThe equipment shall be installed at the property boundary in accordance with the supply authority's requirements.`
        },
        { 
          section_number: "5", 
          section_title: "Distribution Strategy", 
          sort_order: 5,
          content: `## Primary Distribution\n\nThe bulk supply at ${projectData?.primary_voltage || '[VOLTAGE]'} will be stepped down to 400V via miniature substations strategically placed throughout the development.\n\n## Secondary Distribution\n\nFrom the miniature substations, distribution will be via:\n- Main distribution boards\n- Sub-distribution boards\n- Final distribution to tenant DBs\n\n## Diversity Factor\n\nA diversity factor of ${projectData?.diversity_factor || '0.75'} has been applied in accordance with ${projectData?.electrical_standard || 'SANS 10142-1'}.`
        },
        { 
          section_number: "6", 
          section_title: "Protection & Earthing", 
          sort_order: 6,
          content: `## Protection Philosophy\n\nProtection and discrimination to be in accordance with ${projectData?.electrical_standard || 'SANS 10142-1'}.\n\n${projectData?.protection_philosophy || 'Protection devices shall be coordinated to ensure selectivity and minimize nuisance tripping.'}\n\n## Earthing System\n\nEarthing to be done in accordance with SANS 10142-1. A TN-S earthing system shall be implemented with separate earth bars in all distribution boards.`
        },
        { 
          section_number: "7", 
          section_title: "Metering Requirements", 
          sort_order: 7,
          content: `## Bulk Metering\n\nBulk metering will be installed by ${projectData?.supply_authority || 'the supply authority'} at the point of supply.\n\n## Sub-Metering\n\n${projectData?.metering_requirements || 'Sub-metering to be provided for individual tenants and common areas to facilitate accurate cost recovery and monitoring.'}\n\n## Tariff Structure\n\nThe development will be billed under the ${projectData?.tariff_structure || '[TARIFF STRUCTURE]'} tariff structure.`
        },
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
