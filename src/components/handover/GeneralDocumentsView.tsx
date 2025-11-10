import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Eye, FileText, Calendar, Package, Upload } from "lucide-react";
import { DocumentPreviewDialog } from "@/components/tenant/DocumentPreviewDialog";
import { UploadHandoverDocumentDialog } from "@/components/handover/UploadHandoverDocumentDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GeneralDocumentsViewProps {
  projectId: string;
  documentType: string;
  documentLabel: string;
  icon?: React.ReactNode;
}

export const GeneralDocumentsView = ({
  projectId,
  documentType,
  documentLabel,
  icon,
}: GeneralDocumentsViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Fetch general project documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["general-documents", projectId, documentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("*")
        .eq("project_id", projectId)
        .eq("document_type", documentType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Filter documents based on search
  const filteredDocuments = documents.filter((doc: any) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fileName = (doc.document_name || "").toLowerCase();
      return fileName.includes(query);
    }
    return true;
  });

  const handleDownload = (doc: any) => {
    if (!doc.file_url) return;

    const link = document.createElement("a");
    link.href = doc.file_url;
    link.download = doc.document_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{documents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {documentLabel} uploaded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatFileSize(
                  documents.reduce((sum: number, doc: any) => sum + (doc.file_size || 0), 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Combined file size
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Latest Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {documents.length > 0
                  ? new Date(documents[0].created_at).toLocaleDateString()
                  : "No uploads"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Most recent document
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {icon || <Package className="h-5 w-5" />}
                  {documentLabel} Repository
                </CardTitle>
                <CardDescription>
                  View and manage all {documentLabel}
                </CardDescription>
              </div>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between py-2 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredDocuments.length} of {documents.length} documents
              </p>
            </div>

            {/* Results Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No {documentLabel} Yet</p>
                <p className="text-sm mt-2">
                  Documents will appear here as they are uploaded
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents found matching your search</p>
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery("")} 
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono text-xs max-w-[300px]">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{doc.document_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size || 0)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {doc.uploaded_by || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewDocument(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      {previewDocument && (
        <DocumentPreviewDialog
          document={previewDocument}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      )}

      {/* Upload Dialog */}
      <UploadHandoverDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
      />
    </>
  );
};
