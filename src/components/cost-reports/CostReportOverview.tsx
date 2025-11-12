import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";

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

  const { data: lineItems = [] } = useQuery({
    queryKey: ["all-line-items-overview", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_line_items")
        .select("*, cost_categories!inner(cost_report_id)")
        .eq("cost_categories.cost_report_id", report.id);
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

  // Calculate category totals using shared utility
  const categoryTotals = calculateCategoryTotals(categories, lineItems, variations);
  const grandTotals = calculateGrandTotals(categoryTotals);
  
  const totalOriginalBudget = grandTotals.originalBudget;
  const totalAnticipatedFinal = grandTotals.anticipatedFinal;
  const totalVariance = grandTotals.originalVariance;
  
  // Calculate variance percentage
  const variancePercentage = totalOriginalBudget > 0 
    ? ((Math.abs(totalVariance) / totalOriginalBudget) * 100).toFixed(2)
    : "0.00";

  // Prepare chart data
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];
  
  const distributionChartData = categoryTotals.map((cat, index) => ({
    name: `${cat.code} - ${cat.description}`,
    value: cat.anticipatedFinal,
    color: COLORS[index % COLORS.length]
  }));

  const varianceChartData = categoryTotals.map((cat) => ({
    name: cat.code,
    saving: cat.originalVariance < 0 ? Math.abs(cat.originalVariance) : 0,
    extra: cat.originalVariance >= 0 ? cat.originalVariance : 0,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards - add id for PDF capture */}
      <div id="cost-report-kpi-cards" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              {totalVariance < 0 ? "Total Saving" : "Total Extra"}
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
              {variancePercentage}% vs Original Budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts - add id for PDF capture */}
      {categoryTotals.length > 0 && (
        <div id="cost-report-charts" className="grid gap-4 md:grid-cols-2">
          {/* Category Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <p className="text-sm text-muted-foreground">Anticipated Final Cost Breakdown</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pie Chart */}
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={distributionChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={90}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {distributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {distributionChartData.map((entry, index) => {
                    const total = distributionChartData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = ((entry.value / total) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                        <div 
                          className="w-3 h-3 rounded-sm flex-shrink-0" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{entry.name.split(' - ')[0]}</div>
                          <div className="text-xs text-muted-foreground">
                            {percentage}% • R{entry.value.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variance Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Variance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={varianceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Bar dataKey="saving" fill="#22c55e" name="Savings" />
                  <Bar dataKey="extra" fill="#ef4444" name="Extras" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Breakdown - add id for PDF capture */}
      {categoryTotals.length > 0 && (
        <Card id="cost-report-category-cards">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {categoryTotals.map((cat, index) => (
                <Card 
                  key={cat.id} 
                  className="border-l-[6px] shadow-sm hover:shadow-md transition-shadow" 
                  style={{ borderLeftColor: COLORS[index % COLORS.length] }}
                >
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className="flex items-center justify-center min-w-[44px] w-11 h-11 rounded-lg text-white font-bold text-base shadow-sm"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        >
                          {cat.code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base leading-tight break-words">
                            {cat.description}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Original Budget
                            </span>
                          </div>
                          <div className="font-mono text-base font-semibold">
                            R{cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Anticipated Final
                            </span>
                          </div>
                          <div className="font-mono text-base font-semibold">
                            R{cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t-2 border-border">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Variance
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className={`font-mono text-lg font-bold ${cat.originalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {cat.originalVariance < 0 ? '-' : '+'}R{Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </span>
                              <span 
                                className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full ${
                                  cat.originalVariance < 0 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {cat.originalVariance < 0 ? 'Saving' : 'Extra'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card id="cost-report-project-info" className="shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-xl">Project Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project Number</p>
              <p className="text-base font-semibold">{report.project_number}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</p>
              <p className="text-base font-semibold">{report.client_name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report Date</p>
              <p className="text-base font-semibold">{format(new Date(report.report_date), "dd MMM yyyy")}</p>
            </div>
            {report.site_handover_date && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Site Handover</p>
                <p className="text-base font-semibold">
                  {format(new Date(report.site_handover_date), "dd MMM yyyy")}
                </p>
              </div>
            )}
            {report.practical_completion_date && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Practical Completion</p>
                <p className="text-base font-semibold">
                  {format(new Date(report.practical_completion_date), "dd MMM yyyy")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(report.electrical_contractor ||
        report.earthing_contractor ||
        report.standby_plants_contractor ||
        report.cctv_contractor) && (
        <Card id="cost-report-contractors" className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-xl">Contractors</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {report.electrical_contractor && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Electrical</p>
                  <p className="text-base font-semibold">{report.electrical_contractor}</p>
                </div>
              )}
              {report.earthing_contractor && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earthing & Lightning</p>
                  <p className="text-base font-semibold">{report.earthing_contractor}</p>
                </div>
              )}
              {report.standby_plants_contractor && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Standby Plants</p>
                  <p className="text-base font-semibold">{report.standby_plants_contractor}</p>
                </div>
              )}
              {report.cctv_contractor && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CCTV & Access Control</p>
                  <p className="text-base font-semibold">{report.cctv_contractor}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {report.notes && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-xl">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-base leading-relaxed">{report.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
