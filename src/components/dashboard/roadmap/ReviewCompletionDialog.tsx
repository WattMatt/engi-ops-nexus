import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Send, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ItemUpdate {
  itemId: string;
  title: string;
  wasCompleted: boolean;
  isNowCompleted: boolean;
  notes?: string;
}

interface ReviewCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  reviewSessionId: string;
  itemUpdates: ItemUpdate[];
  onComplete: () => void;
}

export function ReviewCompletionDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  reviewSessionId,
  itemUpdates,
  onComplete,
}: ReviewCompletionDialogProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch share tokens to show recipients
  const { data: recipients = [] } = useQuery({
    queryKey: ["roadmap-share-tokens", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_share_tokens")
        .select("reviewer_email, reviewer_name, expires_at")
        .eq("project_id", projectId);
      if (error) throw error;
      
      // Filter out expired tokens
      const now = new Date();
      return (data || []).filter(token => {
        if (!token.expires_at) return true;
        return new Date(token.expires_at) > now;
      });
    },
    enabled: open,
  });

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.info("No recipients - roadmap hasn't been shared with anyone yet");
      onComplete();
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("send-roadmap-review-update", {
        body: {
          projectId,
          reviewSessionId,
          message: message || undefined,
          itemUpdates,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send update");
      }

      toast.success(response.data.message || "Review update sent successfully!");
      onComplete();
    } catch (error: any) {
      console.error("Error sending review update:", error);
      toast.error(error.message || "Failed to send review update");
    } finally {
      setIsSending(false);
    }
  };

  const completedItems = itemUpdates.filter(u => !u.wasCompleted && u.isNowCompleted);
  const uncheckedItems = itemUpdates.filter(u => u.wasCompleted && !u.isNowCompleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Review & Send Update</DialogTitle>
          <DialogDescription>
            Review your changes and send a consolidated update to all shared recipients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{completedItems.length}</p>
                <p className="text-xs text-muted-foreground">Items completed</p>
              </div>
            </div>
            {uncheckedItems.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{uncheckedItems.length}</p>
                  <p className="text-xs text-muted-foreground">Items unchecked</p>
                </div>
              </div>
            )}
          </div>

          {/* Updated Items List */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Updated Items ({itemUpdates.length})
            </Label>
            <ScrollArea className="h-32 rounded-md border">
              <div className="p-3 space-y-2">
                {itemUpdates.map((update) => (
                  <div key={update.itemId} className="flex items-center gap-2">
                    {update.isNowCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm truncate">{update.title}</span>
                    {update.notes && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Has notes
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Recipients */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground">
                Recipients ({recipients.length})
              </Label>
            </div>
            {recipients.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recipients.map((r, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {r.reviewer_name || r.reviewer_email}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recipients - roadmap hasn't been shared yet
              </p>
            )}
          </div>

          {/* Optional Message */}
          <div>
            <Label htmlFor="message" className="text-sm">
              Optional Message
            </Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to include with the update..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
