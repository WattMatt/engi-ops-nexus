import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  Truck,
  AlertCircle,
  DollarSign,
} from "lucide-react";

interface ProcurementTrackerProps {
  projectId: string;
}

type ProcurementStatus =
  | "pending_quote"
  | "quote_received"
  | "pending_approval"
  | "approved"
  | "ordered"
  | "in_transit"
  | "delivered"
  | "cancelled";

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  source_type: string;
  source_reference: string | null;
  supplier_name: string | null;
  estimated_cost: number;
  quoted_amount: number | null;
  approved_budget: number | null;
  actual_cost: number | null;
  po_number: string | null;
  status: ProcurementStatus;
  priority: string;
  category: string | null;
  expected_delivery_date: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending_quote: { label: "Pending Quote", color: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  quote_received: { label: "Quote Received", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <FileText className="h-3 w-3" /> },
  pending_approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  ordered: { label: "Ordered", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: <Package className="h-3 w-3" /> },
  in_transit: { label: "In Transit", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300", icon: <Truck className="h-3 w-3" /> },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive", icon: <AlertCircle className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  urgent: "bg-destructive/10 text-destructive",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  prime_cost: "Prime Cost",
  boq: "BOQ",
  tenant_tracker: "Tenant Tracker",
  manual: "Manual",
};

export function ProcurementTracker({ projectId }: ProcurementTrackerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProcurementItem | null>(null);

  // Fetch procurement items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["procurement-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ProcurementItem[];
    },
  });

  // Get unique categories
  const categories = [...new Set(items.filter(i => i.category).map(i => i.category))];

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.source_reference?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProcurementStatus }) => {
      const updates: Record<string, unknown> = { status };
      
      // Set timestamps based on status
      if (status === "ordered") updates.ordered_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "approved") updates.approved_at = new Date().toISOString();
      
      const { error } = await supabase
        .from("procurement_items")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-items"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // Calculate summary stats
  const stats = {
    total: items.length,
    pendingQuote: items.filter(i => i.status === "pending_quote").length,
    pendingApproval: items.filter(i => i.status === "pending_approval").length,
    ordered: items.filter(i => ["ordered", "in_transit"].includes(i.status)).length,
    delivered: items.filter(i => i.status === "delivered").length,
    totalEstimated: items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0),
    totalActual: items.reduce((sum, i) => sum + (i.actual_cost || 0), 0),
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{stats.pendingQuote}</div>
            <div className="text-sm text-muted-foreground">Pending Quote</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.pendingApproval}</div>
            <div className="text-sm text-muted-foreground">Pending Approval</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.ordered}</div>
            <div className="text-sm text-muted-foreground">On Order</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-lg font-bold">{formatCurrency(stats.totalEstimated)}</div>
            <div className="text-sm text-muted-foreground">Est. Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Procurement Schedule
          </CardTitle>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items, suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No procurement items yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead className="text-right">Quoted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_TYPE_LABELS[item.source_type]}
                        </Badge>
                        {item.source_reference && (
                          <div className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]">
                            {item.source_reference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{item.supplier_name || "-"}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.estimated_cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.quoted_amount)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.status}
                          onValueChange={(value) => {
                            updateStatus.mutate({ id: item.id, status: value as ProcurementStatus });
                          }}
                        >
                          <SelectTrigger className={`h-7 w-[140px] text-xs ${STATUS_CONFIG[item.status].color}`}>
                            <span className="flex items-center gap-1">
                              {STATUS_CONFIG[item.status].icon}
                              {STATUS_CONFIG[item.status].label}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                <span className="flex items-center gap-2">
                                  {config.icon}
                                  {config.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <AddProcurementItemDialog
        projectId={projectId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Item Detail Dialog */}
      {selectedItem && (
        <ProcurementItemDetailDialog
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
        />
      )}
    </div>
  );
}

// Add Item Dialog Component
function AddProcurementItemDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: "1",
    unit: "No.",
    source_type: "manual" as string,
    source_reference: "",
    supplier_name: "",
    estimated_cost: "",
    priority: "normal",
    category: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("procurement_items").insert({
        project_id: projectId,
        name: formData.name,
        description: formData.description || null,
        quantity: parseFloat(formData.quantity) || 1,
        unit: formData.unit,
        source_type: formData.source_type,
        source_reference: formData.source_reference || null,
        supplier_name: formData.supplier_name || null,
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
        priority: formData.priority,
        category: formData.category || null,
        created_by: user.user?.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-items"] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] }); // Refresh roadmap
      toast.success("Procurement item added and linked to roadmap");
      onOpenChange(false);
      setFormData({
        name: "", description: "", quantity: "1", unit: "No.",
        source_type: "manual", source_reference: "", supplier_name: "",
        estimated_cost: "", priority: "normal", category: "",
      });
    },
    onError: () => toast.error("Failed to add item"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Procurement Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Item Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Distribution Board 24-Way"
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details..."
                rows={2}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No.">No.</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="m²">m²</SelectItem>
                  <SelectItem value="Set">Set</SelectItem>
                  <SelectItem value="Lot">Lot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source Type</Label>
              <Select value={formData.source_type} onValueChange={(v) => setFormData({ ...formData, source_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="prime_cost">Prime Cost</SelectItem>
                  <SelectItem value="boq">BOQ</SelectItem>
                  <SelectItem value="tenant_tracker">Tenant Tracker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., DBs, Lighting"
              />
            </div>
            <div>
              <Label>Supplier Name</Label>
              <Input
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="e.g., CBI Electric"
              />
            </div>
            <div>
              <Label>Estimated Cost (R)</Label>
              <Input
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Source Reference</Label>
              <Input
                value={formData.source_reference}
                onChange={(e) => setFormData({ ...formData, source_reference: e.target.value })}
                placeholder="e.g., Bill 1 - PC Item A1, or Shop 15 - Woolworths"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!formData.name || createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Item Detail Dialog
function ProcurementItemDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ProcurementItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Status</div>
              <Badge className={STATUS_CONFIG[item.status].color}>
                {STATUS_CONFIG[item.status].label}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground">Priority</div>
              <Badge className={PRIORITY_CONFIG[item.priority]}>{item.priority}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground">Source</div>
              <div>{SOURCE_TYPE_LABELS[item.source_type]}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Category</div>
              <div>{item.category || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Supplier</div>
              <div>{item.supplier_name || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">PO Number</div>
              <div>{item.po_number || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Estimated Cost</div>
              <div className="font-mono">R {item.estimated_cost?.toLocaleString() || "0"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Quoted Amount</div>
              <div className="font-mono">R {item.quoted_amount?.toLocaleString() || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Actual Cost</div>
              <div className="font-mono">R {item.actual_cost?.toLocaleString() || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Expected Delivery</div>
              <div>{item.expected_delivery_date ? format(new Date(item.expected_delivery_date), "dd MMM yyyy") : "-"}</div>
            </div>
          </div>
          {item.description && (
            <div>
              <div className="text-muted-foreground text-sm mb-1">Description</div>
              <div className="text-sm">{item.description}</div>
            </div>
          )}
          {item.source_reference && (
            <div>
              <div className="text-muted-foreground text-sm mb-1">Source Reference</div>
              <div className="text-sm">{item.source_reference}</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
