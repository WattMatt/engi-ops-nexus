import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF } from "@/utils/pdfmake/engine";
import type { TenantCompletionData } from "@/utils/pdfmake/engine/registrations/tenantCompletion";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TenantData {
  id: string;
  shop_number: string;
  shop_name: string;
  completionPercentage: number;
  completedCount: number;
  totalCount: number;
}

interface DocumentData {
  document_type: string;
  file_name: string | null;
  file_path: string | null;
  uploaded_at: string;
  source_id?: string;
}

interface ExclusionData {
  document_type: string;
  notes: string | null;
  created_at: string;
  tenant_id?: string;
}

interface ExportProps {
  projectId: string;
  projectName: string;
  tenants: TenantData[];
  allDocuments: DocumentData[];
  allExclusions: ExclusionData[];
  stats: {
    total: number;
    complete: number;
    inProgress: number;
    notStarted: number;
    overallPercentage: number;
  };
}

export const TenantCompletionExportPDFButton = ({
  projectId,
  projectName,
  tenants,
  allDocuments,
  allExclusions,
  stats,
}: ExportProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      // 1. Prepare Data
      const reportData: TenantCompletionData = {
        projectName,
        reportDate: new Date().toISOString(),
        stats,
        tenants,
        documents: allDocuments.map(d => ({
          document_type: d.document_type,
          file_name: d.file_name,
          uploaded_at: d.uploaded_at || new Date().toISOString()
        })),
        exclusions: allExclusions.map(e => ({
          document_type: e.document_type,
          notes: e.notes,
          created_at: e.created_at || new Date().toISOString()
        }))
      };

      // 2. Generate PDF
      const result = await generatePDF('tenant-completion', {
        data: reportData
      }, {
        projectName: projectName,
        // Branding automatically handled by engine
      });

      if (result.success && result.blob) {
        // 3. Upload to Storage
        const fileName = `Handover_Completion_${projectName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
        const filePath = `${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("handover-reports")
          .upload(filePath, result.blob, { contentType: "application/pdf", upsert: false });

        if (uploadError) throw uploadError;

        // 4. Save DB Record
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("handover_completion_reports").insert({
          project_id: projectId,
          report_name: fileName,
          file_path: filePath,
          file_size: result.blob.size,
          generated_by: user?.id,
          completion_percentage: stats.overallPercentage
        });

        // 5. Download
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Report generated and saved successfully",
        });
      } else {
        throw new Error(result.error || "Generation failed");
      }

    } catch (error: any) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isGenerating} variant="outline" size="sm">
      {isGenerating ? (
        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
      ) : (
        <><FileDown className="h-4 w-4 mr-2" />Export PDF Report</>
      )}
    </Button>
  );
};
