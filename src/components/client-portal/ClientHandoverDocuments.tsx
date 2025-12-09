import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, Download, Loader2, FolderOpen, Search, 
  FileImage, FileSpreadsheet, File, FileArchive, 
  Calendar, Eye, Package, Zap, Cpu, Server, Lightbulb,
  Camera, Shield, ClipboardCheck, FileCheck, Award, BookOpen,
  BadgeCheck, HardDrive, BarChart3, Clock, Users
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ClientHandoverDocumentsProps {
  projectId: string;
  projectName?: string;
  isDownloadingAll: boolean;
  onBulkDownload: () => void;
}

// Document categories matching HandoverDocuments page exactly
const DOCUMENT_CATEGORIES = [
  { key: 'overview', label: 'Overview', icon: BarChart3, color: 'text-primary', isOverview: true },
  { key: 'as_built', label: 'As Built', icon: Package, color: 'text-blue-500', sourceType: 'tenant' },
  { key: 'generators', label: 'Generators', icon: Zap, color: 'text-amber-500', sourceType: 'tenant' },
  { key: 'transformers', label: 'Transformers', icon: Cpu, color: 'text-purple-500', sourceType: 'tenant' },
  { key: 'main_boards', label: 'Main Boards', icon: Server, color: 'text-slate-500', sourceType: 'tenant' },
  { key: 'lighting', label: 'Lighting', icon: Lightbulb, color: 'text-yellow-500', sourceType: 'tenant' },
  { key: 'cctv_access_control', label: 'CCTV & Access', icon: Camera, color: 'text-cyan-500', sourceType: 'tenant' },
  { key: 'lightning_protection', label: 'Lightning', icon: Shield, color: 'text-indigo-500', sourceType: 'tenant' },
  { key: 'specifications', label: 'Specifications', icon: ClipboardCheck, color: 'text-green-500', sourceType: 'general' },
  { key: 'test_certificates', label: 'Test Certificates', icon: FileCheck, color: 'text-teal-500', sourceType: 'general' },
  { key: 'warranties', label: 'Warranties', icon: Award, color: 'text-orange-500', sourceType: 'general' },
  { key: 'manuals', label: 'Manuals', icon: BookOpen, color: 'text-rose-500', sourceType: 'general' },
  { key: 'commissioning_docs', label: 'Commissioning', icon: BadgeCheck, color: 'text-emerald-500', sourceType: 'general' },
  { key: 'compliance_certs', label: 'Compliance', icon: FileCheck, color: 'text-violet-500', sourceType: 'general' },
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

export const ClientHandoverDocuments = ({ 
  projectId,
  projectName,
  isDownloadingAll, 
  onBulkDownload 
}: ClientHandoverDocumentsProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch all handover documents
  const { data: allDocuments = [], isLoading } = useQuery({
    queryKey: ["client-handover-all-documents", projectId],
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
    queryKey: ["client-handover-tenants-count", projectId],
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
  const { stats, documentsByCategory, chartData, recentUploads } = useMemo(() => {
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
      }))
      .sort((a, b) => b.count - a.count);

    const recent = [...allDocuments].slice(0, 5);

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

  // Render document table for a category
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
          <Card className="border-0 shadow-sm">
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

          <Card className="border-0 shadow-sm">
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
            <Card className="border-0 shadow-sm">
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
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No documents in this category</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm overflow-hidden">
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Handover Documents
          </h2>
          <p className="text-muted-foreground">
            Complete document repository for {projectName || 'this project'}
          </p>
        </div>
        <Button onClick={onBulkDownload} disabled={isDownloadingAll || stats.totalDocs === 0} size="lg">
          {isDownloadingAll ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download All ({stats.totalDocs})
        </Button>
      </div>

      {/* Tabs - Always show all categories like main handover page */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
          {DOCUMENT_CATEGORIES.slice(0, 8).map((cat) => {
            const count = cat.isOverview ? stats.totalDocs : (documentsByCategory[cat.key]?.length || 0);
            const IconComponent = cat.icon;
            return (
              <TabsTrigger key={cat.key} value={cat.key} className="text-xs gap-1 py-2">
                <IconComponent className={`h-4 w-4 ${cat.color}`} />
                <span className="hidden lg:inline">{cat.label}</span>
                {!cat.isOverview && count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 hidden sm:inline-flex">{count}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {/* Second row of tabs for remaining categories */}
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto mt-1">
          {DOCUMENT_CATEGORIES.slice(8).map((cat) => {
            const count = documentsByCategory[cat.key]?.length || 0;
            const IconComponent = cat.icon;
            return (
              <TabsTrigger key={cat.key} value={cat.key} className="text-xs gap-1 py-2">
                <IconComponent className={`h-4 w-4 ${cat.color}`} />
                <span className="hidden lg:inline">{cat.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 hidden sm:inline-flex">{count}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Total Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalDocs}</div>
                <p className="text-xs text-muted-foreground">Available for download</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-500" />
                  Total Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatFileSize(stats.totalSize)}</div>
                <p className="text-xs text-muted-foreground">Combined file size</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-green-500" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.categoriesWithDocs}</div>
                <p className="text-xs text-muted-foreground">Document types available</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Latest Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {stats.latestUpload ? format(stats.latestUpload, 'MMM d, yyyy') : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Most recent document</p>
              </CardContent>
            </Card>
          </div>

          {stats.totalDocs === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Documents Available</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Project handover documents will appear here once they are uploaded by the project team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Document Distribution Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Document Distribution
                  </CardTitle>
                  <CardDescription>Documents by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Uploads */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Uploads
                  </CardTitle>
                  <CardDescription>Latest documents added</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentUploads.length > 0 ? (
                    <div className="space-y-3">
                      {recentUploads.map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                          {getFileIcon(doc.document_name)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.document_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No recent uploads
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Category Tabs */}
        {DOCUMENT_CATEGORIES.filter(cat => !cat.isOverview).map((category) => (
          <TabsContent key={category.key} value={category.key} className="mt-4">
            {renderCategoryContent(category.key, category)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
