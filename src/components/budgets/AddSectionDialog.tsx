import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  onSuccess: () => void;
}

export const AddSectionDialog = ({
  open,
  onOpenChange,
  budgetId,
  onSuccess,
}: AddSectionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    section_code: "",
    section_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("budget_sections").insert({
        budget_id: budgetId,
        section_code: formData.section_code,
        section_name: formData.section_name,
        display_order: 0,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section added successfully",
      });

      onSuccess();
      setFormData({ section_code: "", section_name: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Budget Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="section_code">Section Code *</Label>
            <Input
              id="section_code"
              value={formData.section_code}
              onChange={(e) =>
                setFormData({ ...formData, section_code: e.target.value })
              }
              placeholder="A, B, C..."
              required
            />
          </div>

          <div>
            <Label htmlFor="section_name">Section Name *</Label>
            <Input
              id="section_name"
              value={formData.section_name}
              onChange={(e) =>
                setFormData({ ...formData, section_name: e.target.value })
              }
              placeholder="MEDIUM VOLTAGE"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Section"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
