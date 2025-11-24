import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, MessageSquare, Copy, CheckCircle2 } from "lucide-react";

export function AIImplementationGuide() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-primary" />
          How to Implement Recommendations
        </CardTitle>
        <CardDescription>
          Turn AI insights into code improvements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-semibold mb-1">Choose Your Focus</p>
              <p className="text-muted-foreground">
                Start with <Badge variant="secondary" className="mx-1">Quick Wins</Badge> for fast improvements, 
                or <Badge variant="secondary" className="mx-1">Priority Actions</Badge> for strategic changes.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-semibold mb-1 flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copy the Implementation Prompt
              </p>
              <p className="text-muted-foreground">
                Click "Copy Implementation Prompt" and select which recommendations to include. 
                The prompt is pre-formatted for AI understanding.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-semibold mb-1 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Paste into AI Chat
              </p>
              <p className="text-muted-foreground">
                Open the Lovable AI chat (bottom right) and paste the copied prompt. 
                The AI will implement the recommendations step-by-step.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
              4
            </div>
            <div>
              <p className="font-semibold mb-1 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Review & Test
              </p>
              <p className="text-muted-foreground">
                Review each change made by the AI and test thoroughly before moving to the next recommendation.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
          <p className="text-xs text-muted-foreground">
            <strong>Pro Tip:</strong> Implement recommendations in small batches. 
            Start with 1-3 quick wins, test them, then move to priority actions. 
            This prevents overwhelming changes and makes debugging easier.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
