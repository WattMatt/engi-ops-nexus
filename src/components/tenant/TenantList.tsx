import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Circle, Calculator, AlertTriangle, Clock, CalendarDays, Search, Filter, Link2 } from "lucide-react";
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
import { User } from "lucide-react";
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
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  cost_reported: boolean;
  opening_date: string | null;
  beneficial_occupation_days: number | null;
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
      const { error } = await supabase
        .from("tenants")
        .update({ [field]: value })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onMutate: async ({ tenantId, field, value }) => {
      // Optimistically update local state
      setLocalTenants(prev => 
        prev.map(t => t.id === tenantId ? { ...t, [field]: value } : t)
      );
    },
    onError: (error, variables) => {
      // Rollback on error by refetching from parent
      toast.error("Failed to update");
      onUpdate();
    }
  });

  const handleFieldUpdate = (tenantId: string, field: string, value: any) => {
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
      const { error } = await supabase
        .from("tenants")
        .update({ opening_date: bulkOpeningDate })
        .eq("project_id", projectId);

      if (error) throw error;
      
      toast.success(`Opening date set to ${new Date(bulkOpeningDate).toLocaleDateString()} for all tenants`);
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
    return tenant.sow_received &&
           tenant.layout_received &&
           tenant.db_ordered &&
           tenant.lighting_ordered &&
           tenant.area !== null &&
           tenant.db_cost !== null &&
           tenant.lighting_cost !== null;
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
      return { status: 'overdue', className: 'bg-red-100 hover:bg-red-200' };
    }
    
    // Warning: Equipment deadline passed but not ordered
    if (daysUntilEquipmentDeadline < 0 && (!tenant.db_ordered || !tenant.lighting_ordered)) {
      return { status: 'equipment-overdue', className: 'bg-orange-100 hover:bg-orange-200' };
    }
    
    // Amber: Within 2 weeks of beneficial occupation
    if (daysUntilBeneficial >= 0 && daysUntilBeneficial <= 14) {
      return { status: 'approaching', className: 'bg-amber-100 hover:bg-amber-200' };
    }
    
    // Green: All on track
    if (isTenantComplete(tenant)) {
      return { status: 'complete', className: 'bg-green-50 hover:bg-green-100' };
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
    <div className="h-full flex flex-col gap-4">
      {/* Filters and Actions */}
      <div className="flex flex-col gap-3 flex-shrink-0">
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
      </div>
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          {groupedTenants().map((group) => (
            <div key={group.key}>
              {group.label && (
                <div className="sticky top-0 bg-muted px-4 py-2 font-semibold text-sm border-b z-20">
                  {group.label} ({group.tenants.length})
                </div>
              )}
              <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Shop #</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>BO Period</TableHead>
                <TableHead>Beneficial Occ</TableHead>
                <TableHead>Days Until</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>DB Allow</TableHead>
                <TableHead>DB SOW</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    SOW
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link2 className="h-3 w-3 text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Auto-synced from document uploads</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    Layout
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link2 className="h-3 w-3 text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Auto-synced from document uploads</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    DB Ord
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link2 className="h-3 w-3 text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Auto-synced from document uploads</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="text-right">DB Cost</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    Light Ord
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link2 className="h-3 w-3 text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Auto-synced from document uploads</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="text-right">Light Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                    {searchQuery || categoryFilter || statusFilter !== "all" 
                      ? "No tenants match the current filters" 
                      : "No tenants found"}
                  </TableCell>
                </TableRow>
              ) : (
                group.tenants.map((tenant) => {
                  const deadlineStatus = getDeadlineStatus(tenant);
                  const beneficialDate = tenant.opening_date 
                    ? addDays(new Date(tenant.opening_date), -(tenant.beneficial_occupation_days || 90))
                    : null;
                  const daysUntil = beneficialDate ? differenceInDays(beneficialDate, new Date()) : null;
                  const editingUser = getEditingUser(tenant.id);
                  
                  return (
                    <TableRow key={tenant.id} className={getRowClassName(tenant)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Input
                          value={tenant.shop_number}
                          onChange={(e) => handleFieldUpdate(tenant.id, 'shop_number', e.target.value)}
                          onFocus={() => setEditing(tenant.id)}
                          onBlur={() => setEditing(null)}
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
                    </TableCell>
                    <TableCell>
                      <Input
                        value={tenant.shop_name}
                        onChange={(e) => handleFieldUpdate(tenant.id, 'shop_name', e.target.value)}
                        onFocus={() => setEditing(tenant.id)}
                        onBlur={() => setEditing(null)}
                        className="h-8 min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={tenant.shop_category} onValueChange={value => handleFieldUpdate(tenant.id, 'shop_category', value)}>
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue>
                            <Badge variant="outline" className={getCategoryVariant(tenant.shop_category)}>
                              {getCategoryLabel(tenant.shop_category)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">
                            <Badge variant="outline" className={getCategoryVariant("standard")}>
                              Standard
                            </Badge>
                          </SelectItem>
                          <SelectItem value="fast_food">
                            <Badge variant="outline" className={getCategoryVariant("fast_food")}>
                              Fast Food
                            </Badge>
                          </SelectItem>
                          <SelectItem value="restaurant">
                            <Badge variant="outline" className={getCategoryVariant("restaurant")}>
                              Restaurant
                            </Badge>
                          </SelectItem>
                          <SelectItem value="national">
                            <Badge variant="outline" className={getCategoryVariant("national")}>
                              National
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={tenant.opening_date || ""}
                        onChange={(e) => handleFieldUpdate(tenant.id, 'opening_date', e.target.value || null)}
                        onFocus={() => setEditing(tenant.id)}
                        onBlur={() => setEditing(null)}
                        className="h-8 w-[140px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={tenant.beneficial_occupation_days?.toString() || "90"} 
                        onValueChange={value => handleFieldUpdate(tenant.id, 'beneficial_occupation_days', parseInt(value))}
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="45">45 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {beneficialDate ? beneficialDate.toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {daysUntil !== null ? (
                        <div className="flex items-center gap-1">
                          {daysUntil < 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {daysUntil >= 0 && daysUntil <= 14 && <Clock className="h-4 w-4 text-amber-600" />}
                          <span className={daysUntil < 0 ? "text-destructive font-semibold" : ""}>
                            {daysUntil} days
                          </span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={tenant.area || ""}
                        onChange={(e) => handleFieldUpdate(tenant.id, 'area', e.target.value ? parseFloat(e.target.value) : null)}
                        onFocus={() => setEditing(tenant.id)}
                        onBlur={() => setEditing(null)}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={tenant.db_size_allowance || ""}
                        onChange={(e) => handleFieldUpdate(tenant.id, 'db_size_allowance', e.target.value || null)}
                        onFocus={() => setEditing(tenant.id)}
                        onBlur={() => setEditing(null)}
                        className="h-8 w-24"
                        placeholder="e.g. 100A"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={tenant.db_size_scope_of_work || ""}
                        onChange={(e) => handleFieldUpdate(tenant.id, 'db_size_scope_of_work', e.target.value || null)}
                        onFocus={() => setEditing(tenant.id)}
                        onBlur={() => setEditing(null)}
                        className="h-8 w-24"
                        placeholder="e.g. 80A TP"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon 
                        checked={tenant.sow_received} 
                        onClick={() => handleBooleanToggle(tenant.id, 'sow_received', tenant.sow_received)}
                        autoSynced={true}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon 
                        checked={tenant.layout_received}
                        onClick={() => handleBooleanToggle(tenant.id, 'layout_received', tenant.layout_received)}
                        autoSynced={true}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon 
                        checked={tenant.db_ordered}
                        onClick={() => handleBooleanToggle(tenant.id, 'db_ordered', tenant.db_ordered)}
                        autoSynced={true}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {tenant.db_ordered && !tenant.db_cost ? (
                        <span className="text-muted-foreground italic">By Tenant</span>
                      ) : (
                        <Input
                          type="number"
                          step="0.01"
                          value={tenant.db_cost || ""}
                          onChange={(e) => handleFieldUpdate(tenant.id, 'db_cost', e.target.value ? parseFloat(e.target.value) : null)}
                          onFocus={() => setEditing(tenant.id)}
                          onBlur={() => setEditing(null)}
                          className="h-8 w-28 text-right"
                          placeholder="0.00"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusIcon 
                        checked={tenant.lighting_ordered}
                        autoSynced={true}
                        onClick={() => handleBooleanToggle(tenant.id, 'lighting_ordered', tenant.lighting_ordered)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {tenant.lighting_ordered && !tenant.lighting_cost ? (
                        <span className="text-muted-foreground italic">By Tenant</span>
                      ) : (
                        <Input
                          type="number"
                          step="0.01"
                          value={tenant.lighting_cost || ""}
                          onChange={(e) => handleFieldUpdate(tenant.id, 'lighting_cost', e.target.value ? parseFloat(e.target.value) : null)}
                          onFocus={() => setEditing(tenant.id)}
                          onBlur={() => setEditing(null)}
                          className="h-8 w-28 text-right"
                          placeholder="0.00"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TenantDialog projectId={projectId} tenant={tenant} onSuccess={onUpdate} />
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(tenant)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        ))}
      </ScrollArea>
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