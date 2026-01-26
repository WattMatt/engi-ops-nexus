import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Database,
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  FileSpreadsheet,
  FileType,
  File,
} from "lucide-react";
import { useKnowledgeBase, KnowledgeDocument } from "@/hooks/useKnowledgeBase";
import { formatDistanceToNow } from "date-fns";
import { DocumentChunkPreview } from "./DocumentChunkPreview";

const categories = [
  { value: "general", label: "General" },
  { value: "electrical", label: "Electrical Engineering" },
  { value: "standards", label: "Standards & Codes" },
  { value: "specifications", label: "Specifications" },
  { value: "procedures", label: "Procedures" },
  { value: "safety", label: "Safety" },
  { value: "reference", label: "Reference Material" },
];

const statusConfig = {
  pending: { icon: Loader2, color: "text-yellow-600", label: "Pending", animate: true },
  processing: { icon: Loader2, color: "text-blue-600", label: "Processing", animate: true },
  ready: { icon: CheckCircle, color: "text-green-600", label: "Ready", animate: false },
  error: { icon: AlertCircle, color: "text-destructive", label: "Error", animate: false },
};

const supportedFormats = [
  { ext: ".txt", label: "Text", icon: FileText },
  { ext: ".md", label: "Markdown", icon: FileText },
  { ext: ".pdf", label: "PDF", icon: FileType },
  { ext: ".docx", label: "Word", icon: File },
  { ext: ".xlsx", label: "Excel", icon: FileSpreadsheet },
  { ext: ".csv", label: "CSV", icon: FileSpreadsheet },
];

export function KnowledgeBaseManager() {
  const { documents, isLoading, stats, uploadDocument, deleteDocument, reprocessDocument } = useKnowledgeBase();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "general",
    file: null as File | null,
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm((prev) => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) return;

    await uploadDocument.mutateAsync({
      file: uploadForm.file,
      title: uploadForm.title,
      description: uploadForm.description,
      category: uploadForm.category,
    });

    setUploadForm({ title: "", description: "", category: "general", file: null });
    setUploadOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Upload documents to enhance AI responses with your own reference materials
              </CardDescription>
            </div>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload documents to enhance AI responses. Supported formats:
                </DialogDescription>
              </DialogHeader>
              
              {/* Supported Formats */}
              <div className="flex flex-wrap gap-2 pb-2">
                <TooltipProvider>
                  {supportedFormats.map((format) => (
                    <Tooltip key={format.ext}>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1">
                          <format.icon className="h-3 w-3" />
                          {format.ext}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{format.label} files</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    accept=".txt,.md,.pdf,.doc,.docx,.xlsx,.xls,.csv,.json,.xml"
                    onChange={handleFileSelect}
                  />
                  {uploadForm.file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Document title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={uploadForm.category}
                    onValueChange={(value) => setUploadForm((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the document content"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadForm.file || !uploadForm.title || uploadDocument.isPending}
                  >
                    {uploadDocument.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
            <p className="text-xs text-muted-foreground">Ready</p>
            {stats.total > 0 && (
              <Progress
                value={(stats.ready / stats.total) * 100}
                className="h-1 mt-2"
              />
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
            <p className="text-xs text-muted-foreground">Processing</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{stats.totalChunks}</p>
            <p className="text-xs text-muted-foreground">Total Chunks</p>
          </div>
          {stats.error > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10">
              <p className="text-2xl font-bold text-destructive">{stats.error}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documents List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2" />
              <p>No documents found</p>
              <p className="text-sm">Upload documents to build your knowledge base</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                  onReprocess={() => reprocessDocument.mutate(doc.id)}
                  isDeleting={deleteDocument.isPending}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DocumentItem({
  document,
  onDelete,
  onReprocess,
  isDeleting,
}: {
  document: KnowledgeDocument;
  onDelete: () => void;
  onReprocess: () => void;
  isDeleting: boolean;
}) {
  const status = statusConfig[document.status];
  const StatusIcon = status.icon;

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return FileType;
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) return FileSpreadsheet;
    if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) return File;
    return FileText;
  };

  const FileIcon = getFileIcon(document.file_name);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="p-2 rounded-lg bg-muted">
        <FileIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{document.title}</h4>
          <Badge variant="outline" className="text-xs shrink-0">
            {document.category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{document.file_name}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className={`flex items-center gap-1 ${status.color}`}>
            <StatusIcon className={`h-3 w-3 ${status.animate ? "animate-spin" : ""}`} />
            {status.label}
          </span>
          {document.status === "ready" && document.chunk_count > 0 && (
            <DocumentChunkPreview
              documentId={document.id}
              documentTitle={document.title}
              chunkCount={document.chunk_count}
            />
          )}
          <span>{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
        </div>
        {document.status === "error" && document.error_message && (
          <p className="text-xs text-destructive mt-1">{document.error_message}</p>
        )}
      </div>
      <div className="flex gap-1">
        {(document.status === "error" || document.status === "pending") && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReprocess}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
