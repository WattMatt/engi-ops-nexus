import { useState, useEffect, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, FileText, Zap, Loader2, AlertCircle, CheckCircle, 
  Clock, MessageSquare, Send, Download, FolderOpen, Shield, Lock, Mail,
  LayoutDashboard, Users, BarChart3, CheckCircle2, XCircle, Calendar,
  MapPin, TrendingUp, Activity, Package, Lightbulb, CircuitBoard
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import JSZip from "jszip";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";

interface TokenValidation {
  is_valid: boolean;
  project_id: string | null;
  email: string | null;
  expires_at: string | null;
}

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#6366f1', '#8b5cf6'];

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
  const [activeTab, setActiveTab] = useState("dashboard");
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
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Project not found");
      return data;
    },
    enabled: !!projectId && isAuthenticated,
    retry: false,
  });

  // Fetch tenants with all details
  const { data: tenants } = useQuery({
    queryKey: ["client-view-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId)
        .order("shop_number");
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isAuthenticated,
  });

  // Fetch generator zones
  const { data: zones } = useQuery({
    queryKey: ["client-view-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && isAuthenticated,
  });

  // Fetch generator settings
  const { data: generatorSettings } = useQuery({
    queryKey: ["client-view-generator-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
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

  // Fetch client comments
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

  // Helper functions
  const isComplete = (tenant: any) => {
    return tenant.layout_received && tenant.sow_received && tenant.db_ordered && tenant.lighting_ordered;
  };

  const getDeliverableStatus = (received: boolean) => {
    return received ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-muted-foreground/50" />
    );
  };

  const getStatusBadge = (tenant: any) => {
    if (isComplete(tenant)) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
    }
    if (tenant.layout_received || tenant.sow_received) {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const calculateProgress = () => {
    if (!tenants?.length) return 0;
    const completed = tenants.filter((t: any) => isComplete(t)).length;
    return Math.round((completed / tenants.length) * 100);
  };

  const getTenantLoading = (tenant: any) => {
    if (tenant.own_generator_provided) return 0;
    if (tenant.manual_kw_override !== null && tenant.manual_kw_override !== undefined) {
      return Number(tenant.manual_kw_override);
    }
    if (!tenant.area) return 0;
    
    const kwPerSqm = {
      standard: generatorSettings?.standard_kw_per_sqm || 0.03,
      fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
      restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
      national: generatorSettings?.national_kw_per_sqm || 0.03,
    };
    
    const category = tenant.shop_category?.toLowerCase() || 'standard';
    const rate = kwPerSqm[category as keyof typeof kwPerSqm] || kwPerSqm.standard;
    return tenant.area * rate;
  };

  const getTotalLoading = () => {
    return tenants?.reduce((sum: number, t: any) => sum + getTenantLoading(t), 0) || 0;
  };

  const getZoneLoading = (zoneId: string) => {
    const zoneTenants = tenants?.filter((t: any) => t.generator_zone_id === zoneId) || [];
    return zoneTenants.reduce((sum: number, t: any) => sum + getTenantLoading(t), 0);
  };

  // Analytics data
  const categoryStats = tenants?.reduce((acc: any, t: any) => {
    const cat = t.shop_category || 'Retail';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {}) || {};

  const categoryChartData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));

  const statusStats = {
    complete: tenants?.filter((t: any) => isComplete(t)).length || 0,
    inProgress: tenants?.filter((t: any) => !isComplete(t) && (t.layout_received || t.sow_received)).length || 0,
    pending: tenants?.filter((t: any) => !t.layout_received && !t.sow_received).length || 0
  };

  const statusChartData = [
    { name: 'Complete', value: statusStats.complete, color: '#22c55e' },
    { name: 'In Progress', value: statusStats.inProgress, color: '#eab308' },
    { name: 'Pending', value: statusStats.pending, color: '#94a3b8' }
  ];

  const deliverableStats = {
    layout: tenants?.filter((t: any) => t.layout_received).length || 0,
    sow: tenants?.filter((t: any) => t.sow_received).length || 0,
    db: tenants?.filter((t: any) => t.db_ordered).length || 0,
    lighting: tenants?.filter((t: any) => t.lighting_ordered).length || 0
  };

  const deliverableChartData = [
    { name: 'Layout', received: deliverableStats.layout, pending: (tenants?.length || 0) - deliverableStats.layout },
    { name: 'SOW', received: deliverableStats.sow, pending: (tenants?.length || 0) - deliverableStats.sow },
    { name: 'DB Ordered', received: deliverableStats.db, pending: (tenants?.length || 0) - deliverableStats.db },
    { name: 'Lighting', received: deliverableStats.lighting, pending: (tenants?.length || 0) - deliverableStats.lighting }
  ];

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary/20" />
            </div>
            <p className="text-muted-foreground mt-4">Validating access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password required state
  if (passwordRequired && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Password Required</CardTitle>
            <CardDescription>
              This portal is protected. Please enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
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
                className="h-12"
              />
            </div>
            <Button 
              onClick={handlePasswordSubmit} 
              className="w-full h-12"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md border-0 shadow-xl">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md border-0 shadow-xl">
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
  const totalArea = tenants?.reduce((sum: number, t: any) => sum + (t.area || 0), 0) || 0;
  const avgLoadPerTenant = tenants?.length ? getTotalLoading() / tenants.length : 0;
  const tabComments = comments?.filter((c: any) => c.report_type === activeTab) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-sm text-green-600 font-medium">Secure Client Portal</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {project.client_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {project.client_name}
                  </span>
                )}
                {project.project_number && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {project.project_number}
                  </span>
                )}
                {clientEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {clientEmail}
                  </span>
                )}
              </div>
              {expiresAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Access expires: {format(new Date(expiresAt), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
            <Badge 
              variant={project.status === 'active' ? 'default' : 'secondary'} 
              className="text-sm px-4 py-1"
            >
              {project.status}
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl bg-card border">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="tenants" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Tenants</span>
            </TabsTrigger>
            <TabsTrigger value="generator" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Generator</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedback</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Total Tenants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">{tenants?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    Total Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-emerald-600">{totalArea.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Square meters (m²)</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Total Load
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-amber-600">{getTotalLoading().toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Kilowatts (kW)</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md bg-gradient-to-br from-violet-500/10 to-violet-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-violet-500" />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-violet-600">{calculateProgress()}%</div>
                  <Progress value={calculateProgress()} className="h-2 mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Status Distribution */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Tenant Status Overview
                  </CardTitle>
                  <CardDescription>Current status of all tenant information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around">
                    <div className="w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {statusChartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                          <span className="font-bold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deliverables Progress */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Deliverables Tracking
                  </CardTitle>
                  <CardDescription>Status of required documentation per tenant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deliverableChartData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="received" stackId="a" fill="#22c55e" name="Received" />
                        <Bar dataKey="pending" stackId="a" fill="#e2e8f0" name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown & Zone Summary */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Category Breakdown */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Tenant Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryChartData.map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <Badge variant="secondary">{cat.value as number} tenants</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Zone Summary */}
              {zones && zones.length > 0 && (
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Generator Zones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {zones.map((zone: any) => {
                        const zoneLoad = getZoneLoading(zone.id);
                        const zoneTenantCount = tenants?.filter((t: any) => t.generator_zone_id === zone.id).length || 0;
                        return (
                          <div key={zone.id} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{zone.zone_name}</span>
                              <Badge className="bg-primary/10 text-primary">{zoneLoad.toFixed(1)} kW</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {zone.num_generators}x {zone.generator_size} • {zoneTenantCount} tenants
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statusStats.complete}</p>
                      <p className="text-xs text-muted-foreground">Complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statusStats.inProgress}</p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statusStats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalArea.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total m²</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tenant Schedule Table */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Complete Tenant Schedule
                </CardTitle>
                <CardDescription>
                  All tenant details with deliverable tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="rounded-md border min-w-[900px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-20">Shop #</TableHead>
                          <TableHead>Tenant Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Area (m²)</TableHead>
                          <TableHead>Opening Date</TableHead>
                          <TableHead className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <FileText className="h-3 w-3" /> Layout
                            </div>
                          </TableHead>
                          <TableHead className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <FileText className="h-3 w-3" /> SOW
                            </div>
                          </TableHead>
                          <TableHead className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <CircuitBoard className="h-3 w-3" /> DB
                            </div>
                          </TableHead>
                          <TableHead className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Lightbulb className="h-3 w-3" /> Lighting
                            </div>
                          </TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortTenantsByShopNumber(tenants || []).map((tenant: any) => (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-mono font-medium">{tenant.shop_number}</TableCell>
                            <TableCell className="font-medium">{tenant.shop_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{tenant.shop_category || 'Retail'}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{tenant.area?.toLocaleString() || '-'}</TableCell>
                            <TableCell>
                              {tenant.opening_date ? (
                                <span className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(tenant.opening_date), 'MMM d, yyyy')}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">{getDeliverableStatus(tenant.layout_received)}</TableCell>
                            <TableCell className="text-center">{getDeliverableStatus(tenant.sow_received)}</TableCell>
                            <TableCell className="text-center">{getDeliverableStatus(tenant.db_ordered)}</TableCell>
                            <TableCell className="text-center">{getDeliverableStatus(tenant.lighting_ordered)}</TableCell>
                            <TableCell>{getStatusBadge(tenant)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generator Tab */}
          <TabsContent value="generator" className="space-y-6">
            {/* Generator KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{getTotalLoading().toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Total kW</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{avgLoadPerTenant.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Avg kW/tenant</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{zones?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Zones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {totalArea > 0 ? (getTotalLoading() / totalArea * 1000).toFixed(2) : '0'}
                      </p>
                      <p className="text-xs text-muted-foreground">W/m²</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Zone Summary Cards */}
            {zones && zones.length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Generator Zone Summary
                  </CardTitle>
                  <CardDescription>Detailed breakdown by generator zone</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {zones.map((zone: any) => {
                      const zoneLoad = getZoneLoading(zone.id);
                      const zoneTenants = tenants?.filter((t: any) => t.generator_zone_id === zone.id) || [];
                      const zoneArea = zoneTenants.reduce((sum: number, t: any) => sum + (t.area || 0), 0);
                      return (
                        <Card key={zone.id} className="border bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold">{zone.zone_name}</h3>
                              <Badge variant="outline">{zone.zone_number}</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Generator</span>
                                <span className="font-medium">{zone.num_generators}x {zone.generator_size}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tenants</span>
                                <span className="font-medium">{zoneTenants.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Area</span>
                                <span className="font-medium">{zoneArea.toLocaleString()} m²</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t">
                                <span className="text-muted-foreground font-medium">Total Load</span>
                                <span className="font-bold text-amber-600">{zoneLoad.toFixed(1)} kW</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tenant Loading Table */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Tenant Loading Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="rounded-md border min-w-[700px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-20">Shop #</TableHead>
                          <TableHead>Tenant Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Area (m²)</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead className="text-right">Load (kW)</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortTenantsByShopNumber(tenants || []).map((tenant: any) => (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-mono font-medium">{tenant.shop_number}</TableCell>
                            <TableCell className="font-medium">{tenant.shop_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{tenant.shop_category || 'Retail'}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{tenant.area?.toLocaleString() || '-'}</TableCell>
                            <TableCell>
                              {zones?.find((z: any) => z.id === tenant.generator_zone_id)?.zone_name || '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-600">
                              {getTenantLoading(tenant).toFixed(1)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={tenant.manual_kw_override ? "default" : "secondary"} className="text-xs">
                                {tenant.manual_kw_override ? 'Manual' : 'Calculated'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Project Documents
                    </CardTitle>
                    <CardDescription>
                      {documentsWithFiles.length} document{documentsWithFiles.length !== 1 ? 's' : ''} available for download
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
                  <div className="text-center py-12">
                    <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No documents available yet</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Document Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="w-20"></TableHead>
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

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Submit Comment */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Submit Feedback
                  </CardTitle>
                  <CardDescription>
                    Share your comments, questions, or feedback with the project team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
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
                    <Label htmlFor="comment">Your Feedback *</Label>
                    <Textarea
                      id="comment"
                      placeholder="Enter your comment, question, or feedback..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={5}
                    />
                  </div>

                  <Button onClick={handleSubmitComment} disabled={submittingComment} className="w-full">
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Feedback
                  </Button>
                </CardContent>
              </Card>

              {/* Previous Comments */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Feedback History
                  </CardTitle>
                  <CardDescription>
                    {comments?.length || 0} total comment{(comments?.length || 0) !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!comments || comments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No comments yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {comments.map((comment: any) => (
                          <div 
                            key={comment.id} 
                            className={`p-4 rounded-lg border ${comment.is_resolved ? 'bg-green-50/50 border-green-200' : 'bg-muted/30'}`}
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {comment.report_type?.replace('_', ' ') || 'General'}
                              </Badge>
                              {comment.is_resolved && (
                                <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolved
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{comment.comment_text}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientView;
