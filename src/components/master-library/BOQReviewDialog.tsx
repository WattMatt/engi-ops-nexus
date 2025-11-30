import { useState, useMemo } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, XCircle, Plus, AlertCircle, ChevronDown, ChevronRight, FileText, Tag, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  supply_cost: number | null;
  install_cost: number | null;
  prime_cost: number | null;
  profit_percentage: number | null;
  suggested_category_name: string | null;
  suggested_category_id: string | null;
  matched_material_id: string | null;
  match_confidence: number | null;
  review_status: string;
  added_to_master: boolean;
  bill_number: number | null;
  bill_name: string | null;
  section_code: string | null;
  section_name: string | null;
  is_rate_only: boolean;
}

interface MasterMaterial {
  id: string;
  material_code: string;
  material_name: string;
  standard_supply_cost: number | null;
  standard_install_cost: number | null;
}

interface MaterialCategory {
  id: string;
  category_code: string;
  category_name: string;
  parent_category_id: string | null;
}

interface BOQReviewDialogProps {
  upload: BOQUpload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Group items by Bill -> Section
interface GroupedItems {
  [billKey: string]: {
    billNumber: number | null;
    billName: string;
    sections: {
      [sectionKey: string]: {
        sectionCode: string | null;
        sectionName: string;
        items: ExtractedItem[];
      };
    };
  };
}

export const BOQReviewDialog = ({ upload, open, onOpenChange }: BOQReviewDialogProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set(["bill-1", "bill-null"]));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["boq-extracted-items", upload?.id],
    queryFn: async () => {
      if (!upload) return [];
      const { data, error } = await supabase
        .from("boq_extracted_items")
        .select("*")
        .eq("upload_id", upload.id)
        .order("bill_number")
        .order("section_code")
        .order("row_number");
      if (error) throw error;
      return data as ExtractedItem[];
    },
    enabled: !!upload,
  });

  // Fetch master materials for cross-checking
  const { data: masterMaterials } = useQuery({
    queryKey: ["master-materials-for-check"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_materials")
        .select("id, material_code, material_name, standard_supply_cost, standard_install_cost")
        .eq("is_active", true);
      if (error) throw error;
      return data as MasterMaterial[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["material-categories-hierarchical"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("id, category_code, category_name, parent_category_id")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as MaterialCategory[];
    },
  });

  // Group categories by parent for display
  const groupedCategories = useMemo(() => {
    if (!categories) return [];
    const parents = categories.filter(c => !c.parent_category_id);
    return parents.map(parent => ({
      ...parent,
      children: categories.filter(c => c.parent_category_id === parent.id)
    }));
  }, [categories]);

  const setItemCategory = (itemId: string, categoryId: string) => {
    setItemCategories(prev => ({ ...prev, [itemId]: categoryId }));
  };

  // Group items by bill and section
  const groupedItems = useMemo(() => {
    if (!items) return {} as GroupedItems;
    
    const grouped: GroupedItems = {};
    
    items.forEach((item) => {
      const billKey = `bill-${item.bill_number ?? "null"}`;
      const sectionKey = `section-${item.section_code ?? "general"}`;
      
      if (!grouped[billKey]) {
        grouped[billKey] = {
          billNumber: item.bill_number,
          billName: item.bill_name || `Bill ${item.bill_number || "General"}`,
          sections: {},
        };
      }
      
      if (!grouped[billKey].sections[sectionKey]) {
        grouped[billKey].sections[sectionKey] = {
          sectionCode: item.section_code,
          sectionName: item.section_name || item.section_code || "General Items",
          items: [],
        };
      }
      
      grouped[billKey].sections[sectionKey].items.push(item);
    });
    
    return grouped;
  }, [items]);

  // Cross-check function to compare rates
  const getRateComparison = (item: ExtractedItem) => {
    if (!masterMaterials || !item.total_rate) return null;
    
    // Try to find a matching material by name similarity
    const matchedMaterial = masterMaterials.find(
      (m) => m.id === item.matched_material_id ||
        m.material_name.toLowerCase().includes(item.item_description.toLowerCase().slice(0, 20)) ||
        item.item_description.toLowerCase().includes(m.material_name.toLowerCase().slice(0, 20))
    );
    
    if (!matchedMaterial) return { status: "new" as const, diff: 0 };
    
    const masterRate = (matchedMaterial.standard_supply_cost || 0) + (matchedMaterial.standard_install_cost || 0);
    if (masterRate === 0) return { status: "new" as const, diff: 0 };
    
    const diff = ((item.total_rate - masterRate) / masterRate) * 100;
    
    if (Math.abs(diff) <= 10) return { status: "verified" as const, diff, masterRate };
    if (diff > 10) return { status: "higher" as const, diff, masterRate };
    return { status: "lower" as const, diff, masterRate };
  };

  const addToMasterMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const itemsToAdd = items?.filter((i) => itemIds.includes(i.id) && !i.added_to_master) || [];
      
      // Check if all items have categories assigned
      const itemsWithoutCategory = itemsToAdd.filter(item => 
        !itemCategories[item.id] && !item.suggested_category_id
      );
      
      if (itemsWithoutCategory.length > 0) {
        throw new Error(`Please assign categories to all selected items (${itemsWithoutCategory.length} items need categories)`);
      }
      
      for (const item of itemsToAdd) {
        // Use manually selected category first, then suggested, then fallback
        const selectedCategoryId = itemCategories[item.id];
        const category = categories?.find(
          (c) =>
            c.id === selectedCategoryId ||
            c.id === item.suggested_category_id ||
            c.category_code === item.suggested_category_name ||
            c.category_name.toLowerCase().includes((item.suggested_category_name || "").toLowerCase())
        );

        const code = item.item_code || `BOQ-${Date.now()}-${item.row_number}`;

        const { data: material, error: materialError } = await supabase
          .from("master_materials")
          .insert({
            material_code: code,
            material_name: item.item_description,
            category_id: category?.id || categories?.[0]?.id,
            standard_supply_cost: item.supply_rate || item.supply_cost || (item.total_rate ? item.total_rate * 0.7 : 0),
            standard_install_cost: item.install_rate || item.install_cost || (item.total_rate ? item.total_rate * 0.3 : 0),
            unit: item.unit || "each",
          })
          .select()
          .single();

        if (materialError) {
          console.error("Error adding material:", materialError);
          continue;
        }

        await supabase
          .from("boq_extracted_items")
          .update({
            added_to_master: true,
            added_material_id: material.id,
            review_status: "approved",
            suggested_category_id: category?.id,
          })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-extracted-items"] });
      queryClient.invalidateQueries({ queryKey: ["master-materials"] });
      toast.success("Items added to master library");
      setSelectedItems(new Set());
      setItemCategories({});
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

  const toggleBill = (billKey: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billKey)) {
      newExpanded.delete(billKey);
    } else {
      newExpanded.add(billKey);
    }
    setExpandedBills(newExpanded);
  };

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const getStatusBadge = (item: ExtractedItem) => {
    if (item.added_to_master) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Added
        </Badge>
      );
    }
    if (item.review_status === "approved") {
      return <Badge variant="outline">Approved</Badge>;
    }
    if (item.review_status === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getComparisonBadge = (item: ExtractedItem) => {
    const comparison = getRateComparison(item);
    if (!comparison) return null;
    
    switch (comparison.status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "higher":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <TrendingUp className="h-3 w-3 mr-1" />
            +{comparison.diff.toFixed(0)}%
          </Badge>
        );
      case "lower":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <TrendingDown className="h-3 w-3 mr-1" />
            {comparison.diff.toFixed(0)}%
          </Badge>
        );
      case "new":
        return (
          <Badge variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            New
          </Badge>
        );
    }
  };

  const pendingItems = items?.filter((i) => i.review_status === "pending") || [];
  const selectedArray = Array.from(selectedItems);
  const billKeys = Object.keys(groupedItems);

  // Statistics
  const stats = useMemo(() => {
    if (!items) return { verified: 0, review: 0, newItems: 0, rateOnly: 0 };
    
    let verified = 0, review = 0, newItems = 0, rateOnly = 0;
    
    items.forEach((item) => {
      if (item.is_rate_only) rateOnly++;
      const comparison = getRateComparison(item);
      if (comparison?.status === "verified") verified++;
      else if (comparison?.status === "higher" || comparison?.status === "lower") review++;
      else if (comparison?.status === "new") newItems++;
    });
    
    return { verified, review, newItems, rateOnly };
  }, [items, masterMaterials]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Extracted Items</DialogTitle>
          <DialogDescription>
            {upload?.file_name} - {items?.length || 0} items extracted
          </DialogDescription>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="flex flex-wrap gap-2 py-2 border-b">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            {stats.verified} Verified
          </Badge>
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            {stats.review} Need Review
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Plus className="h-3 w-3" />
            {stats.newItems} New Items
          </Badge>
          {stats.rateOnly > 0 && (
            <Badge variant="outline" className="gap-1">
              <Tag className="h-3 w-3 text-purple-600" />
              {stats.rateOnly} Rate Only
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 py-2 border-b">
          <Checkbox
            checked={selectedItems.size === items?.length && items?.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-muted-foreground mr-2">Select All</span>
          
          <Button
            size="sm"
            disabled={selectedItems.size === 0}
            onClick={() => addToMasterMutation.mutate(selectedArray)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Library ({selectedItems.size})
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
          ) : billKeys.length > 1 ? (
            // Grouped View (Bill -> Section -> Items)
            <div className="space-y-2">
              {billKeys.map((billKey) => {
                const bill = groupedItems[billKey];
                const sectionKeys = Object.keys(bill.sections);
                const isBillExpanded = expandedBills.has(billKey);
                const billItemCount = sectionKeys.reduce(
                  (acc, sk) => acc + bill.sections[sk].items.length,
                  0
                );

                return (
                  <Collapsible key={billKey} open={isBillExpanded} onOpenChange={() => toggleBill(billKey)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        {isBillExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{bill.billName}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {billItemCount} items
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pt-2 space-y-2">
                      {sectionKeys.map((sectionKey) => {
                        const section = bill.sections[sectionKey];
                        const fullSectionKey = `${billKey}-${sectionKey}`;
                        const isSectionExpanded = expandedSections.has(fullSectionKey);

                        return (
                          <Collapsible
                            key={fullSectionKey}
                            open={isSectionExpanded}
                            onOpenChange={() => toggleSection(fullSectionKey)}
                          >
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors">
                                {isSectionExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <span className="text-sm font-medium">
                                  {section.sectionCode && `${section.sectionCode} - `}
                                  {section.sectionName}
                                </span>
                                <Badge variant="outline" className="ml-auto text-xs">
                                  {section.items.length}
                                </Badge>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <ItemsTable
                                items={section.items}
                                selectedItems={selectedItems}
                                toggleItem={toggleItem}
                                getStatusBadge={getStatusBadge}
                                getComparisonBadge={getComparisonBadge}
                                groupedCategories={groupedCategories}
                                itemCategories={itemCategories}
                                setItemCategory={setItemCategory}
                              />
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            // Flat View (when no bill structure)
            <ItemsTable
              items={items || []}
              selectedItems={selectedItems}
              toggleItem={toggleItem}
              getStatusBadge={getStatusBadge}
              getComparisonBadge={getComparisonBadge}
              groupedCategories={groupedCategories}
              itemCategories={itemCategories}
              setItemCategory={setItemCategory}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Extracted table component for reuse
interface GroupedCategory {
  id: string;
  category_code: string;
  category_name: string;
  children: MaterialCategory[];
}

interface ItemsTableProps {
  items: ExtractedItem[];
  selectedItems: Set<string>;
  toggleItem: (id: string) => void;
  getStatusBadge: (item: ExtractedItem) => React.ReactNode;
  getComparisonBadge: (item: ExtractedItem) => React.ReactNode;
  groupedCategories: GroupedCategory[];
  itemCategories: Record<string, string>;
  setItemCategory: (itemId: string, categoryId: string) => void;
}

const ItemsTable = ({ 
  items, 
  selectedItems, 
  toggleItem, 
  getStatusBadge, 
  getComparisonBadge,
  groupedCategories,
  itemCategories,
  setItemCategory 
}: ItemsTableProps) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-10"></TableHead>
        <TableHead className="w-16">Code</TableHead>
        <TableHead>Description</TableHead>
        <TableHead className="w-[180px]">Category</TableHead>
        <TableHead className="text-right">Qty</TableHead>
        <TableHead className="text-right">Supply</TableHead>
        <TableHead className="text-right">Install</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead className="text-center">Cross-Check</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow
          key={item.id}
          className={
            item.added_to_master
              ? "bg-green-50 dark:bg-green-900/20"
              : item.is_rate_only
              ? "bg-purple-50 dark:bg-purple-900/20"
              : ""
          }
        >
          <TableCell>
            <Checkbox
              checked={selectedItems.has(item.id)}
              onCheckedChange={() => toggleItem(item.id)}
              disabled={item.added_to_master}
            />
          </TableCell>
          <TableCell className="text-xs text-muted-foreground font-mono">
            {item.item_code || item.row_number}
          </TableCell>
          <TableCell>
            <div className="max-w-[250px]">
              <div className="font-medium text-sm truncate">{item.item_description}</div>
              {item.is_rate_only && (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs mt-1">
                  Rate Only
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            {item.added_to_master ? (
              <Badge variant="outline" className="text-xs">
                {item.suggested_category_name || "Assigned"}
              </Badge>
            ) : (
              <Select
                value={itemCategories[item.id] || item.suggested_category_id || ""}
                onValueChange={(value) => setItemCategory(item.id, value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {groupedCategories.map((parent) => (
                    <div key={parent.id}>
                      <SelectItem value={parent.id} className="font-semibold">
                        {parent.category_code} - {parent.category_name}
                      </SelectItem>
                      {parent.children.map((child) => (
                        <SelectItem key={child.id} value={child.id} className="pl-6">
                          {child.category_code} - {child.category_name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            )}
          </TableCell>
          <TableCell className="text-right text-sm">
            {item.is_rate_only ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <>
                {item.quantity} {item.unit}
              </>
            )}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {item.supply_rate || item.supply_cost
              ? formatCurrency(item.supply_rate || item.supply_cost || 0)
              : "—"}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">
            {item.install_rate || item.install_cost
              ? formatCurrency(item.install_rate || item.install_cost || 0)
              : "—"}
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-medium">
            {(() => {
              const supply = item.supply_rate || item.supply_cost || 0;
              const install = item.install_rate || item.install_cost || 0;
              const calculatedTotal = supply + install;
              return calculatedTotal > 0 ? formatCurrency(calculatedTotal) : "—";
            })()}
            {item.profit_percentage && (
              <div className="text-xs text-muted-foreground">
                +{item.profit_percentage}% profit
              </div>
            )}
          </TableCell>
          <TableCell className="text-center">{getComparisonBadge(item)}</TableCell>
          <TableCell>{getStatusBadge(item)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);