import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BulkServicesOverview } from "@/components/bulk-services/BulkServicesOverview";
import { toast } from "sonner";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const BulkServices = () => {
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  // Fetch or create single document for project
  const { data: document, isLoading, refetch } = useQuery({
    queryKey: ["bulk-services-document", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;

      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("project_id", selectedProjectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId,
  });

  // Auto-create document if none exists
  const createDocument = async () => {
    if (!selectedProjectId || isCreating) return;
    
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get project details for document number
      const { data: project } = await supabase
        .from("projects")
        .select("name, project_number")
        .eq("id", selectedProjectId)
        .single();

      const docNumber = project?.project_number 
        ? `BS-${project.project_number}` 
        : `BS-${Date.now()}`;

      const { data: newDoc, error } = await supabase
        .from("bulk_services_documents")
        .insert({
          project_id: selectedProjectId,
          created_by: user.id,
          document_number: docNumber,
          revision: "Rev 0",
          document_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      // Create default sections
      const defaultSections = [
        { section_number: "1", section_title: "Introduction", sort_order: 1 },
        { section_number: "2", section_title: "Scope of Work", sort_order: 2 },
        { section_number: "3", section_title: "Electrical Supply", sort_order: 3 },
        { section_number: "4", section_title: "Load Schedule", sort_order: 4 },
        { section_number: "5", section_title: "Distribution", sort_order: 5 },
      ];

      await supabase
        .from("bulk_services_sections")
        .insert(
          defaultSections.map(section => ({
            ...section,
            document_id: newDoc.id,
          }))
        );

      await refetch();
      toast.success("Bulk services report created");
    } catch (error: any) {
      console.error("Error creating document:", error);
      toast.error(error.message || "Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-create on mount if no document exists
  useEffect(() => {
    if (!isLoading && !document && selectedProjectId && !isCreating) {
      createDocument();
    }
  }, [isLoading, document, selectedProjectId]);

  if (!selectedProjectId) {
    return (
      <div className="container mx-auto px-6 py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No project selected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Please select a project to view the bulk services report
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || isCreating) {
    return (
      <div className="container mx-auto px-6 py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium">
              {isCreating ? "Creating bulk services report..." : "Loading..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto px-6 py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Setting up bulk services report</p>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <BulkServicesOverview
      documentId={document.id}
      onBack={() => navigate("/dashboard")}
    />
  );
};

export default BulkServices;
