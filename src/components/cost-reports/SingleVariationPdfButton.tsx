import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import {
  buildVariationSheetsSvg,
  applyPageFooters,
  type VariationSheetData,
} from "@/utils/svg-pdf/costReportPdfBuilder";
import { buildStandardCoverPageSvg } from "@/utils/svg-pdf/sharedSvgHelpers";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SingleVariationPdfButtonProps {
  variation: any;
  reportProjectName?: string;
  reportNumber?: number;
}

export const SingleVariationPdfButton = ({
  variation,
  reportProjectName,
  reportNumber,
}: SingleVariationPdfButtonProps) => {
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    const buildFn = async () => {
      const companyData = await fetchCompanyData();
      const pages: SVGSVGElement[] = [];

      // Cover page
      const coverData: StandardCoverPageData = {
        reportTitle: "Variation Sheet",
        reportSubtitle: `${variation.code} — ${variation.description}`,
        projectName: reportProjectName || "Project",
        revision: "Rev.0",
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };
      pages.push(buildStandardCoverPageSvg(coverData));

      // Variation sheet page(s)
      const sheet: VariationSheetData = {
        code: variation.code || "",
        description: variation.description || "",
        amount: Number(variation.amount || 0),
        isCredit: !!variation.is_credit,
        lineItems: (variation.line_items || []).map((li: any) => ({
          line_number: li.line_number || 0,
          description: li.description || "",
          quantity: Number(li.quantity || 0),
          rate: Number(li.rate || 0),
          amount: Number(li.amount || 0),
          comments: li.comments || "",
        })),
      };
      pages.push(...buildVariationSheetsSvg([sheet]));

      applyPageFooters(pages);
      return pages;
    };

    await generateAndPersist(buildFn, {
      storageBucket: "cost-report-pdfs",
      dbTable: "cost_report_pdfs",
      foreignKeyColumn: "cost_report_id",
      foreignKeyValue: variation.cost_report_id,
      reportName: `Variation_${variation.code}_${reportProjectName || "Project"}`,
      customInsertData: {
        file_name: `Variation_${variation.code}_${reportProjectName || "Project"}`,
      },
    });

    setLoading(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={isGenerating || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Export this variation as PDF</TooltipContent>
    </Tooltip>
  );
};
