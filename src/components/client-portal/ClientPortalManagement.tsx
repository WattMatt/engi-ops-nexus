import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Link, Users, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface ClientPortalManagementProps {
  projectId?: string;
}

export const ClientPortalManagement = ({ projectId: propProjectId }: ClientPortalManagementProps) => {
  const [projectId, setProjectId] = useState(propProjectId || "");
  const [projectName, setProjectName] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedProjectId = propProjectId || localStorage.getItem("selectedProjectId");
    if (storedProjectId) {
      setProjectId(storedProjectId);
      loadProjectDetails(storedProjectId);
      generateClientUrl(storedProjectId);
    }
  }, [propProjectId]);

  const loadProjectDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("name")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) setProjectName(data.name);
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const generateClientUrl = (id: string) => {
    const baseUrl = window.location.origin;
    setClientUrl(`${baseUrl}/client-view?project=${id}`);
  };

  // Fetch client comments for this project
  const { data: comments } = useQuery({
    queryKey: ['client-comments-admin', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch client approvals
  const { data: approvals } = useQuery({
    queryKey: ['client-approvals-admin', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_approvals')
        .select('*')
        .eq('project_id', projectId)
        .order('approved_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      toast.success("URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleOpenPreview = () => {
    window.open(clientUrl, "_blank");
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('client_comments')
        .update({
          is_resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;
      toast.success("Comment marked as resolved");
    } catch (error) {
      toast.error("Failed to resolve comment");
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'revision_requested':
        return <Badge variant="secondary">Revision Requested</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Client Portal Access
        </CardTitle>
        <CardDescription>
          Share project reports with clients via a secure link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Section */}
        <Alert>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Client Portal URL for {projectName}:</span>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={clientUrl}
                  className="font-mono text-xs"
                />
                <Button onClick={handleCopyUrl} size="sm" variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={handleOpenPreview} size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Tabs for Comments and Approvals */}
        <Tabs defaultValue="comments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments ({comments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <Users className="h-4 w-4 mr-2" />
              Approvals ({approvals?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="space-y-3">
            {comments?.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No comments yet</p>
            ) : (
              comments?.map((comment: any) => (
                <div key={comment.id} className={`p-4 rounded-lg border ${comment.is_resolved ? 'bg-muted/50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{comment.report_type?.replace('_', ' ')}</Badge>
                        {comment.is_resolved && (
                          <Badge className="bg-green-500">Resolved</Badge>
                        )}
                      </div>
                      <p className="text-sm">{comment.comment_text}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {!comment.is_resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveComment(comment.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="approvals" className="space-y-3">
            {approvals?.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No approvals yet</p>
            ) : (
              approvals?.map((approval: any) => (
                <div key={approval.id} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{approval.report_type?.replace('_', ' ')}</Badge>
                        {getApprovalStatusBadge(approval.approval_status)}
                      </div>
                      {approval.notes && (
                        <p className="text-sm text-muted-foreground">{approval.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(approval.approved_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {approval.signature_data && (
                      <img 
                        src={approval.signature_data} 
                        alt="Signature" 
                        className="h-12 border rounded bg-white"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
