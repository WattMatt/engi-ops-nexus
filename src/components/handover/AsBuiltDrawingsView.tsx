import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Eye, FileText, Calendar, Upload } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";

interface AsBuiltDrawingsViewProps {
  projectId: string;
}

export const AsBuiltDrawingsView = ({ projectId }: AsBuiltDrawingsViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Fetch As Built Drawing documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["as-built-drawings", projectId],
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
        .eq("source_type", "tenant")
        .eq("document_type", "as_built_drawing")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch total tenants for completion tracking
  const { data: totalTenants = 0 } = useQuery({
    queryKey: ["tenants-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      if (error) throw error;
      return count || 0;
    },
  });

  // Filter documents based on search
  const filteredDocuments = documents.filter((doc: any) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fileName = (doc.document_name || "").toLowerCase();
      const shopNumber = (doc.tenants?.shop_number || "").toLowerCase();
      const shopName = (doc.tenants?.shop_name || "").toLowerCase();

      if (
        !fileName.includes(query) &&
        !shopNumber.includes(query) &&
        !shopName.includes(query)
      ) {
        return false;
      }
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

  const completionPercentage = totalTenants > 0 
    ? Math.round((documents.length / totalTenants) * 100) 
    : 0;

  return (
    <>
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Drawings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{documents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                As Built Drawings uploaded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completionPercentage}%</div>
              <Progress value={completionPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {documents.length} of {totalTenants} tenants
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
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  As Built Drawings Repository
                </CardTitle>
                <CardDescription>
                  View and manage all As Built Drawing documents
                </CardDescription>
              </div>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Drawing
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by file name, shop number, or shop name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between py-2 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredDocuments.length} of {documents.length} drawings
              </p>
            </div>

            {/* Results Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading drawings...
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No As Built Drawings Yet</p>
                <p className="text-sm mt-2">
                  Drawings will appear here as they are uploaded by tenants
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No drawings found matching your search</p>
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
                      <TableHead>Shop</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Upload Date</TableHead>
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
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {doc.tenants?.shop_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {doc.tenants?.shop_name}
                            </div>
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
