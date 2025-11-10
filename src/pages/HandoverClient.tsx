import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Package, Loader2, AlertCircle, Eye, Zap, Cpu, Server, Lightbulb, Camera, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { ClientDocumentPreview } from "@/components/handover/ClientDocumentPreview";

const HandoverClient = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const { toast } = useToast();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  // Fetch project details
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name, client_name")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Project not found");
      
      return data;
    },
    enabled: !!projectId,
    retry: false,
  });

  // Fetch documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["handover-client-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("document_type", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleDownload = async (doc: any) => {
    if (!doc.file_url) {
      toast({
        title: "Error",
        description: "No file available for download",
        variant: "destructive",
      });
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = doc.file_url;
      link.download = doc.document_name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleBulkDownload = async () => {
    if (!documents || documents.length === 0) return;

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      const projectName = project?.name || "handover";

      toast({
        title: "Preparing download",
        description: "Fetching and compressing documents...",
      });

      // Fetch all files
      const downloadPromises = documents
        .filter((doc: any) => doc.file_url)
        .map(async (doc: any) => {
          try {
            const response = await fetch(doc.file_url);
            if (!response.ok) throw new Error(`Failed to fetch ${doc.document_name}`);
            const blob = await response.blob();
            
            // Organize by document type
            const folder = doc.document_type.replace(/[^a-zA-Z0-9]/g, "_");
            zip.folder(folder)?.file(doc.document_name, blob);
          } catch (error) {
            console.error(`Error downloading ${doc.document_name}:`, error);
          }
        });

      await Promise.all(downloadPromises);

      // Generate zip
      const content = await zip.generateAsync({ type: "blob" });
      
      // Download zip
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${projectName}_handover_documents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "Success",
        description: "Documents downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download documents",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  if (projectLoading || docsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading handover documents...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectError || !project || !projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground text-center">
              {projectError?.message || "This handover link is invalid or the project was not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const projectName = project?.name || "Project";
  const clientName = project?.client_name;
  const documentsWithFiles = documents?.filter((d: any) => d.file_url) || [];

  const getDocumentsByType = (equipmentType: string) => {
    return documents?.filter((doc: any) => doc.equipment_type === equipmentType) || [];
  };

  const renderDocumentsTable = (docs: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Added</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
              No documents available for this category
            </TableCell>
          </TableRow>
        ) : (
          docs.map((doc: any) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {doc.document_name}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {doc.document_type.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(doc.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </TableCell>
              <TableCell className="text-right">
                {doc.file_url ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewDocument(doc)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No file
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Project Handover Documents
              </h1>
              <p className="text-muted-foreground">
                {projectName}
                {clientName && ` • ${clientName}`}
              </p>
            </div>
            <Button
              onClick={handleBulkDownload}
              disabled={isDownloadingAll || documentsWithFiles.length === 0}
              size="lg"
            >
              {isDownloadingAll ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-5 w-5" />
                  Download All ({documentsWithFiles.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="overview">
              <Package className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="generators">
              <Zap className="h-4 w-4 mr-2" />
              Generators
            </TabsTrigger>
            <TabsTrigger value="transformers">
              <Cpu className="h-4 w-4 mr-2" />
              Transformers
            </TabsTrigger>
            <TabsTrigger value="main_boards">
              <Server className="h-4 w-4 mr-2" />
              Main Boards
            </TabsTrigger>
            <TabsTrigger value="lighting">
              <Lightbulb className="h-4 w-4 mr-2" />
              Lighting
            </TabsTrigger>
            <TabsTrigger value="cctv">
              <Camera className="h-4 w-4 mr-2" />
              CCTV & Access
            </TabsTrigger>
            <TabsTrigger value="lightning">
              <Shield className="h-4 w-4 mr-2" />
              Lightning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>All Documents</CardTitle>
                <CardDescription>
                  View and download all available handover documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentsTable(documents || [])}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generators">
            <Card>
              <CardHeader>
                <CardTitle>Generator Documents</CardTitle>
                <CardDescription>
                  Documents related to generators and power generation equipment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentsTable(getDocumentsByType('generators'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transformers">
            <Card>
              <CardHeader>
                <CardTitle>Transformer Documents</CardTitle>
                <CardDescription>
                  Documents related to transformers and power distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentsTable(getDocumentsByType('transformers'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="main_boards">
            <Card>
              <CardHeader>
                <CardTitle>Main Board Documents</CardTitle>
                <CardDescription>
                  Documents related to main electrical boards and distribution panels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentsTable(getDocumentsByType('main_boards'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lighting">
            <Card>
              <CardHeader>
                <CardTitle>Lighting Documents</CardTitle>
                <CardDescription>
                  Documents related to lighting systems and controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentsTable(getDocumentsByType('lighting'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cctv">
            <Card>
              <CardHeader>
                <CardTitle>CCTV & Access Control Documents</CardTitle>
                <CardDescription>
                  Documents related to CCTV and access control systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentsTable(getDocumentsByType('cctv_access_control'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lightning">
            <Card>
              <CardHeader>
                <CardTitle>Lightning Protection Documents</CardTitle>
                <CardDescription>
                  Documents related to lightning protection systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentsTable(getDocumentsByType('lightning_protection'))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="mt-6">
          <CardContent className="py-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This portal provides access to all project handover documents.
              </p>
              <p className="text-xs">
                If you have any questions about these documents, please contact your project manager.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Preview Modal */}
      <ClientDocumentPreview
        document={previewDocument}
        open={!!previewDocument}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default HandoverClient;
