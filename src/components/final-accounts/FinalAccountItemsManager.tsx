import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddFinalAccountItemDialog } from "./AddFinalAccountItemDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FinalAccountItemsManagerProps {
  accountId: string;
}

export function FinalAccountItemsManager({ accountId }: FinalAccountItemsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["final-account-items", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_items")
        .select("*")
        .eq("final_account_id", accountId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("final_account_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items", accountId] });
      toast.success("Item deleted");
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Line Items</CardTitle>
        <Button onClick={() => setAddDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Contract Qty</TableHead>
              <TableHead>Final Qty</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Contract Amt</TableHead>
              <TableHead>Final Amt</TableHead>
              <TableHead>Variation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item_number}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{item.contract_quantity}</TableCell>
                <TableCell>{item.final_quantity}</TableCell>
                <TableCell>${item.rate?.toLocaleString()}</TableCell>
                <TableCell>${item.contract_amount?.toLocaleString()}</TableCell>
                <TableCell>${item.final_amount?.toLocaleString()}</TableCell>
                <TableCell className={item.variation_amount && item.variation_amount > 0 ? "text-green-500" : "text-red-500"}>
                  ${item.variation_amount?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingItem(item);
                      setAddDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No line items yet. Click "Add Item" to get started.
          </div>
        )}

        <AddFinalAccountItemDialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
          accountId={accountId}
          editingItem={editingItem}
          onSuccess={() => {
            setAddDialogOpen(false);
            setEditingItem(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
