import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

export function DataAnalyzer() {
  const [analysisType, setAnalysisType] = useState("cost");
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeData = async () => {
    setIsAnalyzing(true);
    try {
      const projectId = localStorage.getItem("selectedProjectId");
      let dataToAnalyze: any = {};

      if (!projectId) {
        toast.error("Please select a project first");
        return;
      }

      if (analysisType === "cost") {
        const { data: costReports } = await supabase
          .from("cost_reports")
          .select("*, cost_categories(*)")
          .eq("project_id", projectId);

        dataToAnalyze = { costReports };
      } else if (analysisType === "budget") {
        const { data: budgets } = await supabase
          .from("electrical_budgets")
          .select("*, budget_sections(*)")
          .eq("project_id", projectId);

        dataToAnalyze = { budgets };
      } else {
        const { data: project } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        dataToAnalyze = { project };
      }

      const { data, error } = await supabase.functions.invoke("ai-analyze-data", {
        body: {
          analysisType,
          data: dataToAnalyze,
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      toast.success("Analysis completed successfully!");
    } catch (error) {
      console.error("Error analyzing data:", error);
      toast.error("Failed to analyze data. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Smart Data Analyzer
        </CardTitle>
        <CardDescription>
          Get AI-powered insights from your project data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="analysisType">Analysis Type</Label>
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger id="analysisType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">Cost Analysis</SelectItem>
                <SelectItem value="budget">Budget Analysis</SelectItem>
                <SelectItem value="project">Project Overview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={analyzeData} disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze Data
              </>
            )}
          </Button>

          {analysis && (
            <div className="space-y-2">
              <h3 className="font-semibold">Analysis Results</h3>
              <div className="border rounded-lg p-4 bg-muted/50 max-h-[400px] overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
