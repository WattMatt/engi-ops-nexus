import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, Plus, Search, Trash2, Edit, Loader2,
  Clock, CheckCircle2, XCircle, AlertCircle, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProjectInspectionItemsProps {
  projectId: string;
}

interface InspectionItem {
  id: string;
  inspection_type: string;
  location: string;
  description: string | null;
  expected_date: string | null;
  sort_order: number;
  status: string;
  contractor_notes: string | null;
  contractor_ready_at: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_notes: string | null;
  created_at: string;
}

const INSPECTION_TYPES = [
  { value: "rough_in", label: "Rough-In Inspection" },
  { value: "conduit", label: "Conduit Installation" },
  { value: "cable_pull", label: "Cable Pulling" },
  { value: "termination", label: "Terminations" },
  { value: "switchgear", label: "Switchgear Installation" },
  { value: "db_installation", label: "DB Installation" },
  { value: "lighting", label: "Lighting Installation" },
  { value: "final", label: "Final Inspection" },
  { value: "testing", label: "Testing & Commissioning" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-slate-500", icon: <Clock className="h-3 w-3" /> },
  ready_for_inspection: { label: "Ready", color: "bg-amber-500", icon: <AlertCircle className="h-3 w-3" /> },
  scheduled: { label: "Scheduled", color: "bg-blue-500", icon: <Calendar className="h-3 w-3" /> },
  passed: { label: "Passed", color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
  not_applicable: { label: "N/A", color: "bg-slate-400", icon: <Clock className="h-3 w-3" /> },
};

export function ProjectInspectionItems({ projectId }: ProjectInspectionItemsProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InspectionItem | null>(null);
  const [formData, setFormData] = useState({
    inspection_type: "",
    location: "",
    description: "",
    expected_date: "",
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["project-inspection-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_inspection_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as InspectionItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("project_inspection_items")
        .insert({
          project_id: projectId,
          inspection_type: formData.inspection_type,
          location: formData.location,
          description: formData.description || null,
          expected_date: formData.expected_date || null,
          sort_order: (items?.length || 0) + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection item created");
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["project-inspection-items", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create item", { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InspectionItem> }) => {
      const { error } = await supabase
        .from("project_inspection_items")
        .update(data.updates)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection item updated");
      setEditingItem(null);
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["project-inspection-items", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update item", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_inspection_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection item deleted");
      queryClient.invalidateQueries({ queryKey: ["project-inspection-items", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete item", { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      inspection_type: "",
      location: "",
      description: "",
      expected_date: "",
    });
  };

  const openEditDialog = (item: InspectionItem) => {
    setEditingItem(item);
    setFormData({
      inspection_type: item.inspection_type,
      location: item.location,
      description: item.description || "",
      expected_date: item.expected_date || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        updates: {
          inspection_type: formData.inspection_type,
          location: formData.location,
          description: formData.description || null,
          expected_date: formData.expected_date || null,
        },
      });
    } else {
      createMutation.mutate();
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const filteredItems = items?.filter((item) =>
    !searchTerm ||
    item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.inspection_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Stats
  const stats = items?.reduce(
    (acc, item) => {
      acc.total++;
      acc.byStatus[item.status] = (acc.byStatus[item.status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} as Record<string, number> }
  ) || { total: 0, byStatus: {} };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Expected Inspections
            </CardTitle>
            <CardDescription>
              Define required inspections for the contractor to complete
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Inspection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Inspection" : "Add Inspection"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update inspection details" : "Define a new expected inspection for the contractor"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Inspection Type</Label>
                  <Select
                    value={formData.inspection_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, inspection_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Level 2, Shop 15"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expected Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, expected_date: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Additional details about this inspection..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !formData.inspection_type ||
                    !formData.location ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            return (
              <Badge key={status} variant="outline" className="gap-1">
                {config.icon}
                {config.label}: {count}
              </Badge>
            );
          })}
          {stats.total === 0 && (
            <span className="text-sm text-muted-foreground">
              No inspections defined yet
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inspections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {filteredItems.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const typeLabel = INSPECTION_TYPES.find(t => t.value === item.inspection_type)?.label || item.inspection_type;
                  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{typeLabel}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        {item.expected_date
                          ? format(new Date(item.expected_date), "dd MMM yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-white text-xs ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground border rounded-lg">
            <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No inspections defined</p>
            <p className="text-sm">Add expected inspections for the contractor</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
