import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Loader2, FolderOpen, Search, 
  FileImage, FileSpreadsheet, File, FileArchive, 
  ExternalLink, Calendar, Eye, Grid3X3, List
} from "lucide-react";
import { format } from "date-fns";
import JSZip from "jszip";
import { toast } from "sonner";

interface ClientDocumentsListProps {
  documents: any[];
  projectName?: string;
  isDownloadingAll: boolean;
  onBulkDownload: () => void;
}

const DOCUMENT_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  'electrical': { label: 'Electrical', icon: FileText, color: 'text-yellow-500' },
  'drawings': { label: 'Drawings', icon: FileImage, color: 'text-blue-500' },
  'specifications': { label: 'Specifications', icon: FileText, color: 'text-purple-500' },
  'reports': { label: 'Reports', icon: FileSpreadsheet, color: 'text-green-500' },
  'certificates': { label: 'Certificates', icon: FileText, color: 'text-orange-500' },
  'manuals': { label: 'Manuals', icon: FileText, color: 'text-cyan-500' },
  'warranties': { label: 'Warranties', icon: FileText, color: 'text-pink-500' },
  'as-built': { label: 'As-Built', icon: FileImage, color: 'text-indigo-500' },
  'commissioning': { label: 'Commissioning', icon: FileText, color: 'text-emerald-500' },
  'other': { label: 'Other', icon: File, color: 'text-muted-foreground' },
};

const getFileIcon = (fileName: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <FileImage className="h-5 w-5 text-blue-500" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FileArchive className="h-5 w-5 text-amber-500" />;
    case 'dwg':
    case 'dxf':
      return <FileImage className="h-5 w-5 text-purple-500" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
};

const getFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ClientDocumentsList = ({ 
  documents, 
  projectName,
  isDownloadingAll, 
  onBulkDownload 
}: ClientDocumentsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Group documents by category
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, any[]> = {};
    documents.forEach(doc => {
      const category = doc.document_type?.toLowerCase() || 'other';
      const mappedCategory = Object.keys(DOCUMENT_CATEGORIES).find(
        key => category.includes(key)
      ) || 'other';
      
      if (!groups[mappedCategory]) {
        groups[mappedCategory] = [];
      }
      groups[mappedCategory].push(doc);
    });
    return groups;
  }, [documents]);

  // Filter documents based on search and category
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.document_name?.toLowerCase().includes(term) ||
        doc.document_type?.toLowerCase().includes(term) ||
        doc.notes?.toLowerCase().includes(term)
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => {
        const category = doc.document_type?.toLowerCase() || 'other';
        return category.includes(selectedCategory) || 
          (selectedCategory === 'other' && !Object.keys(DOCUMENT_CATEGORIES).some(key => category.includes(key)));
      });
    }
    
    return filtered;
  }, [documents, searchTerm, selectedCategory]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    Object.keys(groupedDocuments).forEach(cat => {
      counts[cat] = groupedDocuments[cat].length;
    });
    return counts;
  }, [documents, groupedDocuments]);

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

  if (documents.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-16 text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Documents Available</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Project documents will appear here once they are added by the project team.
            Check back later or contact your project manager for more information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Project Documents
              </CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? 's' : ''} available for download
                {projectName && ` • ${projectName}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Button onClick={onBulkDownload} disabled={isDownloadingAll}>
                {isDownloadingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="w-full justify-start h-auto flex-wrap gap-1 p-1 bg-muted/50">
                <TabsTrigger value="all" className="text-xs">
                  All ({categoryCounts.all || 0})
                </TabsTrigger>
                {Object.entries(groupedDocuments).map(([category, docs]) => {
                  const catInfo = DOCUMENT_CATEGORIES[category] || DOCUMENT_CATEGORIES.other;
                  return (
                    <TabsTrigger key={category} value={category} className="text-xs">
                      {catInfo.label} ({docs.length})
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>

            <TabsContent value={selectedCategory} className="mt-4">
              {viewMode === 'list' ? (
                /* List View */
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-[1fr,auto,auto,auto] gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground">
                    <div>Document</div>
                    <div className="text-center">Type</div>
                    <div className="text-center">Date</div>
                    <div className="text-right">Actions</div>
                  </div>
                  <ScrollArea className="max-h-[500px]">
                    <div className="divide-y">
                      {filteredDocuments.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="grid grid-cols-[1fr,auto,auto,auto] gap-4 p-3 items-center hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {getFileIcon(doc.document_name)}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{doc.document_name}</p>
                              {doc.notes && (
                                <p className="text-xs text-muted-foreground truncate">{doc.notes}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {doc.document_type}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.created_at), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePreview(doc)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              title="Download"
                            >
                              {downloadingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                /* Grid View */
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredDocuments.map((doc) => (
                    <Card key={doc.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="p-4 bg-muted/30 border-b flex items-center justify-center h-24">
                        <div className="scale-150">
                          {getFileIcon(doc.document_name)}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm truncate mb-1" title={doc.document_name}>
                          {doc.document_name}
                        </h4>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {doc.document_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'MMM d')}
                          </span>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{doc.notes}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3 mr-1" />
                            )}
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents match your search</p>
                  <Button variant="link" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}>
                    Clear filters
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
