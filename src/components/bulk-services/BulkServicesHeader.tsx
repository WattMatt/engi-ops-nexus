import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkServicesHeaderProps {
  document: any;
}

export const BulkServicesHeader = ({ document }: BulkServicesHeaderProps) => {
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
        })
        .eq("id", document.id);

      if (error) throw error;

      toast.success("Document updated successfully");
      setEditing(false);
      window.location.reload();
    } catch (error: any) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document");
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
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
            <p className="font-medium">{document.total_connected_load ? `${document.total_connected_load} kVA` : "Not set"}</p>
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
            placeholder="Eskom"
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
            placeholder="1000"
          />
        </div>
        <div className="space-y-2">
          <Label>Maximum Demand (kVA)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.maximum_demand}
            onChange={(e) => setFormData({ ...formData, maximum_demand: e.target.value })}
            placeholder="750"
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
      </div>
    </div>
  );
};
