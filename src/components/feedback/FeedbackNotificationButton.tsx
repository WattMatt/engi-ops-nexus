import { useState } from "react";
import { HelpCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useFeedbackNotifications } from "@/hooks/useFeedbackNotifications";
import { IssueReportDialog } from "./IssueReportDialog";
import { SuggestionDialog } from "./SuggestionDialog";
import { FeedbackHistoryDialog } from "./FeedbackHistoryDialog";

export const FeedbackNotificationButton = () => {
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string>("");
  const { unverifiedCount } = useFeedbackNotifications();

  const handleIssueClick = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(document.body);
    const screenshot = canvas.toDataURL("image/png");
    setScreenshot(screenshot);
    setIssueDialogOpen(true);
  };

  const handleSuggestionClick = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(document.body);
    const screenshot = canvas.toDataURL("image/png");
    setScreenshot(screenshot);
    setSuggestionDialogOpen(true);
  };

  const hasUnverified = unverifiedCount > 0;
  const Icon = hasUnverified ? AlertCircle : HelpCircle;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className={`h-14 w-14 rounded-full shadow-lg ${
                hasUnverified
                  ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              <Icon className="h-6 w-6" />
              {hasUnverified && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                >
                  {unverifiedCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setHistoryDialogOpen(true)}>
              <span className="flex items-center justify-between w-full">
                My Feedback
                {hasUnverified && (
                  <Badge variant="destructive" className="ml-2">
                    {unverifiedCount}
                  </Badge>
                )}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleIssueClick}>
              Report an Issue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSuggestionClick}>
              Submit a Suggestion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <IssueReportDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        screenshot={screenshot}
      />

      <SuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
        screenshot={screenshot}
      />

      <FeedbackHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />
    </>
  );
};
