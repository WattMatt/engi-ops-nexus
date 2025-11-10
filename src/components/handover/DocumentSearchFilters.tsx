import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter, Download, Eye, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentPreviewDialog } from "@/components/tenant/DocumentPreviewDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DocumentSearchFiltersProps {
  projectId: string;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "electrical_coc", label: "Electrical COC" },
  { value: "as_built_drawing", label: "As Built Drawing" },
  { value: "line_diagram", label: "Line Diagram" },
  { value: "qc_inspection_report", label: "QC Inspection Report" },
  { value: "lighting_guarantee", label: "Lighting Guarantee" },
  { value: "db_guarantee", label: "DB Guarantee" },
];

const FILE_TYPE_OPTIONS = [
  { value: "all", label: "All Files" },
  { value: "pdf", label: "PDF" },
  { value: "dwg", label: "DWG" },
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "doc", label: "DOC/DOCX" },
];

export const DocumentSearchFilters = ({ projectId }: DocumentSearchFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [documentType, setDocumentType] = useState("all");
  const [fileType, setFileType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  // Fetch all documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["handover-search-documents", projectId],
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch all tenants for the shop filter
  const { data: tenants = [] } = useQuery({
    queryKey: ["handover-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_number, shop_name")
        .eq("project_id", projectId)
        .order("shop_number", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Filter documents based on all criteria
  const filteredDocuments = documents.filter((doc: any) => {
    // Search query (searches file name, shop number, shop name)
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

    // Document type filter
    if (documentType !== "all" && doc.document_type !== documentType) {
      return false;
    }

    // File type filter
    if (fileType !== "all") {
      const ext = doc.document_name?.split(".").pop()?.toLowerCase();
      if (ext !== fileType) {
        return false;
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const docDate = new Date(doc.created_at);
      if (dateFrom && docDate < new Date(dateFrom)) {
        return false;
      }
      if (dateTo && docDate > new Date(dateTo + "T23:59:59")) {
        return false;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setDocumentType("all");
    setFileType("all");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
  };

  const hasActiveFilters =
    searchQuery ||
    documentType !== "all" ||
    fileType !== "all" ||
    dateFrom ||
    dateTo ||
    statusFilter !== "all";

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

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Search & Filter</CardTitle>
              <CardDescription>
                Search and filter handover documents using structured naming
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Filter Row */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File Type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: {searchQuery}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {documentType !== "all" && (
                <Badge variant="secondary">
                  Type: {getDocumentTypeLabel(documentType)}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setDocumentType("all")}
                  />
                </Badge>
              )}
              {fileType !== "all" && (
                <Badge variant="secondary">
                  File: {fileType.toUpperCase()}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setFileType("all")}
                  />
                </Badge>
              )}
              {dateFrom && (
                <Badge variant="secondary">
                  From: {dateFrom}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setDateFrom("")}
                  />
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary">
                  To: {dateTo}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setDateTo("")}
                  />
                </Badge>
              )}
            </div>
          )}

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
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents found matching your criteria</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">
                        {doc.document_name}
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
                      <TableCell>
                        <Badge variant="outline">
                          {getDocumentTypeLabel(doc.document_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
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

      {/* Preview Dialog */}
      {previewDocument && (
        <DocumentPreviewDialog
          document={previewDocument}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      )}
    </>
  );
};
