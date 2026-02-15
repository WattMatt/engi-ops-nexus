import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingDown, TrendingUp, Download, Edit2, Check, X, FileText } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PDFService } from "@/services/PDFService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CostReportOverviewProps {
  report: any;
}

export const CostReportOverview = ({ report }: CostReportOverviewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isGeneratingFullReport, setIsGeneratingFullReport] = useState(false);
  const [editValues, setEditValues] = useState({
    project_number: report.project_number,
    client_name: report.client_name,
    report_date: report.report_date,
    site_handover_date: report.site_handover_date,
    practical_completion_date: report.practical_completion_date,
    electrical_contractor: report.electrical_contractor,
    earthing_contractor: report.earthing_contractor,
    standby_plants_contractor: report.standby_plants_contractor,
    cctv_contractor: report.cctv_contractor,
  });

  const handleDownloadFullReport = async () => {
    try {
      setIsGeneratingFullReport(true);
      toast({
        title: "Generating Report",
        description: "Compiling Cost & Compliance data...",
      });
      
      await PDFService.generateProjectCompleteReport(report.project_id);
      
      toast({
        title: "Success",
        description: "Project Complete Report downloaded.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFullReport(false);
    }
  };

  const updateReportMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("cost_reports")
        .update(updates)
        .eq("id", report.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-report", report.id] });
      toast({
        title: "Success",
        description: "Report details updated successfully",
      });
      setEditingField(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update report details",
        variant: "destructive",
      });
    },
  });

  const handleSave = (field: string) => {
    updateReportMutation.mutate({ [field]: editValues[field as keyof typeof editValues] });
  };

  const handleCancel = () => {
    setEditValues({
      project_number: report.project_number,
      client_name: report.client_name,
      report_date: report.report_date,
      site_handover_date: report.site_handover_date,
      practical_completion_date: report.practical_completion_date,
      electrical_contractor: report.electrical_contractor,
      earthing_contractor: report.earthing_contractor,
      standby_plants_contractor: report.standby_plants_contractor,
      cctv_contractor: report.cctv_contractor,
    });
    setEditingField(null);
  };
  
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

  // Calculate category totals using shared utility and sort alphabetically
  const categoryTotals = calculateCategoryTotals(categories, lineItems, variations)
    .sort((a, b) => a.code.localeCompare(b.code));
  const grandTotals = calculateGrandTotals(categoryTotals);
  
  const totalOriginalBudget = grandTotals.originalBudget;
  const totalPreviousReport = grandTotals.previousReport;
  const totalAnticipatedFinal = grandTotals.anticipatedFinal;
  const currentVariance = grandTotals.currentVariance;
  const originalVariance = grandTotals.originalVariance;
  
  // Calculate variance percentages
  const currentVariancePercentage = totalPreviousReport > 0 
    ? ((Math.abs(currentVariance) / totalPreviousReport) * 100).toFixed(2)
    : "0.00";
  
  const originalVariancePercentage = totalOriginalBudget > 0 
    ? ((Math.abs(originalVariance) / totalOriginalBudget) * 100).toFixed(2)
    : "0.00";

  // Prepare chart data
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];
  
  const distributionChartData = categoryTotals.map((cat, index) => ({
    name: `${cat.code} - ${cat.description}`,
    value: cat.anticipatedFinal,
    color: COLORS[index % COLORS.length]
  }));

  const varianceChartData = categoryTotals.map((cat, index) => ({
    name: cat.code,
    variance: cat.originalVariance,
    color: COLORS[index % COLORS.length],
    fill: COLORS[index % COLORS.length]
  }));

  const budgetComparisonData = [
    {
      name: 'Budget Comparison',
      'Original Budget': totalOriginalBudget,
      'Previous Report': totalPreviousReport,
      'Anticipated Final': totalAnticipatedFinal
    }
  ];

  // Top 5 categories by value for detailed comparison
  const topCategoriesData = [...categoryTotals]
    .sort((a, b) => b.anticipatedFinal - a.anticipatedFinal)
    .slice(0, 5)
    .map(cat => ({
      name: cat.code,
      'Original Budget': cat.originalBudget,
      'Previous Report': cat.previousReport,
      'Anticipated Final': cat.anticipatedFinal
    }));

  const handleExportChart = async (elementId: string, chartName: string, format: 'png' | 'svg') => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        toast({
          title: "Error",
          description: "Chart not found",
          variant: "destructive",
        });
        return;
      }

      if (format === 'png') {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        
        const link = document.createElement('a');
        link.download = `${chartName}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (format === 'svg') {
        // For SVG export, we'll capture the chart container and convert to SVG
        // Note: This is a simplified approach - recharts doesn't provide direct SVG export
        const svgElement = element.querySelector('svg');
        if (!svgElement) {
          toast({
            title: "Error",
            description: "SVG element not found",
            variant: "destructive",
          });
          return;
        }

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `${chartName}_${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: `Chart exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export chart",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <Button 
          onClick={handleDownloadFullReport} 
          disabled={isGeneratingFullReport}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="mr-2 h-4 w-4" />
          {isGeneratingFullReport ? "Generating..." : "Download Full Project Report"}
        </Button>
      </div>

      {/* KPI Cards - add id for PDF capture */}
      <div id="cost-report-kpi-cards" className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Previous Report</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{totalPreviousReport.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
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
              Current {currentVariance < 0 ? "(Saving)" : "Extra"}
            </CardTitle>
            {currentVariance < 0 ? (
              <TrendingDown className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                currentVariance < 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              R{Math.abs(currentVariance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentVariancePercentage}% vs Previous Report
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {originalVariance < 0 ? "(Saving)" : "Extra"} vs Original
            </CardTitle>
            {originalVariance < 0 ? (
              <TrendingDown className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                originalVariance < 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              R{Math.abs(originalVariance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {originalVariancePercentage}% vs Original Budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts - add id for PDF capture */}
      {categoryTotals.length > 0 && (
        <div id="cost-report-charts" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Top Categories Comparison Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top 5 Categories Comparison</CardTitle>
                  <p className="text-sm text-muted-foreground">Budget Evolution by Category</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportChart('top-categories-chart', 'Top_Categories_Comparison', 'png')}>
                      Export as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportChart('top-categories-chart', 'Top_Categories_Comparison', 'svg')}>
                      Export as SVG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
          <CardContent>
            <div id="budget-comparison-chart">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCategoriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `R${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Original Budget" fill="#3b82f6" />
                  <Bar dataKey="Previous Report" fill="#10b981" />
                  <Bar dataKey="Anticipated Final" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
          </Card>

          {/* Category Distribution Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Category Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground">Anticipated Final Cost Breakdown</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportChart('distribution-chart', 'Category_Distribution', 'png')}>
                      Export as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportChart('distribution-chart', 'Category_Distribution', 'svg')}>
                      Export as SVG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div id="distribution-chart" className="space-y-4">
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
                          <div className="font-medium truncate">{entry.name}</div>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Variance by Category</CardTitle>
                  <p className="text-sm text-muted-foreground">Savings vs Extras Analysis</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportChart('variance-chart', 'Variance_by_Category', 'png')}>
                      Export as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportChart('variance-chart', 'Variance_by_Category', 'svg')}>
                      Export as SVG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div id="variance-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={varianceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => `R${(Math.abs(value) / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        `R${Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                        value < 0 ? 'Saving' : 'Extra'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar 
                      dataKey="variance" 
                      label={(props: any) => {
                        const { x, y, width, height, value } = props;
                        const isPositive = value >= 0;
                        const yPosition = isPositive ? y - 8 : y + height + 18;
                        const formattedValue = Math.abs(value) >= 1000000 
                          ? `${isPositive ? '+' : '-'}R${(Math.abs(value) / 1000000).toFixed(1)}M`
                          : `${isPositive ? '+' : '-'}R${Math.abs(value).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
                        
                        return (
                          <g>
                            <rect
                              x={x + width / 2 - 30}
                              y={yPosition - 10}
                              width={60}
                              height={16}
                              fill={isPositive ? '#fee2e2' : '#dcfce7'}
                              stroke={isPositive ? '#ef4444' : '#22c55e'}
                              strokeWidth={1}
                              rx={4}
                              opacity={0.9}
                            />
                            <text 
                              x={x + width / 2} 
                              y={yPosition} 
                              fill={isPositive ? '#991b1b' : '#166534'}
                              textAnchor="middle" 
                              fontSize={11}
                              fontWeight="600"
                            >
                              {formattedValue}
                            </text>
                          </g>
                        );
                      }}
                    >
                      {varianceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Custom Category Color Legend */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Category Colors</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {categoryTotals.map((cat, index) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{cat.code}</span>
                        <span className="text-xs text-muted-foreground truncate">- {cat.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                  id={`category-card-${cat.id}`}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleExportChart(`category-card-${cat.id}`, `${cat.code}-${cat.description}`, 'png')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
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

      <Card id="cost-report-project-info" className="shadow-sm group/card hover:shadow-md transition-shadow">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Project Information</CardTitle>
            <span className="text-xs text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity">
              Click fields to edit
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Project Number */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project Number</p>
              {editingField === 'project_number' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValues.project_number}
                    onChange={(e) => setEditValues({ ...editValues, project_number: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('project_number')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">{report.project_number}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('project_number')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Client */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</p>
              {editingField === 'client_name' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValues.client_name}
                    onChange={(e) => setEditValues({ ...editValues, client_name: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('client_name')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">{report.client_name}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('client_name')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Report Date */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report Date</p>
              {editingField === 'report_date' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={editValues.report_date}
                    onChange={(e) => setEditValues({ ...editValues, report_date: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('report_date')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">{format(new Date(report.report_date), "dd MMM yyyy")}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('report_date')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Site Handover */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Site Handover</p>
              {editingField === 'site_handover_date' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={editValues.site_handover_date || ''}
                    onChange={(e) => setEditValues({ ...editValues, site_handover_date: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('site_handover_date')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">
                    {report.site_handover_date ? format(new Date(report.site_handover_date), "dd MMM yyyy") : "Not set"}
                  </p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('site_handover_date')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Practical Completion */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Practical Completion</p>
              {editingField === 'practical_completion_date' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={editValues.practical_completion_date || ''}
                    onChange={(e) => setEditValues({ ...editValues, practical_completion_date: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('practical_completion_date')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">
                    {report.practical_completion_date ? format(new Date(report.practical_completion_date), "dd MMM yyyy") : "Not set"}
                  </p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('practical_completion_date')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="cost-report-contractors" className="shadow-sm group/card hover:shadow-md transition-shadow">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Contractors</CardTitle>
            <span className="text-xs text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity">
              Click fields to edit
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Electrical Contractor */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Electrical</p>
              {editingField === 'electrical_contractor' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValues.electrical_contractor || ''}
                    onChange={(e) => setEditValues({ ...editValues, electrical_contractor: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('electrical_contractor')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">{report.electrical_contractor || "Not set"}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('electrical_contractor')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Earthing Contractor */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earthing & Lightning</p>
              {editingField === 'earthing_contractor' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValues.earthing_contractor || ''}
                    onChange={(e) => setEditValues({ ...editValues, earthing_contractor: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('earthing_contractor')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">{report.earthing_contractor || "Not set"}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('earthing_contractor')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Standby Plants Contractor */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Standby Plants</p>
              {editingField === 'standby_plants_contractor' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValues.standby_plants_contractor || ''}
                    onChange={(e) => setEditValues({ ...editValues, standby_plants_contractor: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('standby_plants_contractor')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">{report.standby_plants_contractor || "Not set"}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('standby_plants_contractor')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* CCTV Contractor */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CCTV & Access Control</p>
              {editingField === 'cctv_contractor' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValues.cctv_contractor || ''}
                    onChange={(e) => setEditValues({ ...editValues, cctv_contractor: e.target.value })}
                    className="h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave('cctv_contractor')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-base font-semibold">{report.cctv_contractor || "Not set"}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingField('cctv_contractor')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
