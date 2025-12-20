import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Link, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { BOQWizardState } from "../BOQProcessingWizard";

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
  matched_material_id: string | null;
  match_confidence: number | null;
  review_status: string;
  added_to_master: boolean;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
}

interface MaterialCategory {
  id: string;
  category_code: string;
  category_name: string;
}

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

export function BOQWizardStep5Review({ state, updateState }: Props) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const queryClient = useQueryClient();

  // Fetch extracted items
  const { data: items, isLoading } = useQuery({
    queryKey: ["boq-extracted-items", state.uploadId],
    queryFn: async () => {
      if (!state.uploadId) return [];
      const { data, error } = await supabase
        .from("boq_extracted_items")
        .select("*")
        .eq("upload_id", state.uploadId)
        .order("row_number");
      if (error) throw error;
      return data as ExtractedItem[];
    },
    enabled: !!state.uploadId,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["material-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("id, category_code, category_name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as MaterialCategory[];
    },
  });

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    switch (filter) {
      case 'matched':
        return items.filter(i => i.matched_material_id && (i.match_confidence || 0) >= 0.6);
      case 'unmatched':
        return items.filter(i => !i.matched_material_id || (i.match_confidence || 0) < 0.6);
      default:
        return items;
    }
  }, [items, filter]);

  // Stats
  const stats = useMemo(() => {
    if (!items) return { total: 0, matched: 0, unmatched: 0, approved: 0 };
    const matched = items.filter(i => i.matched_material_id && (i.match_confidence || 0) >= 0.6).length;
    const approved = items.filter(i => i.review_status === 'approved' || i.added_to_master).length;
    return {
      total: items.length,
      matched,
      unmatched: items.length - matched,
      approved,
    };
  }, [items]);

  // Add to master mutation
  const addToMasterMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const itemsToAdd = items?.filter(i => itemIds.includes(i.id) && !i.added_to_master) || [];
      
      for (const item of itemsToAdd) {
        const categoryId = itemCategories[item.id] || item.suggested_category_id || categories?.[0]?.id;
        const code = item.item_code || `BOQ-${Date.now()}-${item.row_number}`;

        const { data: material, error: materialError } = await supabase
          .from("master_materials")
          .insert({
            material_code: code,
            material_name: item.item_description,
            category_id: categoryId,
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
      toast.error(error.message);
    },
  });

  // Approve all matched items
  const approveAllMatched = async () => {
    const matchedIds = items
      ?.filter(i => i.matched_material_id && (i.match_confidence || 0) >= 0.6 && i.review_status !== 'approved')
      .map(i => i.id) || [];
    
    if (matchedIds.length === 0) {
      toast.info("No items to approve");
      return;
    }

    const { error } = await supabase
      .from("boq_extracted_items")
      .update({ review_status: "approved" })
      .in("id", matchedIds);

    if (error) {
      toast.error("Failed to approve items");
    } else {
      queryClient.invalidateQueries({ queryKey: ["boq-extracted-items"] });
      toast.success(`Approved ${matchedIds.length} matched items`);
    }
  };

  // Mark complete
  const markComplete = async () => {
    if (!state.uploadId) return;

    await supabase
      .from("boq_uploads")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString() })
      .eq("id", state.uploadId);

    updateState({ reviewComplete: true });
    queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
    toast.success("Review complete!");
  };

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;
    if (confidence >= 0.8) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30">High</Badge>;
    }
    if (confidence >= 0.6) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30">Medium</Badge>;
    }
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="gap-1">
          Total: {stats.total}
        </Badge>
        <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30">
          <Link className="h-3 w-3" />
          {stats.matched} Matched
        </Badge>
        <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30">
          <Plus className="h-3 w-3" />
          {stats.unmatched} Unmatched
        </Badge>
        <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30">
          <CheckCircle className="h-3 w-3" />
          {stats.approved} Approved
        </Badge>
        
        <div className="ml-auto flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="matched">Matched Only</SelectItem>
              <SelectItem value="unmatched">Unmatched Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={approveAllMatched}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve All Matched
        </Button>
        <Button
          size="sm"
          disabled={selectedItems.size === 0 || addToMasterMutation.isPending}
          onClick={() => addToMasterMutation.mutate(Array.from(selectedItems))}
        >
          {addToMasterMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add Selected to Master ({selectedItems.size})
        </Button>
        <div className="flex-1" />
        <Button 
          variant="default"
          onClick={markComplete}
          disabled={state.reviewComplete}
        >
          {state.reviewComplete ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </>
          ) : (
            <>
              <ClipboardCheck className="h-4 w-4 mr-1" />
              Mark Review Complete
            </>
          )}
        </Button>
      </div>

      {/* Items table */}
      <Card>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>No items found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead className="min-w-[300px]">Description</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-24">Rate</TableHead>
                  <TableHead className="w-28">Match</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const isMatched = item.matched_material_id && (item.match_confidence || 0) >= 0.6;
                  
                  return (
                    <TableRow key={item.id} className={item.added_to_master ? "bg-green-50/50 dark:bg-green-900/10" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          disabled={item.added_to_master}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.row_number}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <p className="truncate font-medium text-sm" title={item.item_description}>
                            {item.item_description}
                          </p>
                          {item.item_code && (
                            <p className="text-xs text-muted-foreground">{item.item_code}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{item.unit || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.total_rate ? formatCurrency(item.total_rate) : "-"}
                      </TableCell>
                      <TableCell>
                        {isMatched ? (
                          <div className="flex items-center gap-1">
                            <Link className="h-3 w-3 text-green-600" />
                            {getConfidenceBadge(item.match_confidence)}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            New
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isMatched && !item.added_to_master ? (
                          <Select
                            value={itemCategories[item.id] || item.suggested_category_id || ""}
                            onValueChange={(v) => setItemCategories(prev => ({ ...prev, [item.id]: v }))}
                          >
                            <SelectTrigger className="h-7 text-xs w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map(cat => (
                                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                  {cat.category_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {item.suggested_category_name || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.added_to_master ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        ) : item.review_status === "approved" ? (
                          <Badge variant="outline" className="text-xs">Approved</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
