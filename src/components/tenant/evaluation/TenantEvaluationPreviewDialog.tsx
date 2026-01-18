import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
}

interface TenantEvaluation {
  id: string;
  tenant_id: string;
  evaluation_date: string;
  evaluated_by: string;
  revision: number;
  status: string;
}

interface TenantEvaluationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: TenantEvaluation;
  tenant: Tenant;
  projectName: string;
}

export function TenantEvaluationPreviewDialog({
  open,
  onOpenChange,
  evaluation,
  tenant,
  projectName,
}: TenantEvaluationPreviewDialogProps) {
  // Fetch saved report
  const { data: report } = useQuery({
    queryKey: ["tenant-evaluation-report", evaluation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_evaluation_reports")
        .select("*")
        .eq("evaluation_id", evaluation.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: open,
  });

  // Transform report to match StandardReportPreview expected format
  const previewReport = report ? {
    ...report,
    report_name: report.report_name || `Evaluation - ${tenant.shop_number} Rev ${evaluation.revision}`,
    projects: { name: `${projectName} • ${tenant.shop_name}` }
  } : null;

  if (!previewReport) {
    // Show empty state if no report found - handled by StandardReportPreview when report is null
    return null;
  }

  return (
    <StandardReportPreview
      report={previewReport}
      open={open}
      onOpenChange={onOpenChange}
      storageBucket="tenant-evaluation-reports"
      reportType="evaluation"
    />
  );
}
