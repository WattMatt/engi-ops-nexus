import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, XCircle, Plus, AlertCircle } from "lucide-react";

interface BOQUpload {
  id: string;
  file_name: string;
  total_items_extracted: number;
}

interface ExtractedItem {
  id: string;
  row_number: number;
  item_code: string | null;
  item_description: string;
  quantity: number | null;
  unit: string | null;
  supply_rate: number | null;
  install_rate: number | null;
  total_rate: number | null;
  suggested_category_name: string | null;
  matched_material_id: string | null;
  match_confidence: number | null;
  review_status: string;
  added_to_master: boolean;
}

interface BOQReviewDialogProps {
  upload: BOQUpload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BOQReviewDialog = ({ upload, open, onOpenChange }: BOQReviewDialogProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["boq-extracted-items", upload?.id],
    queryFn: async () => {
      if (!upload) return [];
      const { data, error } = await supabase
        .from("boq_extracted_items")
        .select("*")
        .eq("upload_id", upload.id)
        .order("row_number");
      if (error) throw error;
      return data as ExtractedItem[];
    },
    enabled: !!upload,
  });

  const { data: categories } = useQuery({
    queryKey: ["material-categories-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("id, category_code, category_name")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const addToMasterMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const itemsToAdd = items?.filter((i) => itemIds.includes(i.id) && !i.added_to_master) || [];
      
      for (const item of itemsToAdd) {
        // Find category
        const category = categories?.find(
          (c) =>
            c.category_code === item.suggested_category_name ||
            c.category_name.toLowerCase().includes((item.suggested_category_name || "").toLowerCase())
        );

        // Generate material code
        const code = item.item_code || `BOQ-${Date.now()}-${item.row_number}`;

        // Insert into master materials
        const { data: material, error: materialError } = await supabase
          .from("master_materials")
          .insert({
            material_code: code,
            material_name: item.item_description,
            category_id: category?.id || categories?.[0]?.id,
            standard_supply_cost: item.supply_rate || (item.total_rate ? item.total_rate * 0.7 : 0),
            standard_install_cost: item.install_rate || (item.total_rate ? item.total_rate * 0.3 : 0),
            unit: item.unit || "each",
          })
          .select()
          .single();

        if (materialError) {
          console.error("Error adding material:", materialError);
          continue;
        }

        // Update extracted item
        await supabase
          .from("boq_extracted_items")
          .update({
            added_to_master: true,
            added_material_id: material.id,
            review_status: "approved",
          })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-extracted-items"] });
      queryClient.invalidateQueries({ queryKey: ["master-materials"] });
      toast.success("Items added to master library");
      setSelectedItems(new Set());
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add items");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("boq_extracted_items")
        .update({ review_status: status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-extracted-items"] });
      toast.success("Items updated");
      setSelectedItems(new Set());
    },
  });

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === items?.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items?.map((i) => i.id) || []));
    }
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return <Badge variant="outline">Unknown</Badge>;
    if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (confidence >= 0.5) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  const pendingItems = items?.filter((i) => i.review_status === "pending") || [];
  const selectedArray = Array.from(selectedItems);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Extracted Items</DialogTitle>
          <DialogDescription>
            {upload?.file_name} - {items?.length || 0} items extracted
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2 border-b">
          <Button
            size="sm"
            disabled={selectedItems.size === 0}
            onClick={() => addToMasterMutation.mutate(selectedArray)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Selected to Library ({selectedItems.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selectedItems.size === 0}
            onClick={() => updateStatusMutation.mutate({ ids: selectedArray, status: "approved" })}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selectedItems.size === 0}
            onClick={() => updateStatusMutation.mutate({ ids: selectedArray, status: "rejected" })}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            {pendingItems.length} pending review
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              No items extracted. The file may not contain parseable data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedItems.size === items?.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Supply</TableHead>
                  <TableHead className="text-right">Install</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow
                    key={item.id}
                    className={item.added_to_master ? "bg-green-50 dark:bg-green-900/20" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                        disabled={item.added_to_master}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.row_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium max-w-[300px] truncate">
                          {item.item_description}
                        </div>
                        {item.item_code && (
                          <div className="text-xs text-muted-foreground">{item.item_code}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.suggested_category_name ? (
                        <Badge variant="outline">{item.suggested_category_name}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.supply_rate ? formatCurrency(item.supply_rate) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.install_rate
                        ? formatCurrency(item.install_rate)
                        : item.total_rate
                        ? formatCurrency(item.total_rate)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {getConfidenceBadge(item.match_confidence)}
                    </TableCell>
                    <TableCell>
                      {item.added_to_master ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      ) : item.review_status === "approved" ? (
                        <Badge variant="outline">Approved</Badge>
                      ) : item.review_status === "rejected" ? (
                        <Badge variant="destructive">Rejected</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
