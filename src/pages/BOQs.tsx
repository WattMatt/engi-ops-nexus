import { useEffect, useRef } from "react";
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
  // Track if we've already attempted to create a BOQ for this project to prevent duplicates
  const hasAttemptedCreation = useRef<string | null>(null);

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
      // Mark that we've successfully created a BOQ for this project
      hasAttemptedCreation.current = projectId;
      queryClient.invalidateQueries({ queryKey: ["project-boq", projectId] });
      toast.success("BOQ created successfully");
      navigate(`/dashboard/boqs/${data.id}`);
    },
    onError: (error: any) => {
      // Reset on error so we can retry if needed
      hasAttemptedCreation.current = null;
      toast.error(error.message || "Failed to create BOQ");
    },
  });

  useEffect(() => {
    if (!projectId) {
      toast.error("Please select a project first");
      navigate("/projects");
      return;
    }

    // Reset creation attempt tracking when project changes
    if (hasAttemptedCreation.current && hasAttemptedCreation.current !== projectId) {
      hasAttemptedCreation.current = null;
    }

    // Auto-create BOQ if project exists but BOQ doesn't, and we haven't already attempted
    if (project && !boq && !createMutation.isPending && hasAttemptedCreation.current !== projectId) {
      hasAttemptedCreation.current = projectId;
      createMutation.mutate();
    }
  }, [projectId, project, boq, createMutation.isPending, navigate]);

  if (isLoading || createMutation.isPending) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading BOQ...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!boq) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Creating BOQ...</p>
              <p className="text-xs text-muted-foreground">Please wait while we set up your Bill of Quantities</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Bill of Quantities
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create and manage project BOQ structure with bills, sections, and items
            </p>
          </div>
          <Button onClick={() => navigate(`/dashboard/boqs/${boq.id}`)} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Open BOQ
          </Button>
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">BOQ Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">BOQ Number</p>
                <p className="text-lg font-semibold text-foreground">{boq.boq_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Version</p>
                <p className="text-lg font-semibold text-foreground">{boq.version || "1.0"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                <p className="text-lg font-semibold text-foreground capitalize">{boq.status || "draft"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Amount</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(boq.total_amount || 0)}</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <Button onClick={() => navigate(`/dashboard/boqs/${boq.id}`)} variant="outline" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Manage BOQ Structure
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BOQs;

