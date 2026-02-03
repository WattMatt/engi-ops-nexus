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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, Plus, Search, Clock, CheckCircle2, 
  XCircle, AlertCircle, Calendar, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContractorInspectionRequestsProps {
  projectId: string;
  contractorName: string;
  contractorEmail: string;
  companyName: string | null;
  token: string;
}

interface InspectionRequest {
  id: string;
  inspection_type: string;
  location: string;
  description: string;
  requested_date: string;
  status: string;
  response_notes: string | null;
  created_at: string;
  updated_at: string;
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
  pending: { label: "Pending", color: "bg-amber-500", icon: <Clock className="h-4 w-4" /> },
  scheduled: { label: "Scheduled", color: "bg-blue-500", icon: <Calendar className="h-4 w-4" /> },
  approved: { label: "Approved", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  rejected: { label: "Rejected", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
  completed: { label: "Completed", color: "bg-green-600", icon: <CheckCircle2 className="h-4 w-4" /> },
};

export function ContractorInspectionRequests({
  projectId,
  contractorName,
  contractorEmail,
  companyName,
  token,
}: ContractorInspectionRequestsProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    inspection_type: "",
    location: "",
    description: "",
    requested_date: "",
  });

  // Fetch inspection requests for this contractor
  const { data: requests, isLoading } = useQuery({
    queryKey: ["contractor-inspections", projectId, contractorEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_requests")
        .select("*")
        .eq("project_id", projectId)
        .eq("requested_by_email", contractorEmail)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as InspectionRequest[];
    },
  });

  // Submit new inspection request
  const submitRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("inspection_requests")
        .insert({
          project_id: projectId,
          inspection_type: formData.inspection_type,
          location: formData.location,
          description: formData.description,
          requested_date: formData.requested_date,
          requested_by_name: contractorName,
          requested_by_email: contractorEmail,
          company_name: companyName,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection request submitted successfully");
      setDialogOpen(false);
      setFormData({
        inspection_type: "",
        location: "",
        description: "",
        requested_date: "",
      });
      queryClient.invalidateQueries({ queryKey: ["contractor-inspections", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to submit request", { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Filter requests
  const filteredRequests = requests?.filter((req) =>
    !searchTerm ||
    req.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.inspection_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Stats
  const stats = requests?.reduce(
    (acc, req) => {
      acc.total++;
      acc.byStatus[req.status] = (acc.byStatus[req.status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} as Record<string, number> }
  ) || { total: 0, byStatus: {} };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Inspection Requests
              </CardTitle>
              <CardDescription>
                Request QC inspections for completed work
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Inspection</DialogTitle>
                  <DialogDescription>
                    Submit a new inspection request for completed work
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
                    <Label>Requested Date</Label>
                    <Input
                      type="date"
                      value={formData.requested_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requested_date: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the work completed and ready for inspection..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={4}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitRequest.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => submitRequest.mutate()}
                    disabled={
                      !formData.inspection_type ||
                      !formData.location ||
                      !formData.requested_date ||
                      submitRequest.isPending
                    }
                  >
                    {submitRequest.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Submit Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Overview */}
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
                No inspection requests yet
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
          <CardDescription>Track the status of your inspection requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Requests */}
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No inspection requests found</p>
              <p className="text-sm">
                {requests?.length === 0
                  ? "Submit your first inspection request above"
                  : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {filteredRequests.map((request) => {
                const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                const typeLabel = INSPECTION_TYPES.find(
                  (t) => t.value === request.inspection_type
                )?.label || request.inspection_type;

                return (
                  <div key={request.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{typeLabel}</span>
                          <Badge className={`text-xs text-white ${statusConfig.color}`}>
                            {statusConfig.icon}
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {request.location}
                        </p>

                        {request.description && (
                          <p className="text-sm mb-2">{request.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Requested: {format(new Date(request.requested_date), "dd MMM yyyy")}
                          </span>
                          <span>
                            Submitted: {format(new Date(request.created_at), "dd MMM yyyy")}
                          </span>
                        </div>

                        {request.response_notes && (
                          <div className="mt-3 p-2 bg-muted rounded-md text-sm">
                            <span className="font-medium">Response: </span>
                            {request.response_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
