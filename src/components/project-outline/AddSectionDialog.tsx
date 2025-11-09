import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlineId: string;
  nextSectionNumber: number;
  nextSortOrder: number;
}

interface FormData {
  section_title: string;
  content: string;
}

export const AddSectionDialog = ({
  open,
  onOpenChange,
  outlineId,
  nextSectionNumber,
  nextSortOrder,
}: AddSectionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("project_outline_sections")
        .insert({
          outline_id: outlineId,
          section_number: nextSectionNumber,
          section_title: data.section_title,
          content: data.content || "",
          sort_order: nextSortOrder,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section added successfully",
      });

      reset();
      onOpenChange(false);
      window.location.reload(); // Refresh to show new section
    } catch (error) {
      console.error("Error adding section:", error);
      toast({
        title: "Error",
        description: "Failed to add section",
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
          <DialogTitle>Add New Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="section_title">Section Title *</Label>
            <Input
              id="section_title"
              {...register("section_title", { required: true })}
              placeholder="e.g., Fire Detection Systems"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This will be section {nextSectionNumber}
            </p>
          </div>

          <div>
            <Label htmlFor="content">Initial Content (Optional)</Label>
            <Textarea
              id="content"
              {...register("content")}
              placeholder="Enter section content..."
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Section
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
