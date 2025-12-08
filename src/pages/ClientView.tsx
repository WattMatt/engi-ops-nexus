import { useState } from "react";
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
  Clock, MessageSquare, Send, PenLine, Download, FolderOpen
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import JSZip from "jszip";

const ClientView = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

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
    enabled: !!projectId,
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
    enabled: !!projectId,
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
    enabled: !!projectId,
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
    enabled: !!projectId,
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
    enabled: !!projectId,
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
      // For public comments, we'll store the client info in the comment text
      const commentWithInfo = `[${clientName}${clientEmail ? ` - ${clientEmail}` : ''}]: ${newComment}`;
      
      const { error } = await supabase
        .from("client_comments")
        .insert({
          project_id: projectId,
          user_id: '00000000-0000-0000-0000-000000000000', // Anonymous user placeholder
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

  if (projectError || !project || !projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground text-center">
              {projectError?.message || "This link is invalid or the project was not found."}
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
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Client Portal
              </h1>
              <p className="text-xl text-muted-foreground">{project.name}</p>
              {project.client_name && (
                <p className="text-muted-foreground">{project.client_name}</p>
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
              {/* Zone Summary */}
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

              {/* Tenant Loading */}
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
                      Available project documents for download
                    </CardDescription>
                  </div>
                  {documentsWithFiles.length > 0 && (
                    <Button onClick={handleBulkDownload} disabled={isDownloadingAll}>
                      {isDownloadingAll ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download All ({documentsWithFiles.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {documents?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents available
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents?.map((doc: any) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {doc.document_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {doc.document_type?.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              {doc.file_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(doc.file_url, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              )}
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

        {/* Comments Section - Always visible */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments & Feedback
            </CardTitle>
            <CardDescription>
              Leave comments or questions about the project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Comment Form */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
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
                  <Label htmlFor="clientEmail">Email (optional)</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
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
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Commenting on: <Badge variant="outline">{activeTab.replace('_', ' ')}</Badge>
                </p>
                <Button onClick={handleSubmitComment} disabled={submittingComment}>
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Comment
                </Button>
              </div>
            </div>

            {/* Previous Comments */}
            {comments && comments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Previous Comments</h4>
                {comments.map((comment: any) => (
                  <div key={comment.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{comment.report_type?.replace('_', ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment_text}</p>
                    {comment.is_resolved && (
                      <Badge className="mt-2 bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
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
