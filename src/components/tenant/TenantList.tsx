import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Circle, Calculator, AlertTriangle, Clock, CalendarDays, Search, Filter, Link2, FolderSymlink } from "lucide-react";
import { TenantDialog } from "./TenantDialog";
import { DeleteTenantDialog } from "./DeleteTenantDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { differenceInDays, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { useTenantPresence } from "@/hooks/useTenantPresence";
import { useHandoverLinkStatus } from "@/hooks/useHandoverLinkStatus";
import { User, ArrowRight } from "lucide-react";
 import { calculateOrderDeadlines } from "@/utils/dateCalculations";
 import { format } from "date-fns";
interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size_allowance: string | null;
  db_size_scope_of_work: string | null;
  shop_category: string;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_order_date: string | null;
  db_cost: number | null;
  db_by_tenant: boolean;
  lighting_ordered: boolean;
  lighting_order_date: string | null;
  lighting_cost: number | null;
  lighting_by_tenant: boolean;
  cost_reported: boolean;
  opening_date: string | null;
  beneficial_occupation_days: number | null;
  exclude_from_totals?: boolean;
   db_last_order_date?: string | null;
   db_delivery_date?: string | null;
   lighting_last_order_date?: string | null;
   lighting_delivery_date?: string | null;
}
interface TenantListProps {
  tenants: Tenant[];
  projectId: string;
  onUpdate: () => void;
}
export const TenantList = ({
  tenants,
  projectId,
  onUpdate
}: TenantListProps) => {
  const [localTenants, setLocalTenants] = useState(tenants);
  const [isCalculating, setIsCalculating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [bulkOpeningDateDialog, setBulkOpeningDateDialog] = useState(false);
  const [bulkOpeningDate, setBulkOpeningDate] = useState("");
  
  // Filter and grouping state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [groupBy, setGroupBy] = useState<"none" | "category" | "bo-period">("none");
  
  // Presence tracking
  const { getEditingUser, setEditing } = useTenantPresence(projectId);
  
  // Handover link status
  const { data: handoverLinkStatus } = useHandoverLinkStatus(projectId);

  // Sync local state when tenants prop changes
  useEffect(() => {
    setLocalTenants(tenants);
  }, [tenants]);
  
  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return;
    
    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantToDelete.id);
      
      if (error) throw error;
      toast.success("Tenant deleted successfully");
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
      onUpdate();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete tenant");
    }
  };
  // Mutation for optimistic updates
  const updateMutation = useMutation({
    mutationFn: async ({ tenantId, field, value }: { tenantId: string; field: string; value: any }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update({ [field]: value })
        .eq("id", tenantId)
        .select()
        .single();
      
      if (error) {
        console.error("Mutation error:", error);
        throw error;
      }
      return data;
    },
    onMutate: async ({ tenantId, field, value }) => {
      // Optimistically update local state
      setLocalTenants(prev => 
        prev.map(t => t.id === tenantId ? { ...t, [field]: value } : t)
      );
    },
    onSuccess: (data) => {
      // Optimistic update already applied - no need to refresh
      // The realtime subscription will sync any external changes
    },
    onError: (error: any, variables) => {
      // Rollback on error by reverting optimistic update
      console.error("Failed to update tenant:", error);
      toast.error(`Failed to update: ${error.message || 'Unknown error'}`);
      setLocalTenants(tenants); // Revert to original data
    }
  });

  const handleFieldUpdate = (tenantId: string, field: string, value: any) => {
    console.log("Updating tenant:", { tenantId, field, value });
    updateMutation.mutate({ tenantId, field, value });
  };

  const handleBooleanToggle = (tenantId: string, field: string, currentValue: boolean) => {
    handleFieldUpdate(tenantId, field, !currentValue);
  };
  const handleBulkAutoCalc = async () => {
    if (!confirm("This will recalculate DB sizes for all standard category tenants with areas. Continue?")) return;
    setIsCalculating(true);
    try {
      // Fetch sizing rules for standard category only
      const {
        data: rules,
        error: rulesError
      } = await supabase.from("db_sizing_rules")
        .select("*")
        .eq("project_id", projectId)
        .eq("category", "standard")
        .order("min_area", {
          ascending: true
        });
        
      if (rulesError) throw rulesError;
      if (!rules || rules.length === 0) {
        toast.error("No DB sizing rules configured for standard category");
        return;
      }

      // Get all standard tenants with areas
      const eligibleTenants = tenants.filter(t => 
        t.shop_category === 'standard' && t.area != null
      );
      
      let updated = 0;
      let skipped = 0;
      
      for (const tenant of eligibleTenants) {
        // Find matching rule for tenant's area
        const rule = rules.find(r => 
          tenant.area! >= r.min_area && 
          tenant.area! < r.max_area + 1
        );
        
        if (rule) {
          // Use scope of work if available, otherwise use allowance
          const dbSize = rule.db_size_scope_of_work || rule.db_size_allowance;
          const {
            error
          } = await supabase.from("tenants").update({
            db_size_allowance: dbSize
          }).eq("id", tenant.id);
          if (!error) {
            updated++;
          }
        } else {
          skipped++;
        }
      }
      
      toast.success(`Updated ${updated} tenant(s). Skipped ${skipped} (no matching rule).`);
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to bulk calculate: " + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleBulkSetOpeningDate = async () => {
    if (!bulkOpeningDate) {
      toast.error("Please select an opening date");
      return;
    }

    try {
       // Calculate deadline dates for all tenants
       // First, fetch all tenants to get their beneficial_occupation_days
       const { data: allTenants, error: fetchError } = await supabase
        .from("tenants")
         .select("id, beneficial_occupation_days")
        .eq("project_id", projectId);
 
       if (fetchError) throw fetchError;
 
       // Update each tenant with calculated deadline dates
       const updatePromises = (allTenants || []).map(async (tenant) => {
         const openingDate = new Date(bulkOpeningDate);
         const beneficialDays = tenant.beneficial_occupation_days || 90;
         const boDate = addDays(openingDate, -beneficialDays);
         
         const deadlines = calculateOrderDeadlines(boDate);
         
         return supabase
           .from("tenants")
           .update({
             opening_date: bulkOpeningDate,
             db_last_order_date: format(deadlines.dbLastOrderDate, 'yyyy-MM-dd'),
             db_delivery_date: format(deadlines.dbDeliveryDate, 'yyyy-MM-dd'),
             lighting_last_order_date: format(deadlines.lightingLastOrderDate, 'yyyy-MM-dd'),
             lighting_delivery_date: format(deadlines.lightingDeliveryDate, 'yyyy-MM-dd'),
           })
           .eq("id", tenant.id);
       });
 
       const results = await Promise.all(updatePromises);
       const error = results.find(r => r.error)?.error;

      if (error) throw error;
      
       toast.success(`Opening date and deadlines set for all ${allTenants?.length || 0} tenants`);
      setBulkOpeningDateDialog(false);
      setBulkOpeningDate("");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to set opening date: " + error.message);
    }
  };
  const StatusIcon = ({ checked, onClick, autoSynced }: { checked: boolean; onClick?: () => void; autoSynced?: boolean }) => (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className="hover:opacity-70 transition-opacity cursor-pointer"
              type="button"
            >
              {checked ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>
          {autoSynced && (
            <TooltipContent>
              <p className="text-xs">Auto-synced from document uploads</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      {autoSynced && checked && (
        <Link2 className="h-3 w-3 text-primary" />
      )}
    </div>
  );
  
  const isTenantComplete = (tenant: Tenant) => {
    // Basic required fields - MUST all be true
    const basicComplete = tenant.sow_received === true &&
                          tenant.layout_received === true &&
                          tenant.cost_reported === true &&
                          tenant.area !== null;
    
    // DB requirements: Either "by tenant" checked OR (ordered AND has cost)
    const dbComplete = tenant.db_by_tenant === true || 
                      (tenant.db_ordered === true && tenant.db_cost !== null && tenant.db_cost > 0);
    
    // Lighting requirements: Either "by tenant" checked OR (ordered AND has cost)
    const lightingComplete = tenant.lighting_by_tenant === true || 
                            (tenant.lighting_ordered === true && tenant.lighting_cost !== null && tenant.lighting_cost > 0);
    
    // ALL three must be true for completion
    return basicComplete && dbComplete && lightingComplete;
  };

  const getDeadlineStatus = (tenant: Tenant) => {
    if (!tenant.opening_date) return { status: 'none', className: '' };
    
    const today = new Date();
    const openingDate = new Date(tenant.opening_date);
    const beneficialDays = tenant.beneficial_occupation_days || 90;
    const beneficialDate = addDays(openingDate, -beneficialDays);
    const equipmentDeadline = addDays(beneficialDate, -56);
    
    const daysUntilBeneficial = differenceInDays(beneficialDate, today);
    const daysUntilEquipmentDeadline = differenceInDays(equipmentDeadline, today);
    
    // Critical: Beneficial occupation date passed but work incomplete
    if (daysUntilBeneficial < 0 && !isTenantComplete(tenant)) {
      return { status: 'overdue', className: 'bg-red-200 dark:bg-red-900/50 hover:bg-red-300 dark:hover:bg-red-900/70 border-l-4 border-l-red-500' };
    }
    
    // Warning: Equipment deadline passed but not ordered
    if (daysUntilEquipmentDeadline < 0 && (!tenant.db_ordered || !tenant.lighting_ordered)) {
      return { status: 'equipment-overdue', className: 'bg-orange-200 dark:bg-orange-900/50 hover:bg-orange-300 dark:hover:bg-orange-900/70 border-l-4 border-l-orange-500' };
    }
    
    // Amber: Within 2 weeks of beneficial occupation
    if (daysUntilBeneficial >= 0 && daysUntilBeneficial <= 14) {
      return { status: 'approaching', className: 'bg-amber-200 dark:bg-amber-900/50 hover:bg-amber-300 dark:hover:bg-amber-900/70 border-l-4 border-l-amber-500' };
    }
    
    // Green: All on track
    if (isTenantComplete(tenant)) {
      return { status: 'complete', className: 'bg-green-200 dark:bg-green-900/50 hover:bg-green-300 dark:hover:bg-green-900/70 border-l-4 border-l-green-500' };
    }
    
    return { status: 'normal', className: 'bg-background hover:bg-muted/50' };
  };

  const getRowClassName = (tenant: Tenant) => {
    return getDeadlineStatus(tenant).className;
  };

  const getCategoryVariant = (category: string) => {
    const variants = {
      standard: "bg-blue-500 text-white border-blue-600",
      fast_food: "bg-red-500 text-white border-red-600",
      restaurant: "bg-emerald-500 text-white border-emerald-600",
      national: "bg-purple-600 text-white border-purple-700"
    };
    return variants[category as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };
  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National"
    };
    return labels[category as keyof typeof labels] || category;
  };

  // Filter tenants
  const filteredTenants = localTenants.filter(tenant => {
    // Search filter
    const matchesSearch = !searchQuery.trim() || 
      tenant.shop_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.shop_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Category filter
    if (categoryFilter && tenant.shop_category !== categoryFilter) return false;
    
    // Status filter
    if (statusFilter === "complete" && !isTenantComplete(tenant)) return false;
    if (statusFilter === "incomplete" && isTenantComplete(tenant)) return false;
    
    return true;
  });

  // Group tenants
  const groupedTenants = () => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", tenants: filteredTenants }];
    }
    
    if (groupBy === "category") {
      const groups: Record<string, Tenant[]> = {};
      filteredTenants.forEach(tenant => {
        const category = tenant.shop_category;
        if (!groups[category]) groups[category] = [];
        groups[category].push(tenant);
      });
      return Object.entries(groups).map(([key, tenants]) => ({
        key,
        label: getCategoryLabel(key),
        tenants
      }));
    }
    
    if (groupBy === "bo-period") {
      const groups: Record<string, Tenant[]> = {
        '30': [],
        '45': [],
        '60': [],
        '90': []
      };
      filteredTenants.forEach(tenant => {
        const period = tenant.beneficial_occupation_days?.toString() || '90';
        if (!groups[period]) groups[period] = [];
        groups[period].push(tenant);
      });
      return Object.entries(groups)
        .filter(([_, tenants]) => tenants.length > 0)
        .map(([key, tenants]) => ({
          key,
          label: `${key} Days BO Period`,
          tenants
        }));
    }
    
    return [{ key: "all", label: "", tenants: filteredTenants }];
  };

  // Category counts
  const categoryCounts = {
    standard: localTenants.filter(t => t.shop_category === 'standard').length,
    fast_food: localTenants.filter(t => t.shop_category === 'fast_food').length,
    restaurant: localTenants.filter(t => t.shop_category === 'restaurant').length,
    national: localTenants.filter(t => t.shop_category === 'national').length,
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden py-6 max-w-full">
      {/* Filters and Actions */}
      <div className="flex flex-col gap-3 flex-shrink-0 px-1">
        {/* Search and Filters */}
        <div className="flex gap-2 items-center flex-wrap bg-muted/30 p-3 rounded-lg border">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by shop number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Category Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Category {categoryFilter && `(${getCategoryLabel(categoryFilter)})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Filter by Category</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer ${categoryFilter === 'standard' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'standard' ? null : 'standard')}
                  >
                    Standard ({categoryCounts.standard})
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer ${categoryFilter === 'fast_food' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'fast_food' ? null : 'fast_food')}
                  >
                    Fast Food ({categoryCounts.fast_food})
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer ${categoryFilter === 'restaurant' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'restaurant' ? null : 'restaurant')}
                  >
                    Restaurant ({categoryCounts.restaurant})
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer ${categoryFilter === 'national' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'national' ? null : 'national')}
                  >
                    National ({categoryCounts.national})
                  </Badge>
                </div>
                {categoryFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setCategoryFilter(null)} className="w-full">
                    Clear Filter
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <div className="flex gap-1">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="h-9"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "complete" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("complete")}
              className={`h-9 ${statusFilter === "complete" ? "" : "border-green-200 text-green-700 hover:bg-green-50"}`}
            >
              Complete
            </Button>
            <Button
              variant={statusFilter === "incomplete" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("incomplete")}
              className={`h-9 ${statusFilter === "incomplete" ? "" : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"}`}
            >
              Incomplete
            </Button>
          </div>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="category">Group by Category</SelectItem>
              <SelectItem value="bo-period">Group by BO Period</SelectItem>
            </SelectContent>
          </Select>

          {/* Results count */}
          {(searchQuery || categoryFilter || statusFilter !== "all") && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredTenants.length} of {localTenants.length} tenants
            </span>
          )}
        </div>

        {/* Bulk Actions */}
        <div className="flex justify-end gap-2">
        <Dialog open={bulkOpeningDateDialog} onOpenChange={setBulkOpeningDateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <CalendarDays className="h-4 w-4 mr-2" />
              Set Opening Date for All
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Opening Date for All Tenants</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-opening-date">Opening Date</Label>
                <Input
                  id="bulk-opening-date"
                  type="date"
                  value={bulkOpeningDate}
                  onChange={(e) => setBulkOpeningDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBulkOpeningDateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkSetOpeningDate}>
                  Apply to All Tenants
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button onClick={handleBulkAutoCalc} disabled={isCalculating} variant="outline">
          <Calculator className="h-4 w-4 mr-2" />
          {isCalculating ? "Calculating..." : "Bulk Auto-Calculate DB Sizes"}
        </Button>
        </div>
        
        {/* DB SOW Summary */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-3 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground">DB SOW Summary:</span>
          {(() => {
            const sowCounts: Record<string, number> = {};
            localTenants
              .filter(t => !t.exclude_from_totals && t.db_size_scope_of_work)
              .forEach(t => {
                const sow = t.db_size_scope_of_work!.trim();
                sowCounts[sow] = (sowCounts[sow] || 0) + 1;
              });
            
            // Sort by the numeric part (e.g., "36-way" -> 36)
            const sortedSow = Object.entries(sowCounts).sort((a, b) => {
              const numA = parseInt(a[0].match(/\d+/)?.[0] || '0');
              const numB = parseInt(b[0].match(/\d+/)?.[0] || '0');
              return numB - numA;
            });
            
            return sortedSow.length > 0 ? sortedSow.map(([sow, count]) => (
              <Badge key={sow} variant="secondary" className="text-xs font-medium">
                {sow}: <span className="ml-1 font-bold">{count}</span>
              </Badge>
            )) : (
              <span className="text-xs text-muted-foreground italic">No DB SOW data</span>
            );
          })()}
        </div>
      </div>
      {/* Table Section - Scrollable with Fixed Header */}
      <div className="flex-1 min-h-0 rounded-lg border border-border bg-background overflow-hidden max-w-full">
        <div className="h-full w-full overflow-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 bg-muted/50 z-20 border-b border-border shadow-sm">
              <tr>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">Shop #</th>
                <th className="h-12 px-2 text-center text-sm font-medium text-muted-foreground bg-muted/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">BOQ</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Dedicated BOQ - Exclude from totals</p>
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50 min-w-[180px]">Shop Name</th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">Category</th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">BO Period</th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">Beneficial Occ</th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">Days Until</th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">Area</th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">DB Allow</th>
                <th className="h-12 px-4 text-left text-sm font-medium text-muted-foreground bg-muted/50">DB SOW</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">SOW</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">Layout</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">DB Ord</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">DB by Tenant</th>
                <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground bg-muted/50">DB Cost</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">Light Ord</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">Light by Tenant</th>
                <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground bg-muted/50">Light Cost</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">Cost Report</th>
                <th className="h-12 px-4 text-center text-sm font-medium text-muted-foreground bg-muted/50">Handover</th>
                <th className="h-12 px-4 text-right text-sm font-medium text-muted-foreground bg-muted/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupedTenants().map((group) => (
                <React.Fragment key={group.key}>
                  {group.label && (
                    <tr className="hover:bg-transparent bg-muted/30">
                      <td colSpan={21} className="font-semibold py-2 px-4 border-b text-sm">
                        {group.label} ({group.tenants.length})
                      </td>
                    </tr>
                  )}
                {group.tenants.length === 0 ? (
                  <tr>
                    <td colSpan={21} className="text-center py-8 px-4 text-muted-foreground text-sm">
                      {searchQuery || categoryFilter || statusFilter !== "all" 
                        ? "No tenants match the current filters" 
                        : "No tenants found"}
                    </td>
                  </tr>
                ) : (
                  group.tenants.map((tenant) => {
                    const deadlineStatus = getDeadlineStatus(tenant);
                    const beneficialDate = tenant.opening_date
                      ? addDays(new Date(tenant.opening_date), -(tenant.beneficial_occupation_days || 90))
                      : null;
                    const daysUntil = beneficialDate ? differenceInDays(beneficialDate, new Date()) : null;
                    const editingUser = getEditingUser(tenant.id);
                    
                    return (
                      <tr key={tenant.id} className={`${getRowClassName(tenant)} border-b`}>
                        <td className="font-medium px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={tenant.shop_number}
                              onChange={(e) => setLocalTenants(prev => 
                                prev.map(t => t.id === tenant.id ? { ...t, shop_number: e.target.value } : t)
                              )}
                              onFocus={() => setEditing(tenant.id)}
                              onBlur={(e) => {
                                setEditing(null);
                                handleFieldUpdate(tenant.id, 'shop_number', e.target.value);
                              }}
                              className="h-8 w-24"
                            />
                            {editingUser && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-primary animate-pulse">
                                      <User className="h-3 w-3" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{editingUser.userName} is editing</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                        <td className="text-center px-2 py-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleBooleanToggle(tenant.id, 'exclude_from_totals', tenant.exclude_from_totals || false)}
                                  className="hover:opacity-70 transition-opacity cursor-pointer"
                                  type="button"
                                >
                                  {tenant.exclude_from_totals ? (
                                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{tenant.exclude_from_totals ? 'Excluded from totals (Dedicated BOQ)' : 'Click to exclude from totals'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={tenant.shop_name}
                            onChange={(e) => setLocalTenants(prev => 
                              prev.map(t => t.id === tenant.id ? { ...t, shop_name: e.target.value } : t)
                            )}
                            onBlur={(e) => handleFieldUpdate(tenant.id, 'shop_name', e.target.value)}
                            className="h-8 min-w-[160px]"
                          />
                        </td>
                          <td className="px-4 py-2">
                            <Select
                              value={tenant.shop_category}
                              onValueChange={(val) => handleFieldUpdate(tenant.id, 'shop_category', val)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="fast_food">Fast Food</SelectItem>
                                <SelectItem value="restaurant">Restaurant</SelectItem>
                                <SelectItem value="national">National</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2">
                            <Select
                              value={tenant.beneficial_occupation_days?.toString() || "90"}
                              onValueChange={(val) => handleFieldUpdate(tenant.id, 'beneficial_occupation_days', parseInt(val))}
                            >
                              <SelectTrigger className="h-8 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="45">45</SelectItem>
                                <SelectItem value="60">60</SelectItem>
                                <SelectItem value="90">90</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="whitespace-nowrap text-sm px-4 py-2">
                            {beneficialDate ? beneficialDate.toLocaleDateString() : '-'}
                          </td>
                          <td className="text-center px-4 py-2">
                            {daysUntil !== null ? (
                              <Badge variant={daysUntil < 0 ? "destructive" : daysUntil <= 14 ? "default" : "secondary"}>
                                {daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `${daysUntil} days`}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              value={tenant.area || ""}
                              onChange={(e) => setLocalTenants(prev => 
                                prev.map(t => t.id === tenant.id ? { ...t, area: e.target.value ? parseFloat(e.target.value) : null } : t)
                              )}
                              onBlur={(e) => handleFieldUpdate(tenant.id, 'area', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="m²"
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={tenant.db_size_allowance || ""}
                              onChange={(e) => setLocalTenants(prev => 
                                prev.map(t => t.id === tenant.id ? { ...t, db_size_allowance: e.target.value } : t)
                              )}
                              onBlur={(e) => handleFieldUpdate(tenant.id, 'db_size_allowance', e.target.value)}
                              className="h-8 w-28"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={tenant.db_size_scope_of_work || ""}
                              onChange={(e) => setLocalTenants(prev => 
                                prev.map(t => t.id === tenant.id ? { ...t, db_size_scope_of_work: e.target.value } : t)
                              )}
                              onBlur={(e) => handleFieldUpdate(tenant.id, 'db_size_scope_of_work', e.target.value)}
                              className="h-8 w-32"
                            />
                          </td>
                          <td className="text-center px-4 py-2">
                            <StatusIcon 
                              checked={tenant.sow_received}
                              onClick={() => handleBooleanToggle(tenant.id, 'sow_received', tenant.sow_received)}
                              autoSynced={false}
                            />
                          </td>
                          <td className="text-center px-4 py-2">
                            <StatusIcon 
                              checked={tenant.layout_received}
                              onClick={() => handleBooleanToggle(tenant.id, 'layout_received', tenant.layout_received)}
                              autoSynced={false}
                            />
                          </td>
                          <td className="text-center px-4 py-2">
                            <StatusIcon 
                              checked={tenant.db_ordered}
                              onClick={() => handleBooleanToggle(tenant.id, 'db_ordered', tenant.db_ordered)}
                              autoSynced={false}
                            />
                          </td>
                          <td className="text-center px-4 py-2">
                            <StatusIcon 
                              checked={tenant.db_by_tenant}
                              onClick={() => handleBooleanToggle(tenant.id, 'db_by_tenant', tenant.db_by_tenant)}
                            />
                          </td>
                          <td className="text-right px-4 py-2">
                            {!tenant.db_by_tenant && (
                              <Input
                                type="number"
                                value={tenant.db_cost ?? ""}
                                onChange={(e) => {
                                  const newValue = e.target.value ? parseFloat(e.target.value) : null;
                                  setLocalTenants(prev => 
                                    prev.map(t => t.id === tenant.id ? { ...t, db_cost: newValue } : t)
                                  );
                                }}
                                onBlur={() => {
                                  const currentTenant = localTenants.find(t => t.id === tenant.id);
                                  if (currentTenant) {
                                    handleFieldUpdate(tenant.id, 'db_cost', currentTenant.db_cost);
                                  }
                                }}
                                className="h-8 w-24 text-right"
                                placeholder="R"
                              />
                            )}
                          </td>
                          <td className="text-center px-4 py-2">
                            <StatusIcon 
                              checked={tenant.lighting_ordered}
                              onClick={() => handleBooleanToggle(tenant.id, 'lighting_ordered', tenant.lighting_ordered)}
                              autoSynced={false}
                            />
                          </td>
                          <td className="text-center px-4 py-2">
                            <StatusIcon 
                              checked={tenant.lighting_by_tenant}
                              onClick={() => handleBooleanToggle(tenant.id, 'lighting_by_tenant', tenant.lighting_by_tenant)}
                            />
                          </td>
                          <td className="text-right px-4 py-2">
                            {!tenant.lighting_by_tenant && (
                              <Input
                                type="number"
                                value={tenant.lighting_cost ?? ""}
                                onChange={(e) => {
                                  const newValue = e.target.value ? parseFloat(e.target.value) : null;
                                  setLocalTenants(prev => 
                                    prev.map(t => t.id === tenant.id ? { ...t, lighting_cost: newValue } : t)
                                  );
                                }}
                                onBlur={() => {
                                  const currentTenant = localTenants.find(t => t.id === tenant.id);
                                  if (currentTenant) {
                                    handleFieldUpdate(tenant.id, 'lighting_cost', currentTenant.lighting_cost);
                                  }
                                }}
                                className="h-8 w-24 text-right"
                                placeholder="R"
                              />
                            )}
                          </td>
                          <td className="text-center px-4 py-2">
                            <StatusIcon 
                              checked={tenant.cost_reported}
                              onClick={() => handleBooleanToggle(tenant.id, 'cost_reported', tenant.cost_reported)}
                            />
                          </td>
                          <td className="text-center px-4 py-2">
                            {handoverLinkStatus?.linkedTenantIds?.includes(tenant.id) ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <FolderSymlink className="h-3 w-3 mr-1" />
                                Linked
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="text-right px-4 py-2">
                          <div className="flex justify-end gap-1">
                            <TenantDialog projectId={projectId} tenant={tenant} onSuccess={onUpdate} />
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(tenant)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                })
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot className="bg-muted/50 border-t-2 sticky bottom-0 z-10">
            <tr className="font-semibold">
              <td className="px-4 py-4" colSpan={21}>
                <div className="flex items-center justify-end gap-8">
                  <span className="text-sm text-muted-foreground">(excl. dedicated BOQ)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">DB Cost Total:</span>
                    <span className="text-base font-bold whitespace-nowrap">
                      R {localTenants
                        .filter(t => !t.db_by_tenant && t.db_cost && !t.exclude_from_totals)
                        .reduce((sum, t) => sum + (t.db_cost || 0), 0)
                        .toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Lighting Total:</span>
                    <span className="text-base font-bold whitespace-nowrap">
                      R {localTenants
                        .filter(t => !t.lighting_by_tenant && t.lighting_cost && !t.exclude_from_totals)
                        .reduce((sum, t) => sum + (t.lighting_cost || 0), 0)
                        .toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
          </table>
        </div>
      </div>

      {tenantToDelete && (
        <DeleteTenantDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          tenant={tenantToDelete}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};