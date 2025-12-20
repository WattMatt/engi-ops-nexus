import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Store, ChevronDown, ChevronRight, Trash2, Pencil } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { SpreadsheetItemsTable } from "./SpreadsheetItemsTable";

interface LineShopsManagerProps {
  sectionId: string;
  billId: string;
  accountId: string;
}

interface ShopSubsection {
  id: string;
  shop_name: string;
  shop_number: string;
  section_id: string;
  contract_total: number;
  final_total: number;
  variation_total: number;
  display_order: number;
}

export function LineShopsManager({ sectionId, billId, accountId }: LineShopsManagerProps) {
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopSubsection | null>(null);
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());
  const [shopFormData, setShopFormData] = useState({ shop_name: "", shop_number: "" });
  const queryClient = useQueryClient();

  // Fetch shop subsections for this Line Shops section using raw query
  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["line-shop-subsections", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_shop_subsections" as any)
        .select("*")
        .eq("section_id", sectionId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ShopSubsection[];
    },
  });

  const createShopMutation = useMutation({
    mutationFn: async (data: { shop_name: string; shop_number: string }) => {
      const displayOrder = shops.length + 1;
      const { error } = await supabase
        .from("final_account_shop_subsections" as any)
        .insert({
          section_id: sectionId,
          shop_name: data.shop_name,
          shop_number: data.shop_number,
          display_order: displayOrder,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-shop-subsections", sectionId] });
      toast.success("Shop added");
      setAddShopOpen(false);
      setShopFormData({ shop_name: "", shop_number: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add shop");
    },
  });

  const updateShopMutation = useMutation({
    mutationFn: async (data: { id: string; shop_name: string; shop_number: string }) => {
      const { error } = await supabase
        .from("final_account_shop_subsections" as any)
        .update({ shop_name: data.shop_name, shop_number: data.shop_number })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-shop-subsections", sectionId] });
      toast.success("Shop updated");
      setAddShopOpen(false);
      setEditingShop(null);
      setShopFormData({ shop_name: "", shop_number: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update shop");
    },
  });

  const deleteShopMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from("final_account_shop_subsections" as any)
        .delete()
        .eq("id", shopId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-shop-subsections", sectionId] });
      toast.success("Shop deleted");
    },
    onError: () => {
      toast.error("Failed to delete shop");
    },
  });

  const toggleShop = (shopId: string) => {
    const newExpanded = new Set(expandedShops);
    if (newExpanded.has(shopId)) {
      newExpanded.delete(shopId);
    } else {
      newExpanded.add(shopId);
    }
    setExpandedShops(newExpanded);
  };

  const handleOpenAddShop = () => {
    setEditingShop(null);
    setShopFormData({ shop_name: "", shop_number: "" });
    setAddShopOpen(true);
  };

  const handleEditShop = (shop: ShopSubsection) => {
    setEditingShop(shop);
    setShopFormData({ shop_name: shop.shop_name, shop_number: shop.shop_number });
    setAddShopOpen(true);
  };

  const handleSubmitShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShop) {
      updateShopMutation.mutate({
        id: editingShop.id,
        shop_name: shopFormData.shop_name,
        shop_number: shopFormData.shop_number,
      });
    } else {
      createShopMutation.mutate(shopFormData);
    }
  };

  // Calculate totals across all shops
  const totals = shops.reduce(
    (acc, shop) => ({
      contract: acc.contract + Number(shop.contract_total || 0),
      final: acc.final + Number(shop.final_total || 0),
      variation: acc.variation + Number(shop.variation_total || 0),
    }),
    { contract: 0, final: 0, variation: 0 }
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-4">Loading shops...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="bg-muted/30">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="h-4 w-4" />
              Line Shops Summary ({shops.length} shops)
            </CardTitle>
            <Button onClick={handleOpenAddShop} size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" />
              Add Shop
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Contract Total</p>
              <p className="font-semibold">{formatCurrency(totals.contract)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Final Total</p>
              <p className="font-semibold">{formatCurrency(totals.final)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variation</p>
              <p className={`font-semibold ${totals.variation >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totals.variation)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shops List */}
      {shops.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg border-dashed">
          <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No shops added yet.</p>
          <p className="text-xs mt-1">Add individual shops to break down Line Shop costs.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shops.map((shop) => (
            <Collapsible
              key={shop.id}
              open={expandedShops.has(shop.id)}
              onOpenChange={() => toggleShop(shop.id)}
            >
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-3 bg-muted/20">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                    {expandedShops.has(shop.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {shop.shop_number} - {shop.shop_name}
                    </span>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-4 text-xs">
                      <span>
                        <span className="text-muted-foreground mr-1">Contract:</span>
                        <span className="font-medium">{formatCurrency(shop.contract_total)}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground mr-1">Final:</span>
                        <span className="font-medium">{formatCurrency(shop.final_total)}</span>
                      </span>
                      <span className={Number(shop.variation_total) >= 0 ? "text-green-600" : "text-red-600"}>
                        <span className="text-muted-foreground mr-1">Var:</span>
                        <span className="font-medium">{formatCurrency(shop.variation_total)}</span>
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditShop(shop);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this shop and all its items?")) {
                            deleteShopMutation.mutate(shop.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="p-3 border-t">
                    <SpreadsheetItemsTable
                      sectionId={sectionId}
                      billId={billId}
                      accountId={accountId}
                      shopSubsectionId={shop.id}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Add/Edit Shop Dialog */}
      <Dialog open={addShopOpen} onOpenChange={setAddShopOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingShop ? "Edit" : "Add"} Shop</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitShop} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop_number">Shop Number *</Label>
              <Input
                id="shop_number"
                value={shopFormData.shop_number}
                onChange={(e) => setShopFormData({ ...shopFormData, shop_number: e.target.value })}
                placeholder="e.g., L01, L02"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop_name">Shop Name *</Label>
              <Input
                id="shop_name"
                value={shopFormData.shop_name}
                onChange={(e) => setShopFormData({ ...shopFormData, shop_name: e.target.value })}
                placeholder="e.g., BOXER, TRUWORTHS"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddShopOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingShop ? "Update" : "Add"} Shop
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
