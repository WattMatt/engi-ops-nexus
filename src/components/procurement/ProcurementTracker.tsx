import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogDescription,
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
  Download,
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
  source_id: string | null;
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import from Prime Costs
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
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

      {/* Import from Prime Costs Dialog */}
      <ImportPrimeCostsDialog
        projectId={projectId}
        existingSourceIds={items.filter(i => i.source_type === 'prime_cost').map(i => i.source_id).filter(Boolean) as string[]}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
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

// Import from Prime Costs Dialog
interface PrimeCostItem {
  id: string;
  item_code: string | null;
  description: string;
  unit: string | null;
  prime_cost_amount: number | null;
  bill_name: string;
}

function ImportPrimeCostsDialog({
  projectId,
  existingSourceIds,
  open,
  onOpenChange,
}: {
  projectId: string;
  existingSourceIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Prime Cost items from BOQ
  const { data: primeCostItems = [], isLoading } = useQuery({
    queryKey: ["prime-cost-items-for-import", projectId],
    queryFn: async () => {
      // Get the project's BOQ
      const { data: boq } = await supabase
        .from("project_boqs")
        .select("id")
        .eq("project_id", projectId)
        .maybeSingle();

      if (!boq) return [];

      // Get prime cost items from BOQ
      const { data, error } = await supabase
        .from("boq_items")
        .select(`
          id,
          item_code,
          description,
          unit,
          prime_cost_amount,
          section:boq_project_sections!inner(
            bill:boq_bills!inner(
              bill_name,
              project_boq_id
            )
          )
        `)
        .eq("item_type", "prime_cost")
        .eq("section.bill.project_boq_id", boq.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        item_code: item.item_code,
        description: item.description,
        unit: item.unit,
        prime_cost_amount: item.prime_cost_amount,
        bill_name: item.section?.bill?.bill_name || "Unknown Bill",
      })) as PrimeCostItem[];
    },
    enabled: open,
  });

  // Filter out already imported items
  const availableItems = primeCostItems.filter(
    (item) => !existingSourceIds.includes(item.id)
  );

  // Filter by search
  const filteredItems = availableItems.filter(
    (item) =>
      !searchQuery ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bill_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all visible
  const selectAll = () => {
    const allIds = filteredItems.map((item) => item.id);
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => setSelectedIds([]);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const itemsToImport = primeCostItems.filter((item) =>
        selectedIds.includes(item.id)
      );

      // Determine category based on description
      const getCategory = (description: string): string => {
        const desc = description.toLowerCase();
        if (desc.includes("distribution board") || desc.includes("db")) return "DBs";
        if (desc.includes("light") || desc.includes("fitting")) return "Lighting";
        if (desc.includes("cable")) return "Cables";
        if (desc.includes("switchgear")) return "Switchgear";
        return "Equipment";
      };

      const procurementItems = itemsToImport.map((item) => ({
        project_id: projectId,
        name: item.description,
        description: `Imported from BOQ: ${item.bill_name}`,
        quantity: 1,
        unit: item.unit || "No.",
        source_type: "prime_cost",
        source_id: item.id,
        source_reference: `${item.bill_name} - ${item.item_code || "PC Item"}`,
        estimated_cost: item.prime_cost_amount || 0,
        priority: "normal",
        category: getCategory(item.description),
        created_by: user.user?.id,
      }));

      const { error } = await supabase
        .from("procurement_items")
        .insert(procurementItems);

      if (error) throw error;

      return itemsToImport.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["procurement-items"] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] });
      toast.success(`Imported ${count} item${count !== 1 ? "s" : ""} to procurement schedule`);
      setSelectedIds([]);
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to import items"),
  });

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import from Prime Costs
          </DialogTitle>
          <DialogDescription>
            Select Prime Cost items from your BOQ to add to the procurement schedule. 
            Items already imported are hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search and select all */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>

          {/* Items list */}
          <ScrollArea className="flex-1 border rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading Prime Cost items...
              </div>
            ) : availableItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {primeCostItems.length === 0
                  ? "No Prime Cost items found in BOQ"
                  : "All Prime Cost items have been imported"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedIds.includes(item.id) ? "bg-primary/5" : ""
                    }`}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleSelection(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {item.description}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {item.bill_name}
                        </Badge>
                        {item.item_code && <span>{item.item_code}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatCurrency(item.prime_cost_amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.unit || "Sum"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selection summary */}
          {selectedIds.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm">
                <strong>{selectedIds.length}</strong> item{selectedIds.length !== 1 ? "s" : ""} selected
              </span>
              <span className="text-sm font-mono">
                Total: {formatCurrency(
                  primeCostItems
                    .filter((item) => selectedIds.includes(item.id))
                    .reduce((sum, item) => sum + (item.prime_cost_amount || 0), 0)
                )}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={selectedIds.length === 0 || importMutation.isPending}
          >
            {importMutation.isPending
              ? "Importing..."
              : `Import ${selectedIds.length} Item${selectedIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
