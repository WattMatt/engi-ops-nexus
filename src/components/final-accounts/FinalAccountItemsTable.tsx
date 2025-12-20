import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddItemDialog } from "./AddItemDialog";
import { formatCurrency } from "@/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface FinalAccountItemsTableProps {
  sectionId: string;
  billId: string;
  accountId: string;
  shopSubsectionId?: string;
}

export function FinalAccountItemsTable({ sectionId, billId, accountId, shopSubsectionId }: FinalAccountItemsTableProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["final-account-items", sectionId, shopSubsectionId],
    queryFn: async () => {
      let query = supabase
        .from("final_account_items")
        .select("*")
        .eq("section_id", sectionId)
        .order("display_order", { ascending: true });
      
      // Filter by shop subsection if provided
      if (shopSubsectionId) {
        query = query.eq("shop_subsection_id", shopSubsectionId);
      } else {
        query = query.is("shop_subsection_id", null);
      }
      
      const { data, error } = await query;
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
      queryClient.invalidateQueries({ queryKey: ["final-account-items", sectionId] });
      recalculateSectionTotals();
      toast.success("Item deleted");
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  const recalculateSectionTotals = async () => {
    const { data: allItems } = await supabase
      .from("final_account_items")
      .select("contract_amount, final_amount, variation_amount")
      .eq("section_id", sectionId);

    if (allItems) {
      const totals = allItems.reduce(
        (acc, item) => ({
          contract: acc.contract + Number(item.contract_amount || 0),
          final: acc.final + Number(item.final_amount || 0),
          variation: acc.variation + Number(item.variation_amount || 0),
        }),
        { contract: 0, final: 0, variation: 0 }
      );

      await supabase
        .from("final_account_sections")
        .update({
          contract_total: totals.contract,
          final_total: totals.final,
          variation_total: totals.variation,
        })
        .eq("id", sectionId);

      queryClient.invalidateQueries({ queryKey: ["final-account-sections", billId] });
      queryClient.invalidateQueries({ queryKey: ["final-account-bills", accountId] });
    }
  };

  if (isLoading) {
    return <div className="text-center py-2 text-muted-foreground text-xs">Loading items...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button onClick={() => setAddDialogOpen(true)} size="sm" variant="outline">
          <Plus className="h-3 w-3 mr-1" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No items yet. Add line items to this section.
        </p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs w-[80px]">Item Code</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs w-[60px]">Unit</TableHead>
                <TableHead className="text-xs w-[70px] text-right">Contract Qty</TableHead>
                <TableHead className="text-xs w-[70px] text-right">Final Qty</TableHead>
                <TableHead className="text-xs w-[80px] text-right">Supply Rate</TableHead>
                <TableHead className="text-xs w-[80px] text-right">Install Rate</TableHead>
                <TableHead className="text-xs w-[90px] text-right">Contract Amt</TableHead>
                <TableHead className="text-xs w-[90px] text-right">Final Amt</TableHead>
                <TableHead className="text-xs w-[80px] text-right">Variation</TableHead>
                <TableHead className="text-xs w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="text-xs">
                  <TableCell className="font-mono">
                    {item.item_code}
                    {item.is_rate_only && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1">
                        Rate Only
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={item.description}>
                    {item.description}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">{item.contract_quantity || "-"}</TableCell>
                  <TableCell className="text-right">{item.final_quantity || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.supply_rate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.install_rate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.contract_amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.final_amount)}</TableCell>
                  <TableCell className={`text-right font-medium ${Number(item.variation_amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(item.variation_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingItem(item);
                          setAddDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          if (confirm('Delete this item?')) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        sectionId={sectionId}
        billId={billId}
        accountId={accountId}
        shopSubsectionId={shopSubsectionId}
        editingItem={editingItem}
        onSuccess={() => {
          setAddDialogOpen(false);
          setEditingItem(null);
          recalculateSectionTotals();
        }}
      />
    </div>
  );
}
