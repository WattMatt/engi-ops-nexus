import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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

  // Calculate category totals
  const categoryTotals = categories.map(category => {
    const isVariationsCategory = category.description?.toUpperCase().includes("VARIATION");
    
    if (isVariationsCategory) {
      // For variations category, sum from variations table
      const anticipatedFinal = variations.reduce(
        (sum, v) => sum + Number(v.amount || 0),
        0
      );
      
      return {
        ...category,
        originalBudget: 0,
        previousReport: 0,
        anticipatedFinal,
        currentVariance: anticipatedFinal,
        originalVariance: anticipatedFinal
      };
    } else {
      // For regular categories, sum line items
      const items = lineItems.filter(item => item.category_id === category.id);
      const originalBudget = items.reduce((sum, item) => sum + Number(item.original_budget || 0), 0);
      const previousReport = items.reduce((sum, item) => sum + Number(item.previous_report || 0), 0);
      const anticipatedFinal = items.reduce((sum, item) => sum + Number(item.anticipated_final || 0), 0);
      
      return {
        ...category,
        originalBudget,
        previousReport,
        anticipatedFinal,
        currentVariance: anticipatedFinal - previousReport,
        originalVariance: anticipatedFinal - originalBudget
      };
    }
  });

  const totalOriginalBudget = categoryTotals.reduce(
    (sum, cat) => sum + cat.originalBudget,
    0
  );
  
  const categoriesAnticipatedTotal = categoryTotals.reduce(
    (sum, cat) => sum + cat.anticipatedFinal,
    0
  );
  
  const totalAnticipatedFinal = categoriesAnticipatedTotal; // Variations already included in categories
  const totalVariance = totalAnticipatedFinal - totalOriginalBudget;

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

      {/* Visual Charts */}
      {categoryTotals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
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

      {/* Category Breakdown */}
      {categoryTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTotals.map((cat, index) => (
                <Card key={cat.id} className="border-l-4" style={{ borderLeftColor: COLORS[index % COLORS.length] }}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex items-center justify-center w-8 h-8 rounded-md text-white font-bold text-sm"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          >
                            {cat.code}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm leading-tight">{cat.description}</h4>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-muted-foreground">Original Budget</span>
                          <span className="font-mono text-sm font-medium">
                            R{cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-muted-foreground">Anticipated Final</span>
                          <span className="font-mono text-sm font-medium">
                            R{cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-medium">Variance</span>
                            <span className={`font-mono text-sm font-bold ${cat.originalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {cat.originalVariance < 0 ? '-' : '+'}R{Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground text-right mt-1">
                            {cat.originalVariance < 0 ? 'Saving' : 'Extra'}
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
