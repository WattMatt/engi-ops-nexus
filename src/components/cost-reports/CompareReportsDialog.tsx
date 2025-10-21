import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GitCompare, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CompareReportsDialogProps {
  currentReportId: string;
  projectId: string;
}

export const CompareReportsDialog = ({
  currentReportId,
  projectId,
}: CompareReportsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  const { data: reports = [] } = useQuery({
    queryKey: ["cost-reports-for-comparison", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_reports")
        .select("*")
        .eq("project_id", projectId)
        .neq("id", currentReportId)
        .order("report_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: currentCategories = [] } = useQuery({
    queryKey: ["current-categories", currentReportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("cost_report_id", currentReportId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: compareCategories = [] } = useQuery({
    queryKey: ["compare-categories", selectedReportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("cost_report_id", selectedReportId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedReportId,
  });

  const currentTotal = currentCategories.reduce(
    (sum, cat) => sum + Number(cat.anticipated_final),
    0
  );
  const compareTotal = compareCategories.reduce(
    (sum, cat) => sum + Number(cat.anticipated_final),
    0
  );
  const totalDifference = currentTotal - compareTotal;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <GitCompare className="mr-2 h-4 w-4" />
          Compare Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Cost Reports</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Report to Compare</Label>
            <Select value={selectedReportId} onValueChange={setSelectedReportId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    Report #{report.report_number} -{" "}
                    {new Date(report.report_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReportId && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Report Total</p>
                      <p className="text-xl font-bold">
                        R{currentTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Previous Report Total</p>
                      <p className="text-xl font-bold">
                        R{compareTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Difference</p>
                      <div className="flex items-center gap-2">
                        {totalDifference > 0 ? (
                          <TrendingUp className="h-5 w-5 text-red-600" />
                        ) : totalDifference < 0 ? (
                          <TrendingDown className="h-5 w-5 text-green-600" />
                        ) : null}
                        <p
                          className={`text-xl font-bold ${
                            totalDifference > 0
                              ? "text-red-600"
                              : totalDifference < 0
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {totalDifference > 0 ? "+" : ""}R
                          {Math.abs(totalDifference).toLocaleString("en-ZA", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left text-sm">
                          <th className="p-2">Category</th>
                          <th className="p-2 text-right">Current</th>
                          <th className="p-2 text-right">Previous</th>
                          <th className="p-2 text-right">Change</th>
                          <th className="p-2 text-right">% Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCategories.map((currentCat) => {
                          const compareCat = compareCategories.find(
                            (c) => c.code === currentCat.code
                          );
                          const currentValue = Number(currentCat.anticipated_final);
                          const compareValue = compareCat
                            ? Number(compareCat.anticipated_final)
                            : 0;
                          const difference = currentValue - compareValue;
                          const percentChange =
                            compareValue !== 0
                              ? ((difference / compareValue) * 100).toFixed(2)
                              : "N/A";

                          return (
                            <tr key={currentCat.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">
                                {currentCat.code} - {currentCat.description}
                              </td>
                              <td className="p-2 text-right">
                                R{currentValue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 text-right">
                                R{compareValue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                              </td>
                              <td
                                className={`p-2 text-right font-medium ${
                                  difference > 0
                                    ? "text-red-600"
                                    : difference < 0
                                    ? "text-green-600"
                                    : ""
                                }`}
                              >
                                {difference > 0 ? "+" : ""}R
                                {Math.abs(difference).toLocaleString("en-ZA", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td
                                className={`p-2 text-right ${
                                  difference > 0
                                    ? "text-red-600"
                                    : difference < 0
                                    ? "text-green-600"
                                    : ""
                                }`}
                              >
                                {percentChange !== "N/A"
                                  ? `${Number(percentChange) > 0 ? "+" : ""}${percentChange}%`
                                  : percentChange}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
