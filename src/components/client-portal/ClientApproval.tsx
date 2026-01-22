import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RotateCcw, PenLine, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Approval {
  id: string;
  approval_status: string;
  approved_at: string;
  notes?: string;
  signature_data?: string;
  report_version?: string;
}

interface ClientApprovalProps {
  projectId: string;
  reportType: string;
  reportVersion?: string;
  canApprove: boolean;
}

export const ClientApproval = ({ projectId, reportType, reportVersion, canApprove }: ClientApprovalProps) => {
  const [approval, setApproval] = useState<Approval | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchApproval();
  }, [projectId, reportType]);

  const fetchApproval = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("client_approvals")
        .select("*")
        .eq("project_id", projectId)
        .eq("report_type", reportType)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setApproval(data);
    } catch (error) {
      console.error("Error fetching approval:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (status: 'approved' | 'rejected' | 'revision_requested') => {
    if (status === 'approved' && !canvasRef.current) {
      setShowSignature(true);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const signatureData = status === 'approved' && canvasRef.current 
        ? canvasRef.current.toDataURL() 
        : null;

      const approvalData = {
        project_id: projectId,
        user_id: user.id,
        report_type: reportType,
        report_version: reportVersion,
        approval_status: status,
        notes: notes.trim() || null,
        signature_data: signatureData,
        approved_at: new Date().toISOString()
      };

      if (approval) {
        const { error } = await supabase
          .from("client_approvals")
          .update(approvalData)
          .eq("id", approval.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_approvals")
          .insert(approvalData);
        if (error) throw error;
      }

      // Send notification to team
      try {
        await supabase.functions.invoke("send-client-portal-notification", {
          body: {
            projectId,
            notificationType: status,
            reportType,
            userEmail: user.email || "Unknown",
            notes: notes.trim() || undefined
          }
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }

      toast.success(`Report ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'revision requested'}`);
      setShowSignature(false);
      setNotes("");
      fetchApproval();
    } catch (error: any) {
      toast.error("Failed to submit approval: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'revision_requested':
        return <Badge variant="secondary"><RotateCcw className="h-3 w-3 mr-1" />Revision Requested</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading approval status...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Sign-Off
        </CardTitle>
        <CardDescription>
          Review and approve or request revisions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status */}
        {approval && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Status</span>
              {getStatusBadge(approval.approval_status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {format(new Date(approval.approved_at), "MMM d, yyyy h:mm a")}
            </p>
            {approval.notes && (
              <p className="text-sm mt-2">{approval.notes}</p>
            )}
            {approval.signature_data && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Signature:</p>
                <img 
                  src={approval.signature_data} 
                  alt="Signature" 
                  className="border rounded h-16 bg-white"
                />
              </div>
            )}
          </div>
        )}

        {/* Approval actions */}
        {canApprove && (
          <div className="space-y-4">
            {showSignature && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <PenLine className="h-4 w-4" />
                    Draw your signature
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearSignature}>
                    Clear
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={100}
                  className="border rounded cursor-crosshair bg-white w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            )}

            <Textarea
              placeholder="Add notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleApproval('approved')}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {showSignature ? 'Confirm Approval' : 'Approve'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleApproval('revision_requested')}
                disabled={submitting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleApproval('rejected')}
                disabled={submitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
