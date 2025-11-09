import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X } from "lucide-react";

interface ProjectOutlineHeaderProps {
  outline: any;
}

export const ProjectOutlineHeader = ({ outline }: ProjectOutlineHeaderProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(outline);

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("project_outlines")
        .update(formData)
        .eq("id", outline.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project details updated successfully",
      });
      setEditing(false);
    } catch (error) {
      console.error("Error updating outline:", error);
      toast({
        title: "Error",
        description: "Failed to update project details",
        variant: "destructive",
      });
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
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-muted-foreground">Project Name</p>
            <p>{outline.project_name}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Revision</p>
            <p>{outline.revision}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Date</p>
            <p>{new Date(outline.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Prepared By</p>
            <p>{outline.prepared_by || "-"}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Address</p>
            <p>{[outline.address_line1, outline.address_line2, outline.address_line3].filter(Boolean).join(", ") || "-"}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Telephone</p>
            <p>{outline.telephone || "-"}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">Contact Person</p>
            <p>{outline.contact_person || "-"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => { setEditing(false); setFormData(outline); }}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Project Name</Label>
          <Input
            value={formData.project_name}
            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Revision</Label>
          <Input
            value={formData.revision}
            onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
          />
        </div>
        <div>
          <Label>Prepared By</Label>
          <Input
            value={formData.prepared_by || ""}
            onChange={(e) => setFormData({ ...formData, prepared_by: e.target.value })}
          />
        </div>
        <div>
          <Label>Telephone</Label>
          <Input
            value={formData.telephone || ""}
            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
          />
        </div>
        <div>
          <Label>Address Line 1</Label>
          <Input
            value={formData.address_line1 || ""}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          />
        </div>
        <div>
          <Label>Address Line 2</Label>
          <Input
            value={formData.address_line2 || ""}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
          />
        </div>
        <div>
          <Label>Address Line 3</Label>
          <Input
            value={formData.address_line3 || ""}
            onChange={(e) => setFormData({ ...formData, address_line3: e.target.value })}
          />
        </div>
        <div>
          <Label>Contact Person</Label>
          <Input
            value={formData.contact_person || ""}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};
