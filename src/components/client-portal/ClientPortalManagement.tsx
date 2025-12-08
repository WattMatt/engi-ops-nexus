import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, ExternalLink, Link, Users, MessageSquare, Key, Mail, Clock, Trash2, Send, Settings, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface ClientPortalManagementProps {
  projectId?: string;
}

export const ClientPortalManagement = ({ projectId: propProjectId }: ClientPortalManagementProps) => {
  const [projectId, setProjectId] = useState(propProjectId || "");
  const [projectName, setProjectName] = useState("");
  const [copied, setCopied] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [expiryHours, setExpiryHours] = useState("168");
  const [password, setPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const storedProjectId = propProjectId || localStorage.getItem("selectedProjectId");
    if (storedProjectId) {
      setProjectId(storedProjectId);
      loadProjectDetails(storedProjectId);
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

  // Fetch portal settings
  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['client-portal-settings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch active tokens
  const { data: tokens, refetch: refetchTokens } = useQuery({
    queryKey: ['client-portal-tokens', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_tokens')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch access logs
  const { data: accessLogs } = useQuery({
    queryKey: ['client-portal-access-logs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_access_log')
        .select('*')
        .eq('project_id', projectId)
        .order('accessed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

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

  const handleGenerateToken = async () => {
    if (!newClientEmail.trim()) {
      toast.error("Please enter client email");
      return;
    }

    setIsGenerating(true);
    try {
      // Ensure portal settings exist
      if (!settings) {
        await supabase
          .from('client_portal_settings')
          .insert({
            project_id: projectId,
            password_hash: password || null,
            link_expiry_hours: parseInt(expiryHours),
          });
      }

      const { data, error } = await supabase
        .rpc('generate_client_portal_token', {
          p_project_id: projectId,
          p_email: newClientEmail.trim(),
          p_expiry_hours: parseInt(expiryHours)
        });

      if (error) throw error;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/client-view?token=${data}`;
      setGeneratedLink(link);
      
      toast.success("Access link generated successfully!");
      setNewClientEmail("");
      refetchTokens();
    } catch (error: any) {
      toast.error("Failed to generate token: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('client_portal_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
      toast.success("Access link revoked");
      refetchTokens();
    } catch (error: any) {
      toast.error("Failed to revoke token: " + error.message);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      const { error } = await supabase
        .from('client_portal_settings')
        .upsert({
          project_id: projectId,
          password_hash: password || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'project_id' });

      if (error) throw error;
      toast.success("Password updated");
      refetchSettings();
    } catch (error: any) {
      toast.error("Failed to update password: " + error.message);
    }
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
      queryClient.invalidateQueries({ queryKey: ['client-comments-admin', projectId] });
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

  const isTokenExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Client Portal Access
        </CardTitle>
        <CardDescription>
          Share project reports with clients via secure, expiring links
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="generate">
              <Send className="h-4 w-4 mr-2" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="active">
              <Key className="h-4 w-4 mr-2" />
              Active ({tokens?.filter(t => !isTokenExpired(t.expires_at)).length || 0})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments ({comments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="logs">
              <History className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Generate Link Tab */}
          <TabsContent value="generate" className="space-y-4">
            <Alert>
              <AlertDescription>
                Generate secure, time-limited access links for clients to view project reports.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientEmail">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Client Email
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@company.com"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Link Expiry
                </Label>
                <Select value={expiryHours} onValueChange={setExpiryHours}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="336">14 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerateToken} disabled={isGenerating || !newClientEmail}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Generate Access Link
            </Button>

            {generatedLink && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-green-800">Access link generated!</span>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={generatedLink}
                        className="font-mono text-xs"
                      />
                      <Button onClick={() => handleCopyLink(generatedLink)} size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => window.open(generatedLink, '_blank')} size="sm" variant="outline">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Active Tokens Tab */}
          <TabsContent value="active" className="space-y-4">
            {tokens?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No access links generated yet</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Accessed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens?.map((token: any) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.email}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(token.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(token.expires_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                          {token.access_count > 0 ? (
                            <Badge variant="secondary">{token.access_count} visits</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isTokenExpired(token.expires_at) ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge className="bg-green-500">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(`${window.location.origin}/client-view?token=${token.token}`)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteToken(token.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Key className="h-4 w-4 inline mr-2" />
                  Portal Password (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Set a password for extra security"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button onClick={handleUpdatePassword} variant="outline">
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  If set, clients will need both the link and this password to access the portal.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Comments Tab */}
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

          {/* Access Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            {accessLogs?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No access logs yet</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Accessed At</TableHead>
                      <TableHead>User Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs?.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.email || 'Unknown'}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(log.accessed_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {log.user_agent || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
