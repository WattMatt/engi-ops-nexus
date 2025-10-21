import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

interface CostReportOverviewProps {
  report: any;
}

export const CostReportOverview = ({ report }: CostReportOverviewProps) => {
  const { data: categories = [] } = useQuery({
    queryKey: ["cost-categories", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("cost_report_id", report.id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: variations = [] } = useQuery({
    queryKey: ["cost-variations-overview", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_variations")
        .select("*")
        .eq("cost_report_id", report.id);
      if (error) throw error;
      return data || [];
    },
  });

  const totalOriginalBudget = categories.reduce(
    (sum, cat) => sum + Number(cat.original_budget),
    0
  );
  
  const categoriesAnticipatedTotal = categories.reduce(
    (sum, cat) => sum + Number(cat.anticipated_final),
    0
  );
  
  const totalVariations = variations.reduce(
    (sum, v) => sum + (v.is_credit ? -Number(v.amount) : Number(v.amount)),
    0
  );
  
  const totalAnticipatedFinal = categoriesAnticipatedTotal + totalVariations;
  const totalVariance = totalAnticipatedFinal - totalOriginalBudget;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Original Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{totalOriginalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anticipated Final</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{totalAnticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {totalVariance < 0 ? "Saving" : "Extra"}
            </CardTitle>
            {totalVariance < 0 ? (
              <TrendingDown className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalVariance < 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              R{Math.abs(totalVariance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {((Math.abs(totalVariance) / totalOriginalBudget) * 100).toFixed(2)}% variance
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Project Number</p>
            <p className="text-lg">{report.project_number}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Client</p>
            <p className="text-lg">{report.client_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Report Date</p>
            <p className="text-lg">{format(new Date(report.report_date), "dd MMM yyyy")}</p>
          </div>
          {report.site_handover_date && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Site Handover</p>
              <p className="text-lg">
                {format(new Date(report.site_handover_date), "dd MMM yyyy")}
              </p>
            </div>
          )}
          {report.practical_completion_date && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Practical Completion</p>
              <p className="text-lg">
                {format(new Date(report.practical_completion_date), "dd MMM yyyy")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {(report.electrical_contractor ||
        report.earthing_contractor ||
        report.standby_plants_contractor ||
        report.cctv_contractor) && (
        <Card>
          <CardHeader>
            <CardTitle>Contractors</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {report.electrical_contractor && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Electrical</p>
                <p className="text-lg">{report.electrical_contractor}</p>
              </div>
            )}
            {report.earthing_contractor && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Earthing & Lightning</p>
                <p className="text-lg">{report.earthing_contractor}</p>
              </div>
            )}
            {report.standby_plants_contractor && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Standby Plants</p>
                <p className="text-lg">{report.standby_plants_contractor}</p>
              </div>
            )}
            {report.cctv_contractor && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">CCTV & Access Control</p>
                <p className="text-lg">{report.cctv_contractor}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {report.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{report.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
