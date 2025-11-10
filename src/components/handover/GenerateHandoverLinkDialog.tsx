import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check } from "lucide-react";
import { addDays } from "date-fns";

interface GenerateHandoverLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export const GenerateHandoverLinkDialog = ({
  open,
  onOpenChange,
  projectId,
}: GenerateHandoverLinkDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expiryDays, setExpiryDays] = useState("30");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      // Generate a unique token
      const token = crypto.randomUUID();
      const expiresAt = addDays(new Date(), parseInt(expiryDays));

      const { error } = await supabase
        .from("handover_links" as any)
        .insert({
          project_id: projectId,
          link_token: token,
          expires_at: expiresAt.toISOString(),
          created_by: user.user?.id,
        });

      if (error) throw error;

      // Generate the full URL
      const baseUrl = window.location.origin;
      return `${baseUrl}/handover/${token}`;
    },
    onSuccess: (link) => {
      setGeneratedLink(link);
      toast({
        title: "Success",
        description: "Client access link generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["handover-links", projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedLink("");
    setExpiryDays("30");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Generate Client Access Link</DialogTitle>
          <DialogDescription>
            Create a secure link for your client to access and download all handover documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generatedLink ? (
            <div className="space-y-2">
              <Label htmlFor="expiry">Link Expiry (Days)</Label>
              <Input
                id="expiry"
                type="number"
                min="1"
                max="365"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The link will expire after {expiryDays} days
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generated Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  Share this link with your client. They will be able to access and download
                  all documents in the handover repository. The link will expire in {expiryDays} days.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {generatedLink ? "Close" : "Cancel"}
          </Button>
          {!generatedLink && (
            <Button
              onClick={() => generateLinkMutation.mutate()}
              disabled={generateLinkMutation.isPending}
            >
              {generateLinkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
