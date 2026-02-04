import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Package, 
  Clock, 
  AlertCircle,
  Search,
  Calendar,
  Save,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContractorProcurementStatusProps {
  projectId: string;
  contractorName?: string;
  contractorEmail?: string;
  companyName?: string | null;
}

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  category: string | null;
  priority: string | null;
  location_group: string | null;
  instruction_date: string | null;
  order_date: string | null;
  expected_delivery: string | null;
}

interface ItemDateUpdates {
  [itemId: string]: {
    order_date: string;
    expected_delivery: string;
  };
}

async function fetchInstructedItems(projectId: string): Promise<ProcurementItem[]> {
  const { data, error } = await supabase
    .from('project_procurement_items')
    .select('id, name, description, status, category, priority, location_group, instruction_date, order_date, expected_delivery')
    .eq('project_id', projectId)
    .eq('status', 'instructed')
    .order('instruction_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export function ContractorProcurementStatus({ 
  projectId,
  contractorName = 'Contractor',
}: ContractorProcurementStatusProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateUpdates, setDateUpdates] = useState<ItemDateUpdates>({});

  const { data: instructedItems, isLoading } = useQuery({
    queryKey: ['contractor-procurement-instructed', projectId],
    queryFn: () => fetchInstructedItems(projectId)
  });

  const updateMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const updates = dateUpdates[itemId];
      if (!updates) return;

      // Determine new status - if order_date is set, mark as ordered
      const newStatus = updates.order_date ? 'ordered' : 'instructed';

      const { error } = await supabase
        .from('project_procurement_items')
        .update({
          order_date: updates.order_date || null,
          expected_delivery: updates.expected_delivery || null,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      return itemId;
    },
    onSuccess: (itemId) => {
      queryClient.invalidateQueries({ queryKey: ['contractor-procurement-instructed', projectId] });
      // Clear the saved updates for this item
      if (itemId) {
        setDateUpdates(prev => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }
      toast.success("Dates saved successfully");
    },
    onError: () => {
      toast.error("Failed to save dates");
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Filter items by search
  const filteredItems = instructedItems?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }) || [];

  // Group by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ProcurementItem[]>);

  const handleDateChange = (itemId: string, field: 'order_date' | 'expected_delivery', value: string) => {
    setDateUpdates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        order_date: prev[itemId]?.order_date || '',
        expected_delivery: prev[itemId]?.expected_delivery || '',
        [field]: value
      }
    }));
  };

  const getItemDates = (item: ProcurementItem) => {
    const updates = dateUpdates[item.id];
    return {
      order_date: updates?.order_date ?? item.order_date ?? '',
      expected_delivery: updates?.expected_delivery ?? item.expected_delivery ?? ''
    };
  };

  const hasChanges = (itemId: string) => {
    return !!dateUpdates[itemId];
  };

  const priorityColors: Record<string, string> = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    normal: 'border-l-transparent',
    low: 'border-l-slate-300',
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Instructed Items
          </CardTitle>
          <CardDescription>
            Items that have been instructed and require ordering. Enter order date and expected delivery dates below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-3 w-3 mr-1" />
                {instructedItems?.length || 0} items awaiting order
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items List */}
      <Card>
        <CardContent className="p-0 divide-y">
          {Object.entries(itemsByCategory).length > 0 ? (
            Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-muted/50">
                  <h3 className="text-sm font-medium">{category} ({items.length})</h3>
                </div>
                <div className="divide-y">
                  {items.map((item) => {
                    const dates = getItemDates(item);
                    const priorityBorder = priorityColors[item.priority || 'normal'];
                    const itemHasChanges = hasChanges(item.id);
                    
                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-4 border-l-4 space-y-4",
                          priorityBorder
                        )}
                      >
                        {/* Item Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.name}</p>
                              {item.priority === 'critical' && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                              {item.priority === 'high' && (
                                <Badge className="bg-orange-500 text-xs">High</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                            {item.instruction_date && (
                              <p className="text-xs text-muted-foreground">
                                Instructed: {new Date(item.instruction_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Date Form Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                          <div className="space-y-1.5">
                            <Label htmlFor={`order-date-${item.id}`} className="text-xs flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Order Date
                            </Label>
                            <Input
                              id={`order-date-${item.id}`}
                              type="date"
                              value={dates.order_date}
                              onChange={(e) => handleDateChange(item.id, 'order_date', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`expected-${item.id}`} className="text-xs flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Expected Delivery
                            </Label>
                            <Input
                              id={`expected-${item.id}`}
                              type="date"
                              value={dates.expected_delivery}
                              onChange={(e) => handleDateChange(item.id, 'expected_delivery', e.target.value)}
                              className="h-9"
                            />
                          </div>
                        </div>

                        {/* Save Button */}
                        {itemHasChanges && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => updateMutation.mutate(item.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Save Dates
                            </Button>
                          </div>
                        )}

                        {/* Success indicator when order date is set */}
                        {dates.order_date && !itemHasChanges && (
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Order date recorded - will be moved to Ordered status</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No instructed items found</p>
              {searchQuery && (
                <p className="text-sm mt-1">Try adjusting your search</p>
              )}
              {!searchQuery && (
                <p className="text-sm mt-1">All items have been ordered or delivered</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
