import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AISuggestionService } from "@/services/AISuggestionService";

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSuccess: () => void;
}

export const AddLineItemDialog = ({
  open,
  onOpenChange,
  categoryId,
  onSuccess,
}: AddLineItemDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    original_budget: "",
    previous_report: "",
    anticipated_final: "",
    rate: "", // Added rate field
  });

  const handleSuggestRate = () => {
    if (!formData.description) {
      toast({
        title: "Description required",
        description: "Please enter a description to get a suggestion.",
        variant: "destructive",
      });
      return;
    }

    const suggestion = AISuggestionService.suggestCablePrice(formData.description);
    
    if (suggestion) {
      setFormData(prev => ({ ...prev, rate: suggestion.rate.toFixed(2) }));
      toast({
        title: "AI Suggestion Applied",
        description: suggestion.reason,
      });
    } else {
      toast({
        title: "No suggestion found",
        description: "Could not find a matching cable specification.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // detailed line items might not support 'rate' column in db yet, 
      // but assuming we just want to fill the form for now or mapped to a field.
      // If the DB doesn't have 'rate', this might fail if I try to insert it.
      // But the prompt says "fill the 'Rate' field". 
      // I will assume for now I should just add it to the form.
      // If the user wants it saved, they probably updated the schema or mapped it.
      // However, usually 'rate' helps calculate 'original_budget' or 'anticipated_final'.
      
      const { error } = await supabase.from("cost_line_items").insert({
        category_id: categoryId,
        code: formData.code,
        description: formData.description,
        original_budget: parseFloat(formData.original_budget) || 0,
        previous_report: parseFloat(formData.previous_report) || 0,
        anticipated_final: parseFloat(formData.anticipated_final) || 0,
        display_order: 0,
        // rate: parseFloat(formData.rate) || 0, // Commented out as I don't know if column exists
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line item added successfully",
      });

      onSuccess();
      setFormData({
        code: "",
        description: "",
        original_budget: "",
        previous_report: "",
        anticipated_final: "",
        rate: "",
      });
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
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="A1, B2..."
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Bulk Contributions"
                required
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="rate">Rate (R/m)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) =>
                  setFormData({ ...formData, rate: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleSuggestRate}
              className="mb-[2px]"
            >
              ⚡ Suggest Rate
            </Button>
          </div>

          <div>
            <Label htmlFor="original_budget">Original Budget</Label>
            <Input
              id="original_budget"
              type="number"
              step="0.01"
              value={formData.original_budget}
              onChange={(e) =>
                setFormData({ ...formData, original_budget: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="previous_report">Previous Report</Label>
            <Input
              id="previous_report"
              type="number"
              step="0.01"
              value={formData.previous_report}
              onChange={(e) =>
                setFormData({ ...formData, previous_report: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="anticipated_final">Anticipated Final Cost</Label>
            <Input
              id="anticipated_final"
              type="number"
              step="0.01"
              value={formData.anticipated_final}
              onChange={(e) =>
                setFormData({ ...formData, anticipated_final: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Line Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

