import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { EditLineItemDialog } from "./EditLineItemDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LineItemRowProps {
  item: any;
  onUpdate: () => void;
  isEven?: boolean;
}

export const LineItemRow = ({ item, onUpdate, isEven }: LineItemRowProps) => {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const varianceCurrent = Number(item.anticipated_final) - Number(item.previous_report);
  const varianceOriginal = Number(item.anticipated_final) - Number(item.original_budget);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("cost_line_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line item deleted successfully",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className={`grid grid-cols-14 gap-2 text-sm py-2 px-4 border-b ${isEven ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors group`}>
        <div className="col-span-1 font-medium pl-4">{item.code}</div>
        <div className="col-span-3">{item.description}</div>
        <div className="col-span-2 text-right">
          R{Number(item.original_budget).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
        </div>
        <div className="col-span-2 text-right">
          R{Number(item.previous_report).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
        </div>
        <div className="col-span-2 text-right font-medium">
          R{Number(item.anticipated_final).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
        </div>
        <div className="col-span-2 text-right">
          {varianceCurrent < 0 ? "-" : "+"}R
          {Math.abs(varianceCurrent).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
        </div>
        <div className="col-span-2 text-right flex items-center justify-end gap-1">
          <span>
            {varianceOriginal < 0 ? "-" : "+"}R
            {Math.abs(varianceOriginal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditDialogOpen(true)}
              className="h-6 w-6 p-0"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-6 w-6 p-0 hover:bg-destructive/20"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <EditLineItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lineItem={item}
        onSuccess={() => {
          onUpdate();
          setEditDialogOpen(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete line item "{item.code} - {item.description}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
