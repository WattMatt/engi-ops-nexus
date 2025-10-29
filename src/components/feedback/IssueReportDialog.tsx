import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IssueReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshot: string | null;
}

export function IssueReportDialog({ open, onOpenChange, screenshot }: IssueReportDialogProps) {
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Please provide a description of the issue");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to report an issue");
        setIsSubmitting(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Upload screenshot if available
      let screenshotUrl = null;
      if (screenshot) {
        const blob = await (await fetch(screenshot)).blob();
        const fileName = `${user.id}/${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('issue-screenshots')
          .upload(fileName, blob, {
            contentType: 'image/png',
          });

        if (uploadError) {
          console.error('Screenshot upload failed:', uploadError);
          toast.error('Failed to upload screenshot, but continuing with submission');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('issue-screenshots')
            .getPublicUrl(uploadData.path);
          screenshotUrl = publicUrl;
        }
      }

      // Collect browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
      };

      // Insert issue report
      const { error: insertError } = await supabase
        .from('issue_reports')
        .insert({
          reported_by: user.id,
          user_email: profile?.email || user.email || '',
          user_name: profile?.full_name || '',
          description: description.trim(),
          severity,
          category,
          screenshot_url: screenshotUrl,
          page_url: window.location.href,
          browser_info: browserInfo,
        });

      if (insertError) throw insertError;

      toast.success("Issue reported successfully! We'll look into it.");
      
      // Reset form
      setDescription("");
      setSeverity("medium");
      setCategory("general");
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit issue report:', error);
      toast.error("Failed to submit issue report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs, errors, or problems you've encountered.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {screenshot && (
            <div className="space-y-2">
              <Label>Screenshot</Label>
              <div className="rounded-lg border overflow-hidden">
                <img 
                  src={screenshot} 
                  alt="Screenshot" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                  <SelectItem value="medium">Medium - Impacts workflow</SelectItem>
                  <SelectItem value="high">High - Blocks critical tasks</SelectItem>
                  <SelectItem value="critical">Critical - System down</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="ui-bug">UI Bug</SelectItem>
                  <SelectItem value="data-error">Data Error</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="feature-request">Feature Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
