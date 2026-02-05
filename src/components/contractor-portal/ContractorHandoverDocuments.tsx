import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DrawingPreviewDialog } from "@/components/drawings/DrawingPreviewDialog";
import { 
  Folder, FileText, File, FileImage, Download, Eye, Search,
  ChevronDown, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContractorHandoverDocumentsProps {
  projectId: string;
}

interface HandoverDocument {
  id: string;
  project_id: string;
  document_name: string;
  document_type: string;
  file_url: string | null;
  source_type: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
  folder?: {
    id: string;
    folder_name: string;
    document_category: string | null;
  } | null;
}

const DOCUMENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  generators: { label: 'Generators', color: 'bg-amber-500' },
  transformers: { label: 'Transformers', color: 'bg-yellow-500' },
  switchgear: { label: 'Switchgear', color: 'bg-orange-500' },
  distribution_boards: { label: 'Distribution Boards', color: 'bg-red-500' },
  cables: { label: 'Cables', color: 'bg-pink-500' },
  lighting: { label: 'Lighting', color: 'bg-purple-500' },
  emergency_systems: { label: 'Emergency Systems', color: 'bg-indigo-500' },
  hvac_controls: { label: 'HVAC Controls', color: 'bg-blue-500' },
  metering: { label: 'Metering', color: 'bg-cyan-500' },
  earthing: { label: 'Earthing & Bonding', color: 'bg-teal-500' },
  surge_protection: { label: 'Surge Protection', color: 'bg-green-500' },
  fire_systems: { label: 'Fire Systems', color: 'bg-emerald-500' },
  bms: { label: 'BMS', color: 'bg-lime-500' },
  solar_pv: { label: 'Solar PV', color: 'bg-yellow-600' },
  ups_systems: { label: 'UPS Systems', color: 'bg-slate-500' },
  cctv_security: { label: 'CCTV & Security', color: 'bg-gray-500' },
  access_control: { label: 'Access Control', color: 'bg-zinc-500' },
  other: { label: 'Other', color: 'bg-muted-foreground' },
};

export function ContractorHandoverDocuments({ projectId }: ContractorHandoverDocumentsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; fileName: string } | null>(null);

  // Fetch handover documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['contractor-handover-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handover_documents')
        .select(`
          *,
          folder:handover_folders(id, folder_name, document_category)
        `)
        .eq('project_id', projectId)
        .order('document_type')
        .order('document_name');
      
      if (error) throw error;
      return (data || []) as HandoverDocument[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Group documents by type
  const documentsByType = useMemo(() => {
    const map = new Map<string, HandoverDocument[]>();
    documents?.forEach(doc => {
      const type = doc.document_type || 'other';
      const existing = map.get(type) || [];
      existing.push(doc);
      map.set(type, existing);
    });
    return map;
  }, [documents]);

  // Get available types
  const availableTypes = useMemo(() => {
    return [...documentsByType.keys()].sort((a, b) => {
      const aLabel = DOCUMENT_TYPE_CONFIG[a]?.label || a;
      const bLabel = DOCUMENT_TYPE_CONFIG[b]?.label || b;
      return aLabel.localeCompare(bLabel);
    });
  }, [documentsByType]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents || [];
    const query = searchTerm.toLowerCase();
    return (documents || []).filter(doc =>
      doc.document_name?.toLowerCase().includes(query) ||
      doc.document_type?.toLowerCase().includes(query) ||
      doc.notes?.toLowerCase().includes(query)
    );
  }, [documents, searchTerm]);

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

  const handlePreview = (doc: HandoverDocument) => {
    if (doc.file_url) {
      setPreviewDoc({
        url: doc.file_url,
        title: doc.document_name,
        fileName: doc.document_name
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center text-muted-foreground">
            Loading documents...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Project Documents
          </CardTitle>
          <CardDescription>
            Handover documents, test certificates, and project files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-2xl font-bold">{documents?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-2xl font-bold">{availableTypes.length}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-2xl font-bold">
                {documents?.filter(d => d.file_url).length || 0}
              </p>
              <p className="text-xs text-muted-foreground">With Files</p>
            </div>
          </div>

          {/* Documents grouped by type */}
          {documents?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border rounded-lg">
              <Folder className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No documents available</p>
              <p className="text-sm">Project documents will appear here when shared</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {availableTypes.map(docType => {
                  const typeConfig = DOCUMENT_TYPE_CONFIG[docType] || DOCUMENT_TYPE_CONFIG.other;
                  const typeDocs = (documentsByType.get(docType) || [])
                    .filter(d => {
                      if (!searchTerm) return true;
                      const query = searchTerm.toLowerCase();
                      return d.document_name?.toLowerCase().includes(query) ||
                             d.notes?.toLowerCase().includes(query);
                    })
                    .sort((a, b) => a.document_name.localeCompare(b.document_name));
                  
                  if (typeDocs.length === 0) return null;

                  return (
                    <Collapsible key={docType} defaultOpen>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${typeConfig.color}`} />
                                {typeConfig.label}
                                <Badge variant="secondary" className="ml-2">
                                  {typeDocs.length}
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
                                  <TableHead>Document Name</TableHead>
                                  <TableHead className="w-[100px]">Size</TableHead>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {typeDocs.map(doc => (
                                  <TableRow key={doc.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {getFileIcon(doc.file_url)}
                                        <div>
                                          <p className="font-medium truncate max-w-[250px]">
                                            {doc.document_name}
                                          </p>
                                          {doc.folder && (
                                            <p className="text-xs text-muted-foreground">
                                              {doc.folder.folder_name}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {formatFileSize(doc.file_size)}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {format(new Date(doc.created_at), 'dd MMM yy')}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handlePreview(doc)}
                                          disabled={!doc.file_url}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleDownload(doc.file_url, doc.document_name)}
                                          disabled={!doc.file_url}
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <DrawingPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        fileUrl={previewDoc?.url || null}
        fileName={previewDoc?.fileName}
        title={previewDoc?.title}
      />
    </>
  );
}
