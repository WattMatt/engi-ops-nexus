import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DrawingPreviewDialog } from "@/components/drawings/DrawingPreviewDialog";
import { 
  CheckCircle2, Clock, AlertCircle, FileText, Download, Eye, Search,
  File, FileImage, Folder, LayoutDashboard, Users,
  ChevronDown, ChevronRight, History, ArrowUpDown, ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { ContractorHandoverDocuments } from "./ContractorHandoverDocuments";
import { format } from "date-fns";

interface ContractorDocumentStatusProps {
  projectId: string;
  documentCategories: string[];
}

interface Drawing {
  id: string;
  drawing_number: string;
  drawing_title: string;
  category: string | null;
  subcategory: string | null;
  shop_number: string | null;
  file_url: string | null;
  file_size: number | null;
  current_revision: string | null;
  revision_date: string | null;
  revision_notes: string | null;
  status: string | null;
  issue_date: string | null;
  created_at: string;
}

interface DrawingRevision {
  id: string;
  drawing_id: string;
  revision: string;
  revision_date: string | null;
  revision_notes: string | null;
  file_url: string | null;
  file_size: number | null;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon?: string }> = {
  power: { label: 'Power Distribution', color: 'bg-amber-500' },
  lighting: { label: 'Lighting', color: 'bg-yellow-500' },
  schematic: { label: 'Schematics', color: 'bg-blue-500' },
  hvac: { label: 'HVAC Controls', color: 'bg-cyan-500' },
  cctv: { label: 'CCTV & Security', color: 'bg-purple-500' },
  site: { label: 'Site Services', color: 'bg-green-500' },
  signage: { label: 'Signage', color: 'bg-pink-500' },
  tenant: { label: 'Tenant Drawings', color: 'bg-slate-500' },
  other: { label: 'Other', color: 'bg-muted-foreground' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-500' },
  for_review: { label: 'For Review', color: 'bg-amber-500' },
  for_construction: { label: 'For Construction', color: 'bg-blue-500' },
  ifc: { label: 'IFC', color: 'bg-green-500' },
  as_built: { label: 'As Built', color: 'bg-emerald-600' },
  superseded: { label: 'Superseded', color: 'bg-red-500' },
};

type SortField = 'drawing_number' | 'drawing_title' | 'current_revision' | 'revision_date';
type SortDirection = 'asc' | 'desc';

export function ContractorDocumentStatus({ projectId, documentCategories }: ContractorDocumentStatusProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; fileName: string } | null>(null);
  const [expandedDrawings, setExpandedDrawings] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('drawing_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch tenant data

  const handlePreviewDrawing = (drawing: Drawing) => {
    if (drawing.file_url) {
      setPreviewDoc({
        url: drawing.file_url,
        title: `${drawing.drawing_number} — ${drawing.drawing_title}`,
        fileName: `${drawing.drawing_number}.pdf`
      });
    }
  };

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['contractor-tenants', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, shop_number, name, sow_received, layout_received, lighting_ordered, db_ordered, status')
        .eq('project_id', projectId)
        .order('shop_number');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch project drawings (electrical only, visible_to_contractor=true)
  const { data: drawings, isLoading: drawingsLoading } = useQuery({
    queryKey: ['contractor-project-drawings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_drawings')
        .select('*')
        .eq('project_id', projectId)
        .eq('visible_to_contractor', true)
        .order('category')
        .order('drawing_number');
      
      if (error) throw error;
      return (data || []) as Drawing[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch revision history for all drawings
  const { data: revisions } = useQuery({
    queryKey: ['contractor-drawing-revisions', projectId],
    queryFn: async () => {
      if (!drawings || drawings.length === 0) return [];
      
      const drawingIds = drawings.map(d => d.id);
      const { data, error } = await supabase
        .from('drawing_revisions')
        .select('*')
        .in('drawing_id', drawingIds)
        .order('revision_date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DrawingRevision[];
    },
    enabled: !!drawings && drawings.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Group revisions by drawing
  const revisionsByDrawing = useMemo(() => {
    const map = new Map<string, DrawingRevision[]>();
    revisions?.forEach(rev => {
      const existing = map.get(rev.drawing_id) || [];
      existing.push(rev);
      map.set(rev.drawing_id, existing);
    });
    return map;
  }, [revisions]);

  // Get unique categories
  const availableCategories = useMemo(() => {
    const cats = [...new Set(drawings?.map(d => d.category || 'other') || [])];
    return cats.sort((a, b) => {
      const aLabel = CATEGORY_CONFIG[a]?.label || a;
      const bLabel = CATEGORY_CONFIG[b]?.label || b;
      return aLabel.localeCompare(bLabel);
    });
  }, [drawings]);

  // Filter and sort drawings
  const filteredDrawings = useMemo(() => {
    let filtered = drawings || [];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => (d.category || 'other') === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.drawing_number?.toLowerCase().includes(query) ||
        d.drawing_title?.toLowerCase().includes(query) ||
        d.shop_number?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (sortField === 'revision_date') {
        aVal = a.revision_date || a.created_at;
        bVal = b.revision_date || b.created_at;
      }
      
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [drawings, selectedCategory, searchTerm, sortField, sortDirection]);

  // Group drawings by category for summary
  const drawingsByCategory = useMemo(() => {
    const map = new Map<string, Drawing[]>();
    drawings?.forEach(d => {
      const cat = d.category || 'other';
      const existing = map.get(cat) || [];
      existing.push(d);
      map.set(cat, existing);
    });
    return map;
  }, [drawings]);

  const isLoading = tenantsLoading || drawingsLoading;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleExpanded = (drawingId: string) => {
    setExpandedDrawings(prev => {
      const next = new Set(prev);
      if (next.has(drawingId)) {
        next.delete(drawingId);
      } else {
        next.add(drawingId);
      }
      return next;
    });
  };

  const handleDownload = async (url: string | null, name: string) => {
    if (!url) {
      toast.error("No file available for download");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = name || 'document';
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string | null) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="h-4 w-4 text-primary" />;
    }
    if (ext === 'pdf') {
      return <FileText className="h-4 w-4 text-destructive" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate tenant documentation stats
  const tenantStats = tenants?.reduce((acc, tenant: any) => {
    const fields = ['sow_received', 'layout_received', 'lighting_ordered', 'db_ordered'];
    const completed = fields.filter(f => tenant[f]).length;
    acc.totalFields += fields.length;
    acc.completedFields += completed;
    if (completed === fields.length) acc.fullComplete++;
    return acc;
  }, { totalFields: 0, completedFields: 0, fullComplete: 0 }) || { totalFields: 0, completedFields: 0, fullComplete: 0 };

  const overallProgress = tenantStats.totalFields > 0 
    ? Math.round((tenantStats.completedFields / tenantStats.totalFields) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Drawing Register</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation Overview
              </CardTitle>
              <CardDescription>Current status of project documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tenant Documentation</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{tenants?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Tenants</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold text-primary">{tenantStats.fullComplete}</p>
                    <p className="text-xs text-muted-foreground">Fully Documented</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{drawings?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Drawings</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drawings by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Drawings by Discipline</CardTitle>
              <CardDescription>Electrical drawing register breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {availableCategories.map(cat => {
                  const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                  const count = drawingsByCategory.get(cat)?.length || 0;
                  return (
                    <Button
                      key={cat}
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center justify-center"
                      onClick={() => {
                        setActiveTab("documents");
                        setSelectedCategory(cat);
                      }}
                    >
                      <span className="text-lg font-bold">{count}</span>
                      <span className="text-xs text-muted-foreground text-center">{config.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Drawing Updates</CardTitle>
              <CardDescription>Latest revisions and uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {drawings?.slice(0, 5).map((drawing) => {
                  const catConfig = CATEGORY_CONFIG[drawing.category || 'other'] || CATEGORY_CONFIG.other;
                  return (
                    <div 
                      key={drawing.id} 
                      className="p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveTab("documents");
                        handlePreviewDrawing(drawing);
                      }}
                    >
                      {getFileIcon(drawing.file_url)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{drawing.drawing_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{drawing.drawing_title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {drawing.current_revision && (
                          <Badge variant="secondary" className="text-xs">
                            Rev {drawing.current_revision}
                          </Badge>
                        )}
                        <Badge className={`text-white text-xs ${catConfig.color}`}>
                          {catConfig.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {(!drawings || drawings.length === 0) && (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No drawings available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drawing Register Tab - Full Register View */}
        <TabsContent value="register" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Drawing Register
              </CardTitle>
              <CardDescription>
                Complete electrical drawing register grouped by discipline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drawings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-2xl font-bold">{drawings?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Drawings</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {drawings?.filter(d => d.status === 'as_built').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">As Built</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-2xl font-bold text-primary">
                    {drawings?.filter(d => d.status === 'for_construction' || d.status === 'ifc').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">For Construction</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-2xl font-bold">{availableCategories.length}</p>
                  <p className="text-xs text-muted-foreground">Disciplines</p>
                </div>
              </div>

              {/* Grouped by Category */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {availableCategories.map(category => {
                    const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                    const categoryDrawings = (drawingsByCategory.get(category) || [])
                      .filter(d => {
                        if (!searchTerm) return true;
                        const query = searchTerm.toLowerCase();
                        return d.drawing_number?.toLowerCase().includes(query) ||
                               d.drawing_title?.toLowerCase().includes(query);
                      })
                      .sort((a, b) => a.drawing_number.localeCompare(b.drawing_number, undefined, { numeric: true }));
                    
                    if (categoryDrawings.length === 0) return null;

                    return (
                      <Collapsible key={category} defaultOpen>
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${categoryConfig.color}`} />
                                  {categoryConfig.label}
                                  <Badge variant="secondary" className="ml-2">
                                    {categoryDrawings.length}
                                  </Badge>
                                </CardTitle>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[140px]">Drawing No.</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="w-[70px]">Rev</TableHead>
                                    <TableHead className="w-[90px]">Date</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {categoryDrawings.map(drawing => {
                                    const statusConfig = STATUS_CONFIG[drawing.status || 'draft'] || STATUS_CONFIG.draft;
                                    return (
                                      <TableRow key={drawing.id}>
                                        <TableCell className="font-mono text-sm">
                                          {drawing.drawing_number}
                                        </TableCell>
                                        <TableCell>
                                          <div>
                                            <p className="truncate max-w-[200px]">{drawing.drawing_title}</p>
                                            {drawing.shop_number && (
                                              <p className="text-xs text-muted-foreground">{drawing.shop_number}</p>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="font-mono">
                                            {drawing.current_revision || '-'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {drawing.revision_date 
                                            ? format(new Date(drawing.revision_date), 'dd MMM yy')
                                            : '-'}
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={`text-white text-xs ${statusConfig.color}`}>
                                            {statusConfig.label}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                            onClick={() => handlePreviewDrawing(drawing)}
                                              disabled={!drawing.file_url}
                                            >
                                              <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleDownload(drawing.file_url, drawing.drawing_number)}
                                              disabled={!drawing.file_url}
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}

                  {drawings?.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground border rounded-lg">
                      <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No drawings in register</p>
                      <p className="text-sm">Drawings will appear here when made visible to contractors</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Documentation Status</CardTitle>
              <CardDescription>Track documentation progress by tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {tenants?.map((tenant: any) => {
                  const docStatus = [
                    { label: 'SOW', done: tenant.sow_received },
                    { label: 'Layout', done: tenant.layout_received },
                    { label: 'Lighting', done: tenant.lighting_ordered },
                    { label: 'DB', done: tenant.db_ordered }
                  ];
                  
                  return (
                    <div key={tenant.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{tenant.shop_number}</p>
                        <p className="text-sm text-muted-foreground">{tenant.name || 'Unassigned'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {docStatus.map((doc, i) => (
                          <Badge key={i} variant={doc.done ? "default" : "secondary"}>
                            {doc.done ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            {doc.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {(!tenants || tenants.length === 0) && (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tenant data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab - Handover/Project Documents */}
        <TabsContent value="documents" className="space-y-6 mt-6">
          <ContractorHandoverDocuments projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Document Preview Dialog */}
      <DrawingPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        fileUrl={previewDoc?.url || null}
        fileName={previewDoc?.fileName}
        title={previewDoc?.title}
      />
    </div>
  );
}
