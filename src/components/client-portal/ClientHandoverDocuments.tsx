import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, Download, Loader2, FolderOpen, Search, 
  FileImage, FileSpreadsheet, File, FileArchive, 
  Calendar, Eye, Package, Zap, Cpu, Server, Lightbulb,
  Camera, Shield, ClipboardCheck, FileCheck, Award, BookOpen,
  BadgeCheck, HardDrive, TrendingUp, BarChart3, Clock
} from "lucide-react";
import { format } from "date-fns";
import JSZip from "jszip";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface ClientHandoverDocumentsProps {
  documents: any[];
  projectName?: string;
  tenants?: any[];
  isDownloadingAll: boolean;
  onBulkDownload: () => void;
}

// Document categories with icons matching handover docs
const DOCUMENT_CATEGORIES = {
  'overview': { label: 'Overview', icon: BarChart3, color: 'text-primary' },
  'as_built': { label: 'As Built', icon: Package, color: 'text-blue-500' },
  'generators': { label: 'Generators', icon: Zap, color: 'text-amber-500' },
  'transformers': { label: 'Transformers', icon: Cpu, color: 'text-purple-500' },
  'main_boards': { label: 'Main Boards', icon: Server, color: 'text-slate-500' },
  'lighting': { label: 'Lighting', icon: Lightbulb, color: 'text-yellow-500' },
  'cctv_access_control': { label: 'CCTV & Access', icon: Camera, color: 'text-cyan-500' },
  'lightning_protection': { label: 'Lightning', icon: Shield, color: 'text-indigo-500' },
  'specifications': { label: 'Specifications', icon: ClipboardCheck, color: 'text-green-500' },
  'test_certificates': { label: 'Test Certificates', icon: FileCheck, color: 'text-teal-500' },
  'warranties': { label: 'Warranties', icon: Award, color: 'text-orange-500' },
  'manuals': { label: 'Manuals', icon: BookOpen, color: 'text-rose-500' },
  'commissioning_docs': { label: 'Commissioning', icon: BadgeCheck, color: 'text-emerald-500' },
  'compliance_certs': { label: 'Compliance', icon: FileCheck, color: 'text-violet-500' },
  'other': { label: 'Other', icon: File, color: 'text-muted-foreground' },
};

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

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
  documents, 
  projectName,
  tenants = [],
  isDownloadingAll, 
  onBulkDownload 
}: ClientHandoverDocumentsProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Group documents by category
  const documentsByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    Object.keys(DOCUMENT_CATEGORIES).forEach(key => {
      if (key !== 'overview') groups[key] = [];
    });
    
    documents.forEach(doc => {
      const type = doc.document_type?.toLowerCase() || 'other';
      const matchedKey = Object.keys(DOCUMENT_CATEGORIES).find(key => 
        type.includes(key.replace('_', ' ')) || type.includes(key)
      ) || 'other';
      
      if (!groups[matchedKey]) groups[matchedKey] = [];
      groups[matchedKey].push(doc);
    });
    
    return groups;
  }, [documents]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    const latestUpload = documents.length > 0 
      ? new Date(Math.max(...documents.map(d => new Date(d.created_at).getTime())))
      : null;
    
    // Count categories with documents
    const categoriesWithDocs = Object.values(documentsByCategory).filter(docs => docs.length > 0).length;
    
    return { totalDocs, totalSize, latestUpload, categoriesWithDocs };
  }, [documents, documentsByCategory]);

  // Chart data for document distribution
  const chartData = useMemo(() => {
    return Object.entries(documentsByCategory)
      .filter(([_, docs]) => docs.length > 0)
      .map(([key, docs]) => ({
        name: DOCUMENT_CATEGORIES[key as keyof typeof DOCUMENT_CATEGORIES]?.label || key,
        count: docs.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [documentsByCategory]);

  // Recent uploads (last 5)
  const recentUploads = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [documents]);

  // Filter documents for current tab
  const getFilteredDocuments = (category: string) => {
    const docs = documentsByCategory[category] || [];
    if (!searchQuery) return docs;
    
    const query = searchQuery.toLowerCase();
    return docs.filter(doc => 
      doc.document_name?.toLowerCase().includes(query) ||
      doc.notes?.toLowerCase().includes(query)
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
  const renderDocumentTable = (docs: any[]) => {
    if (docs.length === 0) {
      return (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No documents in this category</p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Document</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => (
              <TableRow key={doc.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.document_name)}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate max-w-[300px]">{doc.document_name}</p>
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">{doc.notes}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
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
      </div>
    );
  };

  if (documents.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-16 text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Documents Available</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Project handover documents will appear here once they are uploaded by the project team.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Project Documents
          </h2>
          <p className="text-muted-foreground">
            Complete handover document repository for {projectName || 'this project'}
          </p>
        </div>
        <Button onClick={onBulkDownload} disabled={isDownloadingAll} size="lg">
          {isDownloadingAll ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download All Documents
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full pb-2">
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1 p-1 bg-muted/50">
            {Object.entries(DOCUMENT_CATEGORIES).map(([key, cat]) => {
              const count = key === 'overview' ? documents.length : (documentsByCategory[key]?.length || 0);
              if (key !== 'overview' && count === 0) return null;
              
              const IconComponent = cat.icon;
              return (
                <TabsTrigger key={key} value={key} className="text-xs gap-1">
                  <IconComponent className={`h-3 w-3 ${cat.color}`} />
                  {cat.label}
                  {key !== 'overview' && <Badge variant="secondary" className="ml-1 text-[10px] px-1">{count}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

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

          {/* Charts and Recent Activity */}
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

            {/* Recent Activity */}
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
                    {recentUploads.map((doc) => (
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

          {/* All Documents Quick View */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>Complete list of all available documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-[400px]">
                {renderDocumentTable(
                  searchQuery 
                    ? documents.filter(doc => 
                        doc.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        doc.notes?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : documents
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Tabs */}
        {Object.entries(DOCUMENT_CATEGORIES).filter(([key]) => key !== 'overview').map(([key, cat]) => {
          const docs = getFilteredDocuments(key);
          const allDocs = documentsByCategory[key] || [];
          
          if (allDocs.length === 0) return null;
          
          const IconComponent = cat.icon;
          const totalSize = allDocs.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
          
          return (
            <TabsContent key={key} value={key} className="space-y-6 mt-4">
              {/* Category KPIs */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{allDocs.length}</div>
                    <p className="text-xs text-muted-foreground">{cat.label} documents</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatFileSize(totalSize)}</div>
                    <p className="text-xs text-muted-foreground">Combined file size</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Latest Upload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {allDocs.length > 0 
                        ? format(new Date(Math.max(...allDocs.map(d => new Date(d.created_at).getTime()))), 'MMM d, yyyy')
                        : 'N/A'
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">Most recent document</p>
                  </CardContent>
                </Card>
              </div>

              {/* Documents Table */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <IconComponent className={`h-5 w-5 ${cat.color}`} />
                        {cat.label} Documents
                      </CardTitle>
                      <CardDescription>All {cat.label.toLowerCase()} related documents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Showing {docs.length} of {allDocs.length} documents
                  </p>
                  
                  {renderDocumentTable(docs)}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
