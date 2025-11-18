import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2 } from "lucide-react";
import { CreateBulkServicesDialog } from "@/components/bulk-services/CreateBulkServicesDialog";
import { BulkServicesOverview } from "@/components/bulk-services/BulkServicesOverview";
import { toast } from "sonner";
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

const BulkServices = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const queryClient = useQueryClient();

  const { data: documents, refetch } = useQuery({
    queryKey: ["bulk-services-documents", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];

      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("project_id", selectedProjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // First delete sections
      const { error: sectionsError } = await supabase
        .from("bulk_services_sections")
        .delete()
        .eq("document_id", documentId);

      if (sectionsError) throw sectionsError;

      // Then delete document
      const { error: docError } = await supabase
        .from("bulk_services_documents")
        .delete()
        .eq("id", documentId);

      if (docError) throw docError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-services-documents"] });
      toast.success("Document deleted successfully");
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete document");
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };

  if (selectedDocumentId) {
    return (
      <BulkServicesOverview
        documentId={selectedDocumentId}
        onBack={() => setSelectedDocumentId(null)}
      />
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Services Documents</h1>
          <p className="text-muted-foreground">
            Manage electrical bulk services documentation
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Document
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {documents?.map((doc) => (
          <Card
            key={doc.id}
            className="cursor-pointer hover:border-primary transition-colors group"
            onClick={() => setSelectedDocumentId(doc.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{doc.revision}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteClick(e, doc.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg">{doc.document_number}</CardTitle>
              <CardDescription>
                {new Date(doc.document_date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Supply: </span>
                  <span className="font-medium">{doc.primary_voltage || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Capacity: </span>
                  <span className="font-medium">{doc.connection_size || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Max Demand: </span>
                  <span className="font-medium">
                    {doc.maximum_demand ? `${doc.maximum_demand.toLocaleString()} kVA` : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No bulk services documents yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first document to get started
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Document
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateBulkServicesDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onDocumentCreated={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bulk services document? This action cannot be undone.
              All sections and content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulkServices;
