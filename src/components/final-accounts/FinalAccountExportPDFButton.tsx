import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildFinalAccountPdf, type FinalAccountPdfData } from "@/utils/svg-pdf/finalAccountPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface FinalAccountExportPDFButtonProps {
  account: any;
}

export const FinalAccountExportPDFButton = ({ account }: FinalAccountExportPDFButtonProps) => {
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  const handleExport = async () => {
    const buildFn = async () => {
      // Fetch bills, sections, items
      const { data: bills } = await supabase
        .from("final_account_bills")
        .select("*")
        .eq("final_account_id", account.id)
        .order("bill_number");

      const billsWithData = [];
      for (const bill of bills || []) {
        const { data: sections } = await supabase
          .from("final_account_sections")
          .select("*")
          .eq("bill_id", bill.id)
          .order("display_order");

        const sectionsWithItems = [];
        for (const section of sections || []) {
          const { data: items } = await supabase
            .from("final_account_items")
            .select("*")
            .eq("section_id", section.id)
            .order("display_order");
          sectionsWithItems.push({ ...section, items: items || [] });
        }
        billsWithData.push({ ...bill, sections: sectionsWithItems });
      }

      // Fetch company data for cover page
      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Final Account",
        reportSubtitle: `Account #${account.account_number}`,
        projectName: account.account_name || "Final Account",
        revision: account.submission_date ? format(new Date(account.submission_date), "dd MMM yyyy") : undefined,
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };

      const pdfData: FinalAccountPdfData = { account, bills: billsWithData, coverData };
      return buildFinalAccountPdf(pdfData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: "final-account-reports",
      dbTable: "final_account_reports",
      foreignKeyColumn: "final_account_id",
      foreignKeyValue: account.id,
      reportName: `Final_Account_${account.account_number}`,
    });
  };

  return (
    <Button onClick={handleExport} disabled={isGenerating}>
      {isGenerating ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
      ) : (
        <><Download className="mr-2 h-4 w-4" />Export PDF</>
      )}
    </Button>
  );
};
