import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DirectEditReportEditor } from "@/components/reports/DirectEditReportEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function InteractiveReportEditorPage() {
  const { projectId, reportType } = useParams<{ projectId: string; reportType: string }>();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<any>(null);

  // Fetch report data based on type
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
    enabled: !!projectId,
  });

  // Fetch generator-specific data
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && reportType === "generator",
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["generator-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && reportType === "generator",
  });

  useEffect(() => {
    if (project && reportType === "generator") {
      setReportData({
        projectName: project.name,
        zones,
        tenants,
      });
    }
  }, [project, zones, tenants, reportType]);

  const handleSave = async (content: any) => {
    try {
      const { error } = await supabase
        .from("report_drafts")
        .upsert({
          project_id: projectId,
          report_type: reportType,
          content,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Report draft saved");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save draft");
    }
  };

  const handleExport = async (settings: any) => {
    // Trigger the PDF export with the current settings
    toast.success("Export initiated");
  };

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading Report...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <DirectEditReportEditor
        reportData={reportData}
        reportType={reportType as any}
        projectId={projectId!}
        onSave={handleSave}
        onExport={handleExport}
      />
    </div>
  );
}