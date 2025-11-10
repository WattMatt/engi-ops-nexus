import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { FileText, Download, Trash2, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface HandoverDocumentsListProps {
  projectId: string;
}

export const HandoverDocumentsList = ({ projectId }: HandoverDocumentsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["handover-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select(`
          *,
          profiles:added_by(full_name)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc: any = documents?.find((d: any) => d.id === docId);
      
      // If it's an uploaded file, delete from storage
      if (doc && doc.source_type === "upload" && doc.file_url) {
        const path = doc.file_url.split("/handover-documents/")[1];
        if (path) {
          await supabase.storage.from("handover-documents").remove([path]);
        }
      }

      // Delete database record
      const { error } = await supabase
        .from("handover_documents" as any)
        .delete()
        .eq("id", docId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document removed from handover",
      });
      queryClient.invalidateQueries({ queryKey: ["handover-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["handover-documents-count", projectId] });
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Document Repository</CardTitle>
          <CardDescription>
            All documents included in the handover package
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents in repository yet</p>
              <p className="text-sm">Upload or link documents to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      <Badge variant="secondary">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.source_type === "upload" ? "Uploaded" : "Linked"}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc.profiles?.full_name || "Unknown"}</TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {doc.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDocToDelete(doc);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{docToDelete?.document_name}" from the handover
              repository? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => docToDelete && deleteMutation.mutate(docToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
