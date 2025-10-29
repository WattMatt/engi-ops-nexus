import { useState } from "react";
import { HelpCircle, Bug, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IssueReportDialog } from "./IssueReportDialog";
import { SuggestionDialog } from "./SuggestionDialog";
import html2canvas from "html2canvas";
import { toast } from "sonner";

export function HelpButton() {
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const captureScreenshot = async (): Promise<string | null> => {
    setIsCapturing(true);
    
    try {
      // Hide the help button during capture
      const helpButton = document.querySelector('[data-help-button]') as HTMLElement;
      if (helpButton) {
        helpButton.style.display = 'none';
      }

      // Small delay to ensure button is hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Show the help button again
      if (helpButton) {
        helpButton.style.display = '';
      }

      setIsCapturing(false);
      return dataUrl;
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      toast.error('Failed to capture screenshot, but you can still submit your feedback');
      
      // Make sure to show button again
      const helpButton = document.querySelector('[data-help-button]') as HTMLElement;
      if (helpButton) {
        helpButton.style.display = '';
      }
      
      setIsCapturing(false);
      return null;
    }
  };

  const handleIssueClick = async () => {
    const screenshotData = await captureScreenshot();
    setScreenshot(screenshotData);
    setIssueDialogOpen(true);
  };

  const handleSuggestionClick = async () => {
    const screenshotData = await captureScreenshot();
    setScreenshot(screenshotData);
    setSuggestionDialogOpen(true);
  };

  return (
    <>
      <div 
        className="fixed bottom-6 right-6 z-50"
        data-help-button
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              disabled={isCapturing}
              aria-label="Help and feedback"
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleIssueClick}>
              <Bug className="mr-2 h-4 w-4" />
              Report an Issue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSuggestionClick}>
              <Lightbulb className="mr-2 h-4 w-4" />
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
    </>
  );
}
