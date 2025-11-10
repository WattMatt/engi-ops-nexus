import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
import { FileText, Download, Package, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";
import JSZip from "jszip";

const HandoverClient = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Fetch handover link details
  const { data: handoverLinkData, isLoading: linkLoading, error: linkError } = useQuery({
    queryKey: ["handover-link", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_links" as any)
        .select(`
          *,
          projects(name, client_name)
        `)
        .eq("link_token", token)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Invalid or expired link");
      
      const linkData = data as any;
      
      // Check if expired
      if (linkData.expires_at && isPast(new Date(linkData.expires_at))) {
        throw new Error("This link has expired");
      }

      return linkData;
    },
    enabled: !!token,
    retry: false,
  });

  const handoverLink = handoverLinkData as any;

  // Track access
  useEffect(() => {
    if (handoverLink?.id) {
      supabase
        .from("handover_links" as any)
        .update({
          access_count: (handoverLink.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", handoverLink.id)
        .then();
    }
  }, [handoverLink?.id, handoverLink?.access_count]);

  // Fetch documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["handover-client-documents", handoverLink?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("*")
        .eq("project_id", handoverLink?.project_id)
        .order("document_type", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!handoverLink?.project_id,
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
      const projectName = handoverLink?.projects?.name || "handover";

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

  if (linkLoading || docsLoading) {
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

  if (linkError || !handoverLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground text-center">
              {linkError?.message || "This handover link is invalid or has expired."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const projectName = handoverLink?.projects?.name || "Project";
  const clientName = handoverLink?.projects?.client_name;
  const documentsWithFiles = documents?.filter((d: any) => d.file_url) || [];

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

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Available Documents</CardTitle>
            <CardDescription>
              Click on individual documents to download, or use "Download All" to get everything at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No documents available</p>
              </div>
            ) : (
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
                  {documents.map((doc: any) => (
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
                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {doc.file_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No file
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card className="mt-6">
          <CardContent className="py-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This secure link provides access to all project handover documents.
              </p>
              {handoverLink?.expires_at && (
                <p>
                  Link expires: {format(new Date(handoverLink.expires_at), "MMMM d, yyyy")}
                </p>
              )}
              <p className="text-xs">
                If you have any questions about these documents, please contact your project manager.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HandoverClient;
