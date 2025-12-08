import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building2, FileText, Zap, Loader2, AlertCircle, CheckCircle, 
  Clock, MessageSquare, Send, PenLine, Download, FolderOpen, Shield, Lock, Mail
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import JSZip from "jszip";

interface TokenValidation {
  is_valid: boolean;
  project_id: string | null;
  email: string | null;
  expires_at: string | null;
}

const ClientView = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const projectIdParam = searchParams.get("project");
  
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  
  // Password verification state
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  
  // Portal content state
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [clientName, setClientName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Validate token on mount
  useEffect(() => {
    validateAccess();
  }, [token, projectIdParam]);

  const validateAccess = async () => {
    setIsValidating(true);

    try {
      if (token) {
        // Validate token via RPC function
        const { data, error } = await supabase
          .rpc('validate_client_portal_token', {
            p_token: token,
            p_user_agent: navigator.userAgent
          });

        if (error) throw error;

        const result = data?.[0] as TokenValidation;
        
        if (result?.is_valid && result.project_id) {
          setProjectId(result.project_id);
          setClientEmail(result.email);
          setExpiresAt(result.expires_at);
          
          // Check if password is required
          const { data: settings } = await supabase
            .from('client_portal_settings')
            .select('password_hash')
            .eq('project_id', result.project_id)
            .maybeSingle();

          if (settings?.password_hash) {
            setPasswordRequired(true);
          } else {
            setIsAuthenticated(true);
          }
        } else {
          throw new Error("Invalid or expired access link");
        }
      } else if (projectIdParam) {
        // Legacy direct project access - requires password if set
        const { data: settings } = await supabase
          .from('client_portal_settings')
          .select('password_hash, is_enabled')
          .eq('project_id', projectIdParam)
          .maybeSingle();

        if (settings?.is_enabled === false) {
          throw new Error("Client portal is disabled for this project");
        }

        setProjectId(projectIdParam);
        
        if (settings?.password_hash) {
          setPasswordRequired(true);
        } else {
          setIsAuthenticated(true);
        }
      } else {
        throw new Error("No access token or project ID provided");
      }
    } catch (error: any) {
      toast.error(error.message || "Access denied");
    } finally {
      setIsValidating(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      toast.error("Please enter the password");
      return;
    }

    setVerifyingPassword(true);
    try {
      const { data: settings } = await supabase
        .from('client_portal_settings')
        .select('password_hash')
        .eq('project_id', projectId)
        .single();

      // Simple password check (in production, use proper hashing)
      if (settings?.password_hash === passwordInput) {
        setIsAuthenticated(true);
        setPasswordRequired(false);
        toast.success("Access granted");
      } else {
        toast.error("Incorrect password");
      }
    } catch (error) {
      toast.error("Failed to verify password");
    } finally {
      setVerifyingPassword(false);
    }
  };

  // Fetch project details
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ["client-view-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name, client_name, status")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Project not found");
      return data;
    },
    enabled: !!projectId && isAuthenticated,
    retry: false,
  });

  // Fetch tenants (without cost data)
  const { data: tenants } = useQuery({
    queryKey: ["client-view-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id, shop_number, shop_name, area, shop_category,
          opening_date, layout_received, sow_received, 
          db_ordered, lighting_ordered, generator_zone_id,
          generator_loading_sector_1, generator_loading_sector_2, manual_kw_override
        `)
        .eq("project_id", projectId)
        .order("shop_number");
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isAuthenticated,
  });

  // Fetch zones
  const { data: zones } = useQuery({
    queryKey: ["client-view-zones", projectId],
    queryFn: async () => {
      const pid = projectId as string;
      const query = (supabase as any).from("zones").select("id, name").eq("project_id", pid);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!projectId && isAuthenticated,
  });

  // Fetch handover documents
  const { data: documents } = useQuery({
    queryKey: ["client-view-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("document_type");
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isAuthenticated,
  });

  // Fetch client comments (public)
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["client-view-comments", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_comments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isAuthenticated,
  });

  const isComplete = (tenant: any) => {
    return tenant.layout_received && tenant.sow_received && tenant.db_ordered && tenant.lighting_ordered;
  };

  const getStatusBadge = (tenant: any) => {
    if (isComplete(tenant)) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
    }
    if (tenant.layout_received || tenant.sow_received) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    }
    return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const calculateProgress = () => {
    if (!tenants?.length) return 0;
    const completed = tenants.filter((t: any) => isComplete(t)).length;
    return Math.round((completed / tenants.length) * 100);
  };

  const getTenantLoading = (tenant: any) => {
    if (tenant.manual_kw_override) return tenant.manual_kw_override;
    return (tenant.generator_loading_sector_1 || 0) + (tenant.generator_loading_sector_2 || 0);
  };

  const getTotalLoading = () => {
    return tenants?.reduce((sum: number, t: any) => sum + getTenantLoading(t), 0) || 0;
  };

  const getZoneLoading = (zoneId: string) => {
    const zoneTenants = tenants?.filter((t: any) => t.generator_zone_id === zoneId) || [];
    return zoneTenants.reduce((sum: number, t: any) => sum + getTenantLoading(t), 0);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !clientName.trim()) {
      toast.error("Please enter your name and comment");
      return;
    }

    setSubmittingComment(true);
    try {
      const emailToUse = commentEmail || clientEmail || '';
      const commentWithInfo = `[${clientName}${emailToUse ? ` - ${emailToUse}` : ''}]: ${newComment}`;
      
      const { error } = await supabase
        .from("client_comments")
        .insert({
          project_id: projectId,
          user_id: '00000000-0000-0000-0000-000000000000',
          report_type: activeTab,
          comment_text: commentWithInfo,
        });

      if (error) throw error;
      
      toast.success("Comment submitted successfully");
      setNewComment("");
      refetchComments();
    } catch (error: any) {
      toast.error("Failed to submit comment: " + error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleBulkDownload = async () => {
    if (!documents || documents.length === 0) return;

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      const projectName = project?.name || "project";

      toast.info("Preparing download...");

      const downloadPromises = documents
        .filter((doc: any) => doc.file_url)
        .map(async (doc: any) => {
          try {
            const response = await fetch(doc.file_url);
            if (!response.ok) throw new Error(`Failed to fetch ${doc.document_name}`);
            const blob = await response.blob();
            const folder = doc.document_type.replace(/[^a-zA-Z0-9]/g, "_");
            zip.folder(folder)?.file(doc.document_name, blob);
          } catch (error) {
            console.error(`Error downloading ${doc.document_name}:`, error);
          }
        });

      await Promise.all(downloadPromises);

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${projectName}_documents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success("Documents downloaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to download documents");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password required state
  if (passwordRequired && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Password Required</CardTitle>
            <CardDescription>
              This portal is protected. Please enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <Mail className="h-4 w-4" />
                <span>Accessing as: {clientEmail}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
            </div>
            <Button 
              onClick={handlePasswordSubmit} 
              className="w-full"
              disabled={verifyingPassword}
            >
              {verifyingPassword ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Access Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid access state
  if (!projectId || (!isAuthenticated && !passwordRequired)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-center">
              This link is invalid, expired, or you don't have permission to access this project.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading project data
  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading project...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground text-center">
              {projectError?.message || "The requested project could not be found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const documentsWithFiles = documents?.filter((d: any) => d.file_url) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Secure Client Portal</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {project.name}
              </h1>
              {project.client_name && (
                <p className="text-muted-foreground">{project.client_name}</p>
              )}
              {clientEmail && (
                <p className="text-sm text-muted-foreground mt-1">
                  Logged in as: {clientEmail}
                </p>
              )}
              {expiresAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Access expires: {format(new Date(expiresAt), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-sm">
              {project.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview">
              <Building2 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tenant_report">
              <FileText className="h-4 w-4 mr-2" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="generator_report">
              <Zap className="h-4 w-4 mr-2" />
              Generator
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FolderOpen className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{tenants?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Area</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {tenants?.reduce((sum: number, t: any) => sum + (t.area || 0), 0).toLocaleString()} m²
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Load</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{getTotalLoading().toFixed(1)} kW</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">{calculateProgress()}%</div>
                    <Progress value={calculateProgress()} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tenant Report Tab */}
          <TabsContent value="tenant_report">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Tenant Schedule
                </CardTitle>
                <CardDescription>
                  Current status of all tenants in the project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shop #</TableHead>
                        <TableHead>Tenant Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Area (m²)</TableHead>
                        <TableHead>Opening Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants?.map((tenant: any) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                          <TableCell>{tenant.shop_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tenant.shop_category || 'Retail'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{tenant.area?.toLocaleString() || '-'}</TableCell>
                          <TableCell>
                            {tenant.opening_date 
                              ? format(new Date(tenant.opening_date), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(tenant)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generator Report Tab */}
          <TabsContent value="generator_report">
            <div className="space-y-6">
              {zones && zones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Generator Zone Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {zones.map((zone: any) => (
                        <div key={zone.id} className="p-4 rounded-lg border bg-muted/50">
                          <div className="font-medium">{zone.name}</div>
                          <div className="text-2xl font-bold text-primary">
                            {getZoneLoading(zone.id).toFixed(1)} kW
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tenants?.filter((t: any) => t.generator_zone_id === zone.id).length || 0} tenants
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Tenant Loading Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop #</TableHead>
                          <TableHead>Tenant Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Area (m²)</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead className="text-right">Load (kW)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenants?.map((tenant: any) => (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                            <TableCell>{tenant.shop_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{tenant.shop_category || 'Retail'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{tenant.area?.toLocaleString() || '-'}</TableCell>
                            <TableCell>
                              {zones?.find((z: any) => z.id === tenant.generator_zone_id)?.name || '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {getTenantLoading(tenant).toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Project Documents
                    </CardTitle>
                    <CardDescription>
                      Download project documents and reports
                    </CardDescription>
                  </div>
                  {documentsWithFiles.length > 0 && (
                    <Button onClick={handleBulkDownload} disabled={isDownloadingAll}>
                      {isDownloadingAll ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {documentsWithFiles.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No documents available</p>
                ) : (
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documentsWithFiles.map((doc: any) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.document_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{doc.document_type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Comments Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments & Feedback
            </CardTitle>
            <CardDescription>
              Leave comments or feedback for the project team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">Your Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Enter your name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientCommentEmail">Email (optional)</Label>
                <Input
                  id="clientCommentEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={commentEmail || clientEmail || ''}
                  onChange={(e) => setCommentEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment *</Label>
              <Textarea
                id="comment"
                placeholder="Enter your comment or feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
              />
            </div>

            <Button onClick={handleSubmitComment} disabled={submittingComment}>
              {submittingComment ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Comment
            </Button>

            {/* Display existing comments */}
            {comments && comments.length > 0 && (
              <div className="space-y-3 mt-6 pt-6 border-t">
                <h4 className="font-medium">Previous Comments</h4>
                {comments.map((comment: any) => (
                  <div key={comment.id} className={`p-4 rounded-lg border ${comment.is_resolved ? 'bg-muted/50' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{comment.report_type?.replace('_', ' ')}</Badge>
                      {comment.is_resolved && (
                        <Badge className="bg-green-500">Resolved</Badge>
                      )}
                    </div>
                    <p className="text-sm">{comment.comment_text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientView;
