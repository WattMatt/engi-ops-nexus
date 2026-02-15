import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { ProjectOutlineHeader } from "./ProjectOutlineHeader";
import { ProjectOutlineSections } from "./ProjectOutlineSections";
import { ProjectOutlineExportPDFButton } from "./ProjectOutlineExportPDFButton";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";
import { ReportHistoryPanel } from "@/components/shared/ReportHistoryPanel";

interface ProjectOutlineOverviewProps {
  outlineId: string;
  onBack: () => void;
}

export const ProjectOutlineOverview = ({ outlineId, onBack }: ProjectOutlineOverviewProps) => {
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  
  const { data: outline, isLoading } = useQuery({
    queryKey: ["project-outline", outlineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_outlines")
        .select("*")
        .eq("id", outlineId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["project-outline-sections", outlineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_outline_sections")
        .select("*")
        .eq("outline_id", outlineId)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Outline not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Outlines
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSaveTemplateOpen(true)}>
            <Save className="mr-2 h-4 w-4" />
            Save as Template
          </Button>
          <ProjectOutlineExportPDFButton outline={outline} sections={sections || []} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectOutlineHeader outline={outline} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectOutlineSections 
            outlineId={outlineId} 
            sections={sections || []}
          />
        </CardContent>
      </Card>

      <ReportHistoryPanel
        dbTable="project_outline_reports"
        foreignKeyColumn="outline_id"
        foreignKeyValue={outlineId}
        storageBucket="project-outline-reports"
        title="Baseline Document Reports"
      />

      <SaveAsTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        outline={outline}
        sections={sections || []}
      />
    </div>
  );
};
