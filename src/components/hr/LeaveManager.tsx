import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AddLeaveRequestDialog } from "./AddLeaveRequestDialog";

export function LeaveManager() {
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employees!leave_requests_employee_id_fkey (
            first_name,
            last_name,
            employee_number
          ),
          leave_types (
            name,
            code
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleReview = async (leaveId: string, status: "approved" | "rejected") => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", leaveId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Leave request ${status}`,
      });

      setDetailsDialogOpen(false);
      setSelectedLeave(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
    };
    return (
      <Badge className={variants[status] || "bg-gray-500"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Leave Requests</h3>
          <p className="text-sm text-muted-foreground">Review and manage employee leave requests</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Leave Request
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaveRequests.map((leave: any) => (
            <TableRow key={leave.id}>
              <TableCell className="font-medium">
                {leave.employees?.first_name} {leave.employees?.last_name}
                <br />
                <span className="text-xs text-muted-foreground">
                  {leave.employees?.employee_number}
                </span>
              </TableCell>
              <TableCell>{leave.leave_types?.name}</TableCell>
              <TableCell>{new Date(leave.start_date).toLocaleDateString()}</TableCell>
              <TableCell>{new Date(leave.end_date).toLocaleDateString()}</TableCell>
              <TableCell>{leave.days_requested}</TableCell>
              <TableCell>{getStatusBadge(leave.status)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLeave(leave);
                    setDetailsDialogOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Review and approve or reject this leave request
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Employee</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLeave.employees?.first_name} {selectedLeave.employees?.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Leave Type</p>
                <p className="text-sm text-muted-foreground">{selectedLeave.leave_types?.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedLeave.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">End Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedLeave.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Reason</p>
                <p className="text-sm text-muted-foreground">{selectedLeave.reason || "No reason provided"}</p>
              </div>
              {selectedLeave.status === "pending" && (
                <>
                  <div className="space-y-2">
                    <Label>Review Notes</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about your decision..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReview(selectedLeave.id, "approved")}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview(selectedLeave.id, "rejected")}
                      disabled={loading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </>
              )}
              {selectedLeave.status !== "pending" && (
                <div>
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(selectedLeave.status)}
                  {selectedLeave.review_notes && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedLeave.review_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddLeaveRequestDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["leave-requests"] })}
      />
    </div>
  );
}
