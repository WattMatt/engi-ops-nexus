import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, Plus, Clock, CheckCircle2, 
  XCircle, AlertCircle, Calendar, Loader2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TenantQCInspectionsProps {
  tenantId: string;
  projectId: string;
  shopNumber: string;
  shopName: string | null;
}

interface InspectionItem {
  id: string;
  inspection_type: string;
  location: string;
  description: string | null;
  expected_date: string | null;
  status: string;
  contractor_notes: string | null;
  contractor_ready_at: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_notes: string | null;
}

const INSPECTION_TYPES = [
  { value: "rough_in", label: "Rough-In Inspection" },
  { value: "conduit", label: "Conduit Installation" },
  { value: "cable_pull", label: "Cable Pulling" },
  { value: "termination", label: "Terminations" },
  { value: "db_installation", label: "DB Installation" },
  { value: "lighting", label: "Lighting Installation" },
  { value: "final", label: "Final Inspection" },
  { value: "testing", label: "Testing & Commissioning" },
  { value: "coc", label: "COC Inspection" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  ready_for_inspection: { label: "Ready", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "outline" },
  passed: { label: "Passed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  not_applicable: { label: "N/A", variant: "secondary" },
};

export function TenantQCInspections({ tenantId, projectId, shopNumber, shopName }: TenantQCInspectionsProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    inspection_type: "",
    description: "",
    expected_date: "",
  });

  const { data: inspections, isLoading } = useQuery({
    queryKey: ["tenant-inspections", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_inspection_items")
        .select("*")
        .eq("tenant_id", tenantId)
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
          tenant_id: tenantId,
          inspection_type: formData.inspection_type,
          location: `${shopNumber}${shopName ? ` - ${shopName}` : ""}`,
          description: formData.description || null,
          expected_date: formData.expected_date || null,
          sort_order: (inspections?.length || 0) + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("QC inspection added");
      setDialogOpen(false);
      setFormData({ inspection_type: "", description: "", expected_date: "" });
      queryClient.invalidateQueries({ queryKey: ["tenant-inspections", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-inspection-stats", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to add inspection", { description: error.message });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      
      if (status === "passed" || status === "failed") {
        updates.inspection_date = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("project_inspection_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["tenant-inspections", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-inspection-stats", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update", { description: error.message });
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
      toast.success("Inspection removed");
      queryClient.invalidateQueries({ queryKey: ["tenant-inspections", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-inspection-stats", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete", { description: error.message });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  const passedCount = inspections?.filter(i => i.status === "passed").length || 0;
  const totalCount = inspections?.length || 0;

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">QC Inspections</span>
          {totalCount > 0 && (
            <Badge variant={passedCount === totalCount ? "default" : "secondary"} className="text-xs">
              {passedCount}/{totalCount}
            </Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add QC Inspection</DialogTitle>
              <DialogDescription>
                Add a quality control inspection for {shopNumber}{shopName ? ` - ${shopName}` : ""}
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
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Additional details..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!formData.inspection_type || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Inspection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {inspections && inspections.length > 0 ? (
        <div className="space-y-2">
          {inspections.map((item) => {
            const typeLabel = INSPECTION_TYPES.find(t => t.value === item.inspection_type)?.label || item.inspection_type;
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-md border bg-background text-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Badge variant={statusConfig.variant} className="text-xs shrink-0">
                    {item.status === "passed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {item.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                    {item.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {item.status === "ready_for_inspection" && <AlertCircle className="h-3 w-3 mr-1" />}
                    {item.status === "scheduled" && <Calendar className="h-3 w-3 mr-1" />}
                    {statusConfig.label}
                  </Badge>
                  <span className="truncate font-medium">{typeLabel}</span>
                  {item.expected_date && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(item.expected_date), "dd MMM")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={item.status}
                    onValueChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                  >
                    <SelectTrigger className="h-8 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="ready_for_inspection">Ready</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="not_applicable">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">No QC inspections defined. Click "Add" to create one.</p>
      )}
    </div>
  );
}
