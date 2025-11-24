import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ReviewNotificationTrigger = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const triggerReview = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      toast.info("Starting application review...", {
        description: "This may take a few minutes. Findings will be emailed to arno@wmeng.co.za",
      });

      const { data, error } = await supabase.functions.invoke('send-review-findings');

      if (error) throw error;

      setResults(data);

      if (data.success) {
        toast.success("Review completed and emails sent!", {
          description: `${data.emailsSent} findings emailed to arno@wmeng.co.za`,
        });
      } else {
        toast.warning("Review completed with some issues", {
          description: `${data.emailsSent}/${data.totalFindings} emails sent successfully`,
        });
      }
    } catch (error: any) {
      console.error('Error triggering review:', error);
      toast.error("Failed to complete review", {
        description: error.message || "Please try again later",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Application Review & Email Notifications
        </CardTitle>
        <CardDescription>
          Perform a comprehensive AI-powered review of the entire application and send each finding via email to arno@wmeng.co.za
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This will analyze the application for:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>UI/UX issues and improvements</li>
              <li>Performance bottlenecks</li>
              <li>Security vulnerabilities</li>
              <li>Architecture recommendations</li>
              <li>Database design issues</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={triggerReview} 
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Review & Sending Emails...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Start Full Review & Email Findings
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Review Completed</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <div className="text-muted-foreground">Total Findings</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {results.totalFindings}
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                <div className="text-muted-foreground">Emails Sent</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {results.emailsSent}
                </div>
              </div>
            </div>

            {results.emailsFailed > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  {results.emailsFailed} email(s) failed to send. Check logs for details.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
