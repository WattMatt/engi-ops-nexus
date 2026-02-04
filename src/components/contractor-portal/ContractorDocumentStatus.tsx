import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, Clock, AlertCircle, FileText, Download, Eye, Search,
  File, FileImage, Folder, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface ContractorDocumentStatusProps {
  projectId: string;
  documentCategories: string[];
}

interface UnifiedDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string | null;
  file_size: number | null;
  created_at: string;
  source: 'handover' | 'drawing';
  shop_number?: string | null;
  revision?: string | null;
  status?: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  // Drawing categories
  architectural: { label: 'Architectural', color: 'bg-slate-500' },
  electrical: { label: 'Electrical', color: 'bg-amber-500' },
  mechanical: { label: 'Mechanical', color: 'bg-cyan-500' },
  plumbing: { label: 'Plumbing', color: 'bg-blue-500' },
  structural: { label: 'Structural', color: 'bg-purple-500' },
  fire: { label: 'Fire', color: 'bg-red-500' },
  // Handover categories
  as_built: { label: 'As Built', color: 'bg-blue-500' },
  generators: { label: 'Generators', color: 'bg-amber-500' },
  transformers: { label: 'Transformers', color: 'bg-purple-500' },
  main_boards: { label: 'Main Boards', color: 'bg-slate-500' },
  lighting: { label: 'Lighting', color: 'bg-yellow-500' },
  cctv_access_control: { label: 'CCTV & Access', color: 'bg-cyan-500' },
  lightning_protection: { label: 'Lightning Protection', color: 'bg-indigo-500' },
  manuals: { label: 'Manuals', color: 'bg-green-500' },
  certificates: { label: 'Certificates', color: 'bg-red-500' },
  other: { label: 'Other', color: 'bg-muted-foreground' }
};

export function ContractorDocumentStatus({ projectId, documentCategories }: ContractorDocumentStatusProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewDoc, setPreviewDoc] = useState<UnifiedDocument | null>(null);

  // Fetch all data in parallel for faster loading
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
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });

  // Fetch project drawings (drawing register) - visible_to_contractor=true
  const { data: projectDrawings, isLoading: drawingsLoading } = useQuery({
    queryKey: ['contractor-project-drawings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_drawings')
        .select('id, drawing_number, drawing_title, category, file_url, file_size, current_revision, status, created_at, shop_number')
        .eq('project_id', projectId)
        .eq('visible_to_contractor', true)
        .order('category')
        .order('drawing_number');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch handover documents
  const { data: handoverDocs, isLoading: handoverLoading } = useQuery({
    queryKey: ['contractor-handover-docs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handover_documents')
        .select('id, document_name, document_type, file_url, file_size, created_at, source_type, source_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Unified document list combining drawings and handover docs
  const unifiedDocs: UnifiedDocument[] = [
    // Project drawings
    ...(projectDrawings?.map(d => ({
      id: d.id,
      document_name: `${d.drawing_number} - ${d.drawing_title}`,
      document_type: d.category || 'other',
      file_url: d.file_url,
      file_size: d.file_size,
      created_at: d.created_at,
      source: 'drawing' as const,
      shop_number: d.shop_number,
      revision: d.current_revision,
      status: d.status,
    })) || []),
    // Handover documents
    ...(handoverDocs?.map(d => ({
      id: d.id,
      document_name: d.document_name,
      document_type: d.document_type || 'other',
      file_url: d.file_url,
      file_size: d.file_size,
      created_at: d.created_at,
      source: 'handover' as const,
      shop_number: null,
      revision: null,
      status: null,
    })) || []),
  ];

  const isLoading = tenantsLoading || handoverLoading || drawingsLoading;

  // Filter documents by category and search
  const filteredDocs = unifiedDocs.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.document_type === selectedCategory;
    const matchesSearch = !searchTerm || 
      doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.shop_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Also filter by allowed categories if specified
    const allowedByPortal = documentCategories.length === 0 || 
      documentCategories.includes(doc.document_type || 'other');
    
    return matchesCategory && matchesSearch && allowedByPortal;
  });

  // Get unique categories from documents
  const availableCategories = [...new Set(
    unifiedDocs.map(d => d.document_type || 'other')
      .filter(cat => documentCategories.length === 0 || documentCategories.includes(cat))
  )];

  const handleDownload = async (doc: UnifiedDocument) => {
    if (!doc.file_url) {
      toast.error("No file available for download");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = doc.file_url;
      link.download = doc.document_name || 'document';
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const handlePreview = (doc: UnifiedDocument) => {
    setPreviewDoc(doc);
  };

  const getPreviewUrl = (doc: UnifiedDocument) => {
    return doc.file_url || null;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="h-5 w-5 text-primary" />;
    }
    if (ext === 'pdf') {
      return <FileText className="h-5 w-5 text-destructive" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
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
      {/* Overview Card */}
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
                <span>Overall Completion</span>
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
                <p className="text-2xl font-bold">{unifiedDocs.length}</p>
                <p className="text-xs text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Project Drawings & Documents
          </CardTitle>
          <CardDescription>Browse, view, and download project documentation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
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

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">All ({unifiedDocs.length})</TabsTrigger>
              {availableCategories.map(cat => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                const count = unifiedDocs.filter(d => d.document_type === cat).length;
                return (
                  <TabsTrigger key={cat} value={cat}>
                    {config.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4">
              {filteredDocs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No documents found</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {filteredDocs.map((doc) => {
                    const catConfig = CATEGORY_CONFIG[doc.document_type || 'other'] || CATEGORY_CONFIG.other;
                    return (
                      <div 
                        key={doc.id} 
                        className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                      >
                        {/* File Icon */}
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.document_name || '')}
                        </div>

                        {/* Document Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{doc.document_name}</p>
                            {doc.revision && (
                              <Badge variant="secondary" className="text-xs shrink-0">Rev {doc.revision}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">
                              {catConfig.label}
                            </Badge>
                            {doc.shop_number && (
                              <span>• {doc.shop_number}</span>
                            )}
                            <span>• {formatFileSize(doc.file_size)}</span>
                            <span>• {new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tenant Documentation Status */}
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

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc && getFileIcon(previewDoc.document_name || '')}
              {previewDoc?.document_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewDoc && (
              <>
                {/* PDF or Image Preview */}
                {(() => {
                  const url = getPreviewUrl(previewDoc);
                  const ext = previewDoc.document_name?.split('.').pop()?.toLowerCase();
                  
                  if (!url) {
                    return (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mr-2" />
                        No preview available
                      </div>
                    );
                  }

                  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
                    return (
                      <div className="h-full flex items-center justify-center p-4">
                        <img 
                          src={url} 
                          alt={previewDoc.document_name || 'Document'} 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    );
                  }

                  if (ext === 'pdf') {
                    return (
                      <iframe 
                        src={url}
                        className="w-full h-full border-0"
                        title={previewDoc.document_name || 'Document Preview'}
                      />
                    );
                  }

                  return (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                      <File className="h-16 w-16" />
                      <p>Preview not available for this file type</p>
                      <Button onClick={() => handleDownload(previewDoc)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download to View
                      </Button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {previewDoc && (
                <>
                  <span>{CATEGORY_CONFIG[previewDoc.document_type || 'other']?.label}</span>
                  <span className="mx-2">•</span>
                  <span>{formatFileSize(previewDoc.file_size)}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(previewDoc.created_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {previewDoc && (
                <>
                  <Button variant="outline" onClick={() => window.open(getPreviewUrl(previewDoc) || '', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button onClick={() => handleDownload(previewDoc)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
