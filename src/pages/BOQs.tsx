import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { toast } from "sonner";

const BOQs = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch existing BOQ for this project
  const { data: boq, isLoading, refetch } = useQuery({
    queryKey: ["project-boq", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_boqs")
        .select("*, projects(name)")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch project details for auto-creation
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !boq,
  });

  // Auto-create BOQ if it doesn't exist
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("Project not found");

      const { data, error } = await supabase
        .from("project_boqs")
        .insert({
          project_id: projectId!,
          boq_number: `BOQ-${project.name?.substring(0, 10).toUpperCase().replace(/\s/g, '-') || 'PROJECT'}`,
          boq_name: `${project.name} - Bill of Quantities`,
          version: "1.0",
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-boq", projectId] });
      toast.success("BOQ created successfully");
      navigate(`/dashboard/boqs/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create BOQ");
    },
  });

  useEffect(() => {
    if (!projectId) {
      toast.error("Please select a project first");
      navigate("/projects");
      return;
    }

    // Auto-create BOQ if project exists but BOQ doesn't
    if (project && !boq && !createMutation.isPending) {
      createMutation.mutate();
    }
  }, [projectId, project, boq, createMutation.isPending]);

  if (isLoading || createMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!boq) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Creating BOQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bill of Quantities</h2>
          <p className="text-muted-foreground">
            Create and manage project BOQ structure with bills, sections, and items
          </p>
        </div>
        <Button onClick={() => navigate(`/dashboard/boqs/${boq.id}`)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Open BOQ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BOQ Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">BOQ Number</p>
              <p className="text-lg font-semibold">{boq.boq_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="text-lg font-semibold">{boq.version || "1.0"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold capitalize">{boq.status || "draft"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(boq.total_amount || 0)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => navigate(`/dashboard/boqs/${boq.id}`)} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Manage BOQ Structure
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOQs;

