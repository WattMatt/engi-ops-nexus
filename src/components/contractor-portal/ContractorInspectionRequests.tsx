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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardCheck, Plus, Search, Clock, CheckCircle2, 
  XCircle, AlertCircle, Calendar, Loader2, ListChecks
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

interface ExpectedInspection {
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
  { value: "switchgear", label: "Switchgear Installation" },
  { value: "db_installation", label: "DB Installation" },
  { value: "lighting", label: "Lighting Installation" },
  { value: "final", label: "Final Inspection" },
  { value: "testing", label: "Testing & Commissioning" },
  { value: "other", label: "Other" },
];

const REQUEST_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-amber-500", icon: <Clock className="h-4 w-4" /> },
  scheduled: { label: "Scheduled", color: "bg-blue-500", icon: <Calendar className="h-4 w-4" /> },
  approved: { label: "Approved", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  rejected: { label: "Rejected", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
  completed: { label: "Completed", color: "bg-green-600", icon: <CheckCircle2 className="h-4 w-4" /> },
};

const EXPECTED_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-slate-500", icon: <Clock className="h-4 w-4" /> },
  ready_for_inspection: { label: "Ready", color: "bg-amber-500", icon: <AlertCircle className="h-4 w-4" /> },
  scheduled: { label: "Scheduled", color: "bg-blue-500", icon: <Calendar className="h-4 w-4" /> },
  passed: { label: "Passed", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  failed: { label: "Failed", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
  not_applicable: { label: "N/A", color: "bg-slate-400", icon: <Clock className="h-4 w-4" /> },
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
  const [readyDialogOpen, setReadyDialogOpen] = useState(false);
  const [selectedExpected, setSelectedExpected] = useState<ExpectedInspection | null>(null);
  const [contractorNotes, setContractorNotes] = useState("");
  const [formData, setFormData] = useState({
    inspection_type: "",
    location: "",
    description: "",
    requested_date: "",
  });

  // Fetch expected inspections from PM
  const { data: expectedInspections, isLoading: loadingExpected } = useQuery({
    queryKey: ["expected-inspections", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_inspection_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as ExpectedInspection[];
    },
  });

  // Fetch contractor's ad-hoc requests
  const { data: requests, isLoading: loadingRequests } = useQuery({
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

  // Mark expected inspection as ready
  const markReadyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExpected) return;
      
      const { error } = await supabase
        .from("project_inspection_items")
        .update({
          status: "ready_for_inspection",
          contractor_notes: contractorNotes || null,
          contractor_ready_at: new Date().toISOString(),
        })
        .eq("id", selectedExpected.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as ready for inspection");
      setReadyDialogOpen(false);
      setSelectedExpected(null);
      setContractorNotes("");
      queryClient.invalidateQueries({ queryKey: ["expected-inspections", projectId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update", { description: error.message });
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

  const isLoading = loadingExpected || loadingRequests;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Filter expected inspections
  const filteredExpected = expectedInspections?.filter((item) =>
    !searchTerm ||
    item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.inspection_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter requests
  const filteredRequests = requests?.filter((req) =>
    !searchTerm ||
    req.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.inspection_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Stats
  const expectedStats = expectedInspections?.reduce(
    (acc, item) => {
      acc.total++;
      acc.byStatus[item.status] = (acc.byStatus[item.status] || 0) + 1;
      return acc;
    },
    { total: 0, byStatus: {} as Record<string, number> }
  ) || { total: 0, byStatus: {} };

  const pendingExpected = expectedInspections?.filter(i => i.status === 'pending').length || 0;
  const readyExpected = expectedInspections?.filter(i => i.status === 'ready_for_inspection').length || 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Inspections
              </CardTitle>
              <CardDescription>
                Required inspections and ad-hoc inspection requests
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Additional
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Additional Inspection</DialogTitle>
                  <DialogDescription>
                    Submit an ad-hoc inspection request for work not covered by scheduled inspections
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
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-900/30">
              <ListChecks className="h-3 w-3 mr-1" />
              {expectedInspections?.length || 0} expected
            </Badge>
            <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-3 w-3 mr-1" />
              {pendingExpected} pending action
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30">
              <AlertCircle className="h-3 w-3 mr-1" />
              {readyExpected} ready for inspection
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30">
              <Plus className="h-3 w-3 mr-1" />
              {requests?.length || 0} additional requests
            </Badge>
          </div>
        </CardContent>
      </Card>

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

      {/* Tabs for Expected vs Requests */}
      <Tabs defaultValue="expected" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expected" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Expected Inspections ({expectedInspections?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Plus className="h-4 w-4" />
            My Requests ({requests?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expected">
          <Card>
            <CardHeader>
              <CardTitle>Required Inspections</CardTitle>
              <CardDescription>
                Inspections defined by the project team. Mark as ready when work is complete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredExpected.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No expected inspections defined</p>
                  <p className="text-sm">
                    The project team has not defined required inspections yet
                  </p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {filteredExpected.map((item) => {
                    const statusConfig = EXPECTED_STATUS_CONFIG[item.status] || EXPECTED_STATUS_CONFIG.pending;
                    const typeLabel = INSPECTION_TYPES.find(
                      (t) => t.value === item.inspection_type
                    )?.label || item.inspection_type;
                    const canMarkReady = item.status === 'pending';

                    return (
                      <div key={item.id} className="p-4">
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
                              {item.location}
                            </p>

                            {item.description && (
                              <p className="text-sm mb-2">{item.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {item.expected_date && (
                                <span>
                                  Expected: {format(new Date(item.expected_date), "dd MMM yyyy")}
                                </span>
                              )}
                              {item.contractor_ready_at && (
                                <span>
                                  Marked ready: {format(new Date(item.contractor_ready_at), "dd MMM yyyy")}
                                </span>
                              )}
                              {item.inspection_date && (
                                <span>
                                  Inspected: {format(new Date(item.inspection_date), "dd MMM yyyy")}
                                </span>
                              )}
                            </div>

                            {item.contractor_notes && (
                              <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                                <span className="font-medium">Your notes: </span>
                                {item.contractor_notes}
                              </div>
                            )}

                            {item.inspector_notes && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
                                <span className="font-medium">Inspector ({item.inspector_name}): </span>
                                {item.inspector_notes}
                              </div>
                            )}
                          </div>

                          {canMarkReady && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedExpected(item);
                                setReadyDialogOpen(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark Ready
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Your Additional Requests</CardTitle>
              <CardDescription>Track the status of your ad-hoc inspection requests</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No additional requests</p>
                  <p className="text-sm">
                    Use "Request Additional" to submit ad-hoc inspection requests
                  </p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {filteredRequests.map((request) => {
                    const statusConfig = REQUEST_STATUS_CONFIG[request.status] || REQUEST_STATUS_CONFIG.pending;
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
        </TabsContent>
      </Tabs>

      {/* Mark Ready Dialog */}
      <Dialog open={readyDialogOpen} onOpenChange={(open) => {
        setReadyDialogOpen(open);
        if (!open) {
          setSelectedExpected(null);
          setContractorNotes("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Inspection Ready</DialogTitle>
            <DialogDescription>
              Confirm that the work is complete and ready for inspection
            </DialogDescription>
          </DialogHeader>

          {selectedExpected && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">
                  {INSPECTION_TYPES.find(t => t.value === selectedExpected.inspection_type)?.label}
                </p>
                <p className="text-sm text-muted-foreground">{selectedExpected.location}</p>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any notes about the completed work..."
                  value={contractorNotes}
                  onChange={(e) => setContractorNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReadyDialogOpen(false);
                setSelectedExpected(null);
                setContractorNotes("");
              }}
              disabled={markReadyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => markReadyMutation.mutate()}
              disabled={markReadyMutation.isPending}
            >
              {markReadyMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Ready
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
