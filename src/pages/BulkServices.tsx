import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { CreateBulkServicesDialog } from "@/components/bulk-services/CreateBulkServicesDialog";
import { BulkServicesOverview } from "@/components/bulk-services/BulkServicesOverview";

const BulkServices = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const selectedProjectId = localStorage.getItem("selectedProjectId");

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

  if (selectedDocumentId) {
    return (
      <BulkServicesOverview
        documentId={selectedDocumentId}
        onBack={() => setSelectedDocumentId(null)}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
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
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedDocumentId(doc.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-xs text-muted-foreground">{doc.revision}</span>
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
                    {doc.maximum_demand ? `${doc.maximum_demand} kVA` : "N/A"}
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
    </div>
  );
};

export default BulkServices;
