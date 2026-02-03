import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAccess } from "@/hooks/useClientAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, FileText, Download, Loader2, FolderOpen, Search, 
  FileImage, FileSpreadsheet, File, FileArchive, 
  Calendar, Eye, Package, Zap, Cpu, Server, Lightbulb,
  Camera, Shield, ClipboardCheck, FileCheck, Award, BookOpen,
  BadgeCheck, HardDrive, BarChart3, Users, Building2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ClientComments } from "@/components/client-portal/ClientComments";
import { ClientApproval } from "@/components/client-portal/ClientApproval";

// Document categories matching HandoverDocuments page exactly
const DOCUMENT_CATEGORIES = [
  { key: 'overview', label: 'Overview', icon: BarChart3, color: 'text-primary', bgColor: 'bg-primary/10', isOverview: true },
  { key: 'as_built', label: 'As Built', icon: Package, color: 'text-blue-500', bgColor: 'bg-blue-500/10', sourceType: 'tenant' },
  { key: 'generators', label: 'Generators', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10', sourceType: 'tenant' },
  { key: 'transformers', label: 'Transformers', icon: Cpu, color: 'text-purple-500', bgColor: 'bg-purple-500/10', sourceType: 'tenant' },
  { key: 'main_boards', label: 'Main Boards', icon: Server, color: 'text-slate-500', bgColor: 'bg-slate-500/10', sourceType: 'tenant' },
  { key: 'lighting', label: 'Lighting', icon: Lightbulb, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', sourceType: 'tenant' },
  { key: 'cctv_access_control', label: 'CCTV & Access', icon: Camera, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', sourceType: 'tenant' },
  { key: 'lightning_protection', label: 'Lightning Protection', icon: Shield, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', sourceType: 'tenant' },
  // Phase 1: New electrical equipment categories
  { key: 'switchgear', label: 'Switchgear', icon: Server, color: 'text-gray-600', bgColor: 'bg-gray-500/10', sourceType: 'tenant' },
  { key: 'earthing_bonding', label: 'Earthing & Bonding', icon: Shield, color: 'text-lime-600', bgColor: 'bg-lime-500/10', sourceType: 'tenant' },
  { key: 'surge_protection', label: 'Surge Protection', icon: Shield, color: 'text-sky-600', bgColor: 'bg-sky-500/10', sourceType: 'tenant' },
  { key: 'metering', label: 'Metering', icon: BarChart3, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-500/10', sourceType: 'tenant' },
  { key: 'cable_installation', label: 'Cable Installation', icon: Server, color: 'text-stone-600', bgColor: 'bg-stone-500/10', sourceType: 'tenant' },
  { key: 'emergency_systems', label: 'Emergency Systems', icon: Zap, color: 'text-red-600', bgColor: 'bg-red-500/10', sourceType: 'tenant' },
  { key: 'specifications', label: 'Specifications', icon: ClipboardCheck, color: 'text-green-500', bgColor: 'bg-green-500/10', sourceType: 'general' },
  { key: 'test_certificates', label: 'Test Certificates', icon: FileCheck, color: 'text-teal-500', bgColor: 'bg-teal-500/10', sourceType: 'general' },
  { key: 'warranties', label: 'Warranties', icon: Award, color: 'text-orange-500', bgColor: 'bg-orange-500/10', sourceType: 'general' },
  { key: 'manuals', label: 'Manuals', icon: BookOpen, color: 'text-rose-500', bgColor: 'bg-rose-500/10', sourceType: 'general' },
  { key: 'commissioning_docs', label: 'Commissioning', icon: BadgeCheck, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', sourceType: 'general' },
  { key: 'compliance_certs', label: 'Compliance', icon: FileCheck, color: 'text-violet-500', bgColor: 'bg-violet-500/10', sourceType: 'general' },
  // Phase 1: Additional portal categories
  { key: 'protection_settings', label: 'Protection Settings', icon: ClipboardCheck, color: 'text-pink-600', bgColor: 'bg-pink-500/10', sourceType: 'general' },
  { key: 'arc_flash_studies', label: 'Arc Flash Studies', icon: Zap, color: 'text-amber-700', bgColor: 'bg-amber-600/10', sourceType: 'general' },
  { key: 'energy_management', label: 'Energy Management', icon: BarChart3, color: 'text-green-700', bgColor: 'bg-green-600/10', sourceType: 'general' },
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(210, 80%, 55%)',
  'hsl(45, 90%, 50%)',
  'hsl(280, 70%, 55%)',
  'hsl(180, 70%, 45%)',
  'hsl(340, 75%, 55%)',
  'hsl(140, 70%, 45%)',
  'hsl(20, 85%, 55%)',
];

const getFileIcon = (fileName: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp':
      return <FileImage className="h-4 w-4 text-blue-500" />;
    case 'xls': case 'xlsx': case 'csv':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'zip': case 'rar': case '7z':
      return <FileArchive className="h-4 w-4 text-amber-500" />;
    case 'dwg': case 'dxf':
      return <FileImage className="h-4 w-4 text-purple-500" />;
    default: return <File className="h-4 w-4 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export default function ClientDocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { isClient, loading, hasReportAccess, getDocumentTabs } = useClientAccess();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Get allowed tabs for this project
  const allowedTabs = getDocumentTabs(projectId || '');
  
  // Filter categories based on allowed tabs
  const visibleCategories = DOCUMENT_CATEGORIES.filter(cat => allowedTabs.includes(cat.key));

  useEffect(() => {
    if (!loading && (!isClient || !hasReportAccess(projectId || '', 'project_documents', 'view'))) {
      toast.error("Access denied");
      navigate("/client-portal");
    }
  }, [loading, isClient, projectId, hasReportAccess, navigate]);

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name, project_number")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch all handover documents
  const { data: allDocuments = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ["client-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select(`
          *,
          tenants:source_id (
            shop_number,
            shop_name
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!projectId,
  });

  // Fetch tenants count
  const { data: tenantsCount = 0 } = useQuery({
    queryKey: ["client-tenants-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!projectId,
  });

  // Calculate stats and group documents
  const { stats, documentsByCategory, chartData, recentUploads } = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    DOCUMENT_CATEGORIES.forEach(cat => {
      if (!cat.isOverview) groups[cat.key] = [];
    });

    allDocuments.forEach((doc: any) => {
      const docType = doc.document_type || 'other';
      if (groups[docType]) {
        groups[docType].push(doc);
      }
    });

    const totalDocs = allDocuments.length;
    const totalSize = allDocuments.reduce((sum: number, doc: any) => sum + (doc.file_size || 0), 0);
    const latestUpload = allDocuments.length > 0 
      ? new Date(Math.max(...allDocuments.map((d: any) => new Date(d.created_at).getTime())))
      : null;
    const categoriesWithDocs = Object.values(groups).filter(docs => docs.length > 0).length;

    const chart = DOCUMENT_CATEGORIES
      .filter(cat => !cat.isOverview && groups[cat.key]?.length > 0)
      .map(cat => ({
        name: cat.label,
        count: groups[cat.key].length,
        key: cat.key,
      }))
      .sort((a, b) => b.count - a.count);

    const recent = [...allDocuments].slice(0, 10);

    return {
      stats: { totalDocs, totalSize, latestUpload, categoriesWithDocs },
      documentsByCategory: groups,
      chartData: chart,
      recentUploads: recent,
    };
  }, [allDocuments]);

  // Get filtered documents for active category
  const getFilteredDocuments = (categoryKey: string) => {
    const docs = documentsByCategory[categoryKey] || [];
    if (!searchQuery) return docs;
    
    const query = searchQuery.toLowerCase();
    return docs.filter((doc: any) => 
      doc.document_name?.toLowerCase().includes(query) ||
      doc.notes?.toLowerCase().includes(query) ||
      doc.tenants?.shop_number?.toLowerCase().includes(query) ||
      doc.tenants?.shop_name?.toLowerCase().includes(query)
    );
  };

  const handleDownload = async (doc: any) => {
    if (!doc.file_url) {
      toast.error("No file available for download");
      return;
    }

    setDownloadingId(doc.id);
    try {
      const link = document.createElement("a");
      link.href = doc.file_url;
      link.download = doc.document_name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${doc.document_name}`);
    } catch (error) {
      toast.error("Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = (doc: any) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  const canComment = hasReportAccess(projectId || '', 'project_documents', 'comment');
  const canApprove = hasReportAccess(projectId || '', 'project_documents', 'approve');

  if (loading || isLoadingDocs) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  // Render overview content
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <p className="text-xs text-muted-foreground">in handover package</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-500" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesWithDocs}</div>
            <p className="text-xs text-muted-foreground">with documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-green-500" />
              Total Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            <p className="text-xs text-muted-foreground">combined size</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.latestUpload ? format(stats.latestUpload, 'MMM d') : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.latestUpload ? format(stats.latestUpload, 'yyyy') : 'No uploads'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Index */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Document Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Distribution</CardTitle>
            <CardDescription>Documents by category</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No documents available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Index */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Index</CardTitle>
            <CardDescription>Click a category to view documents</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {visibleCategories.filter(c => !c.isOverview).map((cat) => {
                  const count = documentsByCategory[cat.key]?.length || 0;
                  const IconComponent = cat.icon;
                  const completion = cat.sourceType === 'tenant' && tenantsCount > 0 
                    ? Math.round((count / tenantsCount) * 100)
                    : null;
                  
                  return (
                    <div
                      key={cat.key}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                      onClick={() => setActiveTab(cat.key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${cat.bgColor}`}>
                          <IconComponent className={`h-4 w-4 ${cat.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{cat.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {cat.sourceType === 'tenant' ? 'Per tenant' : 'General'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {completion !== null && (
                          <div className="text-right">
                            <div className="w-16">
                              <Progress value={completion} className="h-1.5" />
                            </div>
                            <p className="text-xs text-muted-foreground">{completion}%</p>
                          </div>
                        )}
                        <Badge variant={count > 0 ? "default" : "secondary"}>
                          {count}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Uploads</CardTitle>
          <CardDescription>Latest documents added to the handover package</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUploads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUploads.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.document_name)}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[250px]">{doc.document_name}</p>
                          {doc.tenants && (
                            <p className="text-xs text-muted-foreground">
                              {doc.tenants.shop_number} - {doc.tenants.shop_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No documents uploaded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render category content
  const renderCategoryContent = (categoryKey: string, category: typeof DOCUMENT_CATEGORIES[0]) => {
    const docs = getFilteredDocuments(categoryKey);
    const totalInCategory = documentsByCategory[categoryKey]?.length || 0;
    const completionPercent = tenantsCount > 0 && category.sourceType === 'tenant' 
      ? Math.round((totalInCategory / tenantsCount) * 100)
      : null;

    return (
      <div className="space-y-4">
        {/* Category Header Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInCategory}</div>
              <p className="text-xs text-muted-foreground">in this category</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-blue-500" />
                Total Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(docs.reduce((sum: number, d: any) => sum + (d.file_size || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground">combined size</p>
            </CardContent>
          </Card>

          {category.sourceType === 'tenant' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionPercent}%</div>
                <Progress value={completionPercent || 0} className="h-2 mt-1" />
                <p className="text-xs text-muted-foreground mt-1">{totalInCategory} of {tenantsCount} tenants</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Documents Table */}
        {docs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No documents match your search' : 'No documents in this category yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Document</TableHead>
                  {category.sourceType === 'tenant' && <TableHead>Tenant</TableHead>}
                  <TableHead>Size</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc: any) => (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.document_name)}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[250px]">{doc.document_name}</p>
                          {doc.notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[250px]">{doc.notes}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {category.sourceType === 'tenant' && (
                      <TableCell>
                        {doc.tenants ? (
                          <div className="text-sm">
                            <span className="font-medium">{doc.tenants.shop_number}</span>
                            {doc.tenants.shop_name && (
                              <span className="text-muted-foreground ml-1">- {doc.tenants.shop_name}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/client-portal")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Project Documents
                </h1>
                <p className="text-sm text-muted-foreground">
                  {project?.name || 'Loading...'} {project?.project_number && `(${project.project_number})`}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {stats.totalDocs} Documents
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="flex w-max gap-1 p-1">
              {visibleCategories.slice(0, 8).map((cat) => {
                const count = cat.isOverview ? stats.totalDocs : (documentsByCategory[cat.key]?.length || 0);
                const IconComponent = cat.icon;
                return (
                  <TabsTrigger key={cat.key} value={cat.key} className="gap-1.5 text-xs px-3">
                    <IconComponent className={`h-4 w-4 ${cat.color}`} />
                    <span className="hidden sm:inline">{cat.label}</span>
                    {!cat.isOverview && count > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4">{count}</Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>
          
          {/* Second row of tabs - only show if there are more than 8 visible categories */}
          {visibleCategories.length > 8 && (
            <ScrollArea className="w-full mt-1">
              <TabsList className="flex w-max gap-1 p-1">
                {visibleCategories.slice(8).map((cat) => {
                  const count = documentsByCategory[cat.key]?.length || 0;
                  const IconComponent = cat.icon;
                  return (
                    <TabsTrigger key={cat.key} value={cat.key} className="gap-1.5 text-xs px-3">
                      <IconComponent className={`h-4 w-4 ${cat.color}`} />
                      <span className="hidden sm:inline">{cat.label}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4">{count}</Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>
          )}

          {/* Tab Content */}
          <TabsContent value="overview" className="mt-4">
            {renderOverview()}
          </TabsContent>

          {visibleCategories.filter(c => !c.isOverview).map((cat) => (
            <TabsContent key={cat.key} value={cat.key} className="mt-4">
              {renderCategoryContent(cat.key, cat)}
            </TabsContent>
          ))}
        </Tabs>

        {/* Client Comments & Approval */}
        {projectId && (canComment || canApprove) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {canComment && (
              <ClientComments projectId={projectId} reportType="project_documents" canComment={canComment} />
            )}
            {canApprove && (
              <ClientApproval projectId={projectId} reportType="project_documents" canApprove={canApprove} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
