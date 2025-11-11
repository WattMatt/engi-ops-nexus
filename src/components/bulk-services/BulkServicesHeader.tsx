import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkServicesHeaderProps {
  document: any;
}

export const BulkServicesHeader = ({ document }: BulkServicesHeaderProps) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    document_number: document.document_number || "",
    primary_voltage: document.primary_voltage || "",
    connection_size: document.connection_size || "",
    supply_authority: document.supply_authority || "",
    electrical_standard: document.electrical_standard || "",
    diversity_factor: document.diversity_factor?.toString() || "",
    total_connected_load: document.total_connected_load?.toString() || "",
    maximum_demand: document.maximum_demand?.toString() || "",
    future_expansion_factor: document.future_expansion_factor?.toString() || "1.20",
    project_area: document.project_area?.toString() || "",
    va_per_sqm: document.va_per_sqm?.toString() || "",
    climatic_zone: document.climatic_zone || "",
    prepared_by: document.prepared_by || "",
    prepared_by_contact: document.prepared_by_contact || "",
    client_name: document.client_name || "",
    architect: document.architect || "",
    building_calculation_type: document.building_calculation_type || "sans_204",
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("bulk_services_documents")
        .update({
          document_number: formData.document_number,
          primary_voltage: formData.primary_voltage || null,
          connection_size: formData.connection_size || null,
          supply_authority: formData.supply_authority || null,
          electrical_standard: formData.electrical_standard || null,
          diversity_factor: formData.diversity_factor ? parseFloat(formData.diversity_factor) : null,
          total_connected_load: formData.total_connected_load ? parseFloat(formData.total_connected_load) : null,
          maximum_demand: formData.maximum_demand ? parseFloat(formData.maximum_demand) : null,
          future_expansion_factor: formData.future_expansion_factor ? parseFloat(formData.future_expansion_factor) : 1.20,
          project_area: formData.project_area ? parseFloat(formData.project_area) : null,
          va_per_sqm: formData.va_per_sqm ? parseFloat(formData.va_per_sqm) : null,
          climatic_zone: formData.climatic_zone || null,
          prepared_by: formData.prepared_by || null,
          prepared_by_contact: formData.prepared_by_contact || null,
          client_name: formData.client_name || null,
          architect: formData.architect || null,
          building_calculation_type: formData.building_calculation_type,
        })
        .eq("id", document.id);

      if (error) throw error;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["bulk-services-document", document.id] });
      
      toast.success("Document updated successfully");
      setEditing(false);
    } catch (error: any) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document");
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Document Number</p>
            <p className="font-medium">{document.document_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{new Date(document.document_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Calculation Method</p>
            <p className="font-medium">
              {document.building_calculation_type === 'sans_204' && 'SANS 204 - Commercial/Retail'}
              {document.building_calculation_type === 'sans_10142' && 'SANS 10142-1 - General Buildings'}
              {document.building_calculation_type === 'residential' && 'Residential ADMD Method'}
              {!document.building_calculation_type && 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-medium">{document.client_name || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Architect</p>
            <p className="font-medium">{document.architect || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Prepared By</p>
            <p className="font-medium">{document.prepared_by || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Contact Person</p>
            <p className="font-medium">{document.prepared_by_contact || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project Area</p>
            <p className="font-medium">{document.project_area ? `${document.project_area} m²` : "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Load (VA/m²)</p>
            <p className="font-medium">{document.va_per_sqm ? `${document.va_per_sqm} VA/m²` : "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Climatic Zone</p>
            <p className="font-medium">{document.climatic_zone || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Primary Voltage</p>
            <p className="font-medium">{document.primary_voltage || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Connection Size</p>
            <p className="font-medium">{document.connection_size || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Supply Authority</p>
            <p className="font-medium">{document.supply_authority || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Electrical Standard</p>
            <p className="font-medium">{document.electrical_standard || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Diversity Factor</p>
            <p className="font-medium">{document.diversity_factor || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Connected Load</p>
            <p className="font-medium">{document.total_connected_load ? `${(document.total_connected_load / 1000).toLocaleString()} kVA` : "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Maximum Demand</p>
            <p className="font-medium">{document.maximum_demand ? `${document.maximum_demand} kVA` : "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Future Expansion Factor</p>
            <p className="font-medium">{document.future_expansion_factor || "1.20"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Document Number</Label>
          <Input
            value={formData.document_number}
            onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Client Name</Label>
          <Input
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            placeholder="Client name"
          />
        </div>
        <div className="space-y-2">
          <Label>Architect</Label>
          <Input
            value={formData.architect}
            onChange={(e) => setFormData({ ...formData, architect: e.target.value })}
            placeholder="Architect firm"
          />
        </div>
        <div className="space-y-2">
          <Label>Prepared By (Consultant)</Label>
          <Input
            value={formData.prepared_by}
            onChange={(e) => setFormData({ ...formData, prepared_by: e.target.value })}
            placeholder="Watson Mattheus Consulting"
          />
        </div>
        <div className="space-y-2">
          <Label>Contact Person</Label>
          <Input
            value={formData.prepared_by_contact}
            onChange={(e) => setFormData({ ...formData, prepared_by_contact: e.target.value })}
            placeholder="Mr. Contact Name"
          />
        </div>
        <div className="space-y-2">
          <Label>Project Area (m²)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.project_area}
            onChange={(e) => setFormData({ ...formData, project_area: e.target.value })}
            placeholder="23814"
          />
        </div>
        <div className="space-y-2">
          <Label>Load (VA/m²) - SANS 204</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.va_per_sqm}
            onChange={(e) => setFormData({ ...formData, va_per_sqm: e.target.value })}
            placeholder="85 or 90"
          />
        </div>
        <div className="space-y-2">
          <Label>Climatic Zone (1-5)</Label>
          <Input
            value={formData.climatic_zone}
            onChange={(e) => setFormData({ ...formData, climatic_zone: e.target.value })}
            placeholder="1 (Cold interior)"
          />
        </div>
        <div className="space-y-2">
          <Label>Primary Voltage</Label>
          <Input
            value={formData.primary_voltage}
            onChange={(e) => setFormData({ ...formData, primary_voltage: e.target.value })}
            placeholder="11kV"
          />
        </div>
        <div className="space-y-2">
          <Label>Connection Size</Label>
          <Input
            value={formData.connection_size}
            onChange={(e) => setFormData({ ...formData, connection_size: e.target.value })}
            placeholder="2500kVA"
          />
        </div>
        <div className="space-y-2">
          <Label>Supply Authority</Label>
          <Input
            value={formData.supply_authority}
            onChange={(e) => setFormData({ ...formData, supply_authority: e.target.value })}
            placeholder="Eskom / Tshwane / City Power"
          />
        </div>
        <div className="space-y-2">
          <Label>Electrical Standard</Label>
          <Input
            value={formData.electrical_standard}
            onChange={(e) => setFormData({ ...formData, electrical_standard: e.target.value })}
            placeholder="SANS 10142-1"
          />
        </div>
        <div className="space-y-2">
          <Label>Diversity Factor</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.diversity_factor}
            onChange={(e) => setFormData({ ...formData, diversity_factor: e.target.value })}
            placeholder="0.75"
          />
        </div>
        <div className="space-y-2">
          <Label>Total Connected Load (kVA)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.total_connected_load}
            onChange={(e) => setFormData({ ...formData, total_connected_load: e.target.value })}
            placeholder="2000"
          />
        </div>
        <div className="space-y-2">
          <Label>Maximum Demand (kVA)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.maximum_demand}
            onChange={(e) => setFormData({ ...formData, maximum_demand: e.target.value })}
            placeholder="1500"
          />
        </div>
        <div className="space-y-2">
          <Label>Future Expansion Factor</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.future_expansion_factor}
            onChange={(e) => setFormData({ ...formData, future_expansion_factor: e.target.value })}
            placeholder="1.20"
          />
        </div>
        <div className="space-y-2">
          <Label>Calculation Method</Label>
          <Select
            value={formData.building_calculation_type}
            onValueChange={(value) => setFormData({ ...formData, building_calculation_type: value })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select calculation method" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="sans_204">SANS 204 - Commercial/Retail</SelectItem>
              <SelectItem value="sans_10142">SANS 10142-1 - General Buildings</SelectItem>
              <SelectItem value="residential">Residential ADMD Method</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
