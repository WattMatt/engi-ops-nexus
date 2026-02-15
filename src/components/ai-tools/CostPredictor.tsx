import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2, DollarSign, PieChart, BarChart3, TrendingDown, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildAiPredictionPages } from "@/utils/svg-pdf/aiPredictionPdfBuilder";
import {
  PieChart as RechartsePie,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

interface PredictionData {
  summary: {
    totalEstimate: number;
    confidenceLevel: number;
    currency: string;
  };
  costBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  historicalTrend: Array<{
    project: string;
    budgeted: number;
    actual: number;
  }>;
  riskFactors: Array<{
    risk: string;
    probability: number;
    impact: number;
  }>;
  analysis: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export function CostPredictor() {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [dataPoints, setDataPoints] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [parameters, setParameters] = useState({
    projectSize: "",
    complexity: "medium",
    timeline: "",
    location: "",
  });

  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  useEffect(() => {
    loadProjectInfo();
  }, []);

  const loadProjectInfo = async () => {
    const pid = localStorage.getItem("selectedProjectId");
    if (!pid) return;
    setProjectId(pid);

    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", pid)
      .single();

    if (project) {
      setProjectName(project.name || "");
      setProjectNumber(project.project_number || "");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const predictCosts = async () => {
    setIsPredicting(true);
    try {
      if (!projectId) {
        toast.error("Please select a project first");
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-predict-costs", {
        body: {
          projectId,
          projectParameters: parameters,
        },
      });

      if (error) throw error;

      setPredictionData(data);
      setDataPoints(data.historicalDataPoints);
      toast.success("Cost prediction generated successfully!");
    } catch (error) {
      console.error("Error predicting costs:", error);
      toast.error("Failed to generate prediction. Please try again.");
    } finally {
      setIsPredicting(false);
    }
  };


  const handleExportPDF = async () => {
    if (!predictionData || !projectId) {
      toast.error("No prediction data to export");
      return;
    }

    try {
      const coverData = await fetchCompanyData();
      await generateAndPersist(
        () => buildAiPredictionPages({
          predictionData,
          projectName,
          projectNumber,
          parameters,
          coverData,
        }),
        {
          storageBucket: 'ai-prediction-reports',
          dbTable: 'ai_prediction_reports',
          foreignKeyColumn: 'project_id',
          foreignKeyValue: projectId,
          projectId,
          reportName: 'AI Cost Prediction',
        },
      );
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          AI Cost Prediction
        </CardTitle>
        <CardDescription>
          Forecast project costs based on historical data and project parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectSize">Project Size (sq.m or units)</Label>
              <Input
                id="projectSize"
                type="text"
                placeholder="e.g., 5000 sq.m"
                value={parameters.projectSize}
                onChange={(e) =>
                  setParameters((prev) => ({ ...prev, projectSize: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Expected Timeline (months)</Label>
              <Input
                id="timeline"
                type="text"
                placeholder="e.g., 12 months"
                value={parameters.timeline}
                onChange={(e) =>
                  setParameters((prev) => ({ ...prev, timeline: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complexity">Project Complexity</Label>
              <select
                id="complexity"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={parameters.complexity}
                onChange={(e) =>
                  setParameters((prev) => ({ ...prev, complexity: e.target.value }))
                }
              >
                <option value="low">Low - Standard installation</option>
                <option value="medium">Medium - Moderate complexity</option>
                <option value="high">High - Complex systems</option>
                <option value="very-high">Very High - Advanced/specialized</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location/Region</Label>
              <Input
                id="location"
                type="text"
                placeholder="e.g., Urban/Rural, City name"
                value={parameters.location}
                onChange={(e) =>
                  setParameters((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>
          </div>

          <Button onClick={predictCosts} disabled={isPredicting} className="w-full">
            {isPredicting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Historical Data...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Generate Cost Prediction
              </>
            )}
          </Button>

          {dataPoints > 0 && !isPredicting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Analysis based on {dataPoints} historical data points</span>
            </div>
          )}

          {predictionData && (
            <div className="flex justify-end mb-4">
              <Button onClick={handleExportPDF} variant="outline" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export to PDF
                  </>
                )}
              </Button>
            </div>
          )}

          {predictionData && (
            <div id="prediction-charts" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Estimated Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(predictionData.summary.totalEstimate)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Confidence Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {predictionData.summary.confidenceLevel}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Data Points Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dataPoints}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Cost Breakdown Pie Chart */}
                {predictionData.costBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <PieChart className="h-4 w-4" />
                        Cost Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsePie>
                          <Pie
                            data={predictionData.costBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ category, percentage }) =>
                              `${category}: ${percentage}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                          >
                            {predictionData.costBreakdown.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </RechartsePie>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Factors Bar Chart */}
                {predictionData.riskFactors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingDown className="h-4 w-4" />
                        Risk Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={predictionData.riskFactors}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="risk"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval={0}
                          />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="probability"
                            fill="#8884d8"
                            name="Probability (%)"
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="impact"
                            fill="#82ca9d"
                            name="Impact (ZAR)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Historical Trend Line Chart */}
              {predictionData.historicalTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      Historical Cost Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={predictionData.historicalTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="project" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="budgeted"
                          stroke="#8884d8"
                          name="Budgeted"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#82ca9d"
                          name="Actual"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{predictionData.analysis}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
