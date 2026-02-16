import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ReportOptionsDialog, ReportOptions } from "./ReportOptionsDialog";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildTenantReportPdf, type TenantReportPdfData, type TenantForPdf } from "@/utils/svg-pdf/tenantReportPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
import { format } from "date-fns";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size_allowance: string | null;
  db_size_scope_of_work: string | null;
  shop_category: string;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  cost_reported: boolean;
  layout_image_url?: string | null;
}

interface TenantReportGeneratorProps {
  tenants: Tenant[];
  projectId: string;
  projectName: string;
}

export const TenantReportGenerator = ({ tenants, projectId, projectName }: TenantReportGeneratorProps) => {
  const { isGenerating, generateAndPersist, fetchCompanyData } = useSvgPdfReport();
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerateReport = async (options: ReportOptions) => {
    const includedTenants = tenants.filter(t => !options.excludedTenantIds.includes(t.id));
    
    if (includedTenants.length === 0) {
      toast.error("No tenants selected for report. Please include at least one tenant.");
      return;
    }

    setOptionsDialogOpen(false);

    // Get next revision number
    const { data: existingReports } = await supabase
      .from('tenant_tracker_reports')
      .select('revision_number')
      .eq('project_id', projectId)
      .order('revision_number', { ascending: false })
      .limit(1);

    const nextRevision = existingReports && existingReports.length > 0 
      ? existingReports[0].revision_number + 1 
      : 0;

    // Fetch floor plan image if needed
    let floorPlanImageBase64: string | undefined;
    if (options.includeFloorPlan) {
      try {
        const { data: floorPlanRecord } = await supabase
          .from('project_floor_plans')
          .select('composite_image_url')
          .eq('project_id', projectId)
          .maybeSingle();

        if (floorPlanRecord?.composite_image_url) {
          const imageUrl = `${floorPlanRecord.composite_image_url}?t=${Date.now()}`;
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          floorPlanImageBase64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.error('Error fetching floor plan:', error);
      }
    }

    const buildFn = async () => {
      const companyData = await fetchCompanyData();
      
      const tenantData: TenantForPdf[] = includedTenants.map(t => ({
        shopNumber: t.shop_number,
        shopName: t.shop_name,
        category: t.shop_category,
        area: t.area,
        dbAllowance: t.db_size_allowance,
        dbScopeOfWork: t.db_size_scope_of_work,
        sowReceived: t.sow_received,
        layoutReceived: t.layout_received,
        dbOrdered: t.db_ordered,
        dbCost: t.db_cost,
        lightingOrdered: t.lighting_ordered,
        lightingCost: t.lighting_cost,
        costReported: t.cost_reported,
      }));

      const pdfData: TenantReportPdfData = {
        coverData: {
          ...companyData,
          reportTitle: 'TENANT TRACKER REPORT',
          reportSubtitle: 'Tenant Schedule & Progress Analysis',
          projectName,
          revision: `Rev.${nextRevision}`,
          date: format(new Date(), 'dd MMMM yyyy'),
        } as StandardCoverPageData,
        projectName,
        tenants: tenantData,
        options: {
          includeCoverPage: options.includeCoverPage,
          includeTableOfContents: options.includeTableOfContents,
          includeKPIPage: options.includeKPIPage,
          includeFloorPlan: options.includeFloorPlan,
          includeTenantSchedule: options.includeTenantSchedule,
          floorPlanImageBase64,
        },
      };

      return buildTenantReportPdf(pdfData);
    };

    const result = await generateAndPersist(buildFn, {
      storageBucket: 'tenant-tracker-reports',
      dbTable: 'tenant_tracker_reports',
      foreignKeyColumn: 'project_id',
      foreignKeyValue: projectId,
      revision: `R${String(nextRevision).padStart(2, '0')}`,
      reportName: `Tenant_Report_${projectName.replace(/\s+/g, '_')}_Rev${nextRevision}`,
    });

    if (result) {
      // Update with tenant-specific metadata
      const totalArea = includedTenants.reduce((sum, t) => sum + (t.area || 0), 0);
      const totalDbCost = includedTenants.reduce((sum, t) => sum + (t.db_cost || 0), 0);
      const totalLightingCost = includedTenants.reduce((sum, t) => sum + (t.lighting_cost || 0), 0);

      queryClient.invalidateQueries({ queryKey: ['tenant-tracker-reports', projectId] });
      toast.success(`Report saved as Rev.${nextRevision}`);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOptionsDialogOpen(true)}
        disabled={isGenerating || tenants.length === 0}
        variant="default"
        size="default"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Generate Report
          </>
        )}
      </Button>

      <ReportOptionsDialog
        open={optionsDialogOpen}
        onOpenChange={setOptionsDialogOpen}
        onGenerate={handleGenerateReport}
        isGenerating={isGenerating}
        projectId={projectId}
        tenants={tenants.map(t => ({ id: t.id, shop_name: t.shop_name, shop_number: t.shop_number }))}
      />
    </>
  );
};
