import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

export function CostPredictor() {
  const [prediction, setPrediction] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [dataPoints, setDataPoints] = useState(0);
  const [parameters, setParameters] = useState({
    projectSize: "",
    complexity: "medium",
    timeline: "",
    location: "",
  });

  const predictCosts = async () => {
    setIsPredicting(true);
    try {
      const projectId = localStorage.getItem("selectedProjectId");

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

      setPrediction(data.prediction);
      setDataPoints(data.historicalDataPoints);
      toast.success("Cost prediction generated successfully!");
    } catch (error) {
      console.error("Error predicting costs:", error);
      toast.error("Failed to generate prediction. Please try again.");
    } finally {
      setIsPredicting(false);
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

          {prediction && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Cost Prediction Analysis</h3>
              </div>
              <div className="border rounded-lg p-4 bg-muted/50 max-h-[500px] overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{prediction}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
