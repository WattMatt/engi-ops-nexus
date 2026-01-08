import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Send, Copy, Trash2, Link2, Clock, Mail } from "lucide-react";
import { format } from "date-fns";

interface ShareRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
}

export function ShareRoadmapDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ShareRoadmapDialogProps) {
  const queryClient = useQueryClient();
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [message, setMessage] = useState("");

  const { data: existingTokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ["roadmap-share-tokens", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_share_tokens")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      return { ...user, profile };
    },
  });

  const createShareMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: token, error: insertError } = await supabase
        .from("roadmap_share_tokens")
        .insert({
          project_id: projectId,
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          message: message || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send email invitation
      await supabase.functions.invoke("send-roadmap-share-invitation", {
        body: {
          tokenId: token.id,
          reviewerEmail,
          reviewerName,
          message,
          projectId,
          accessToken: token.access_token,
          senderName: currentUser?.profile?.full_name || "Team Member",
        },
      });

      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-share-tokens", projectId] });
      toast.success("Share invitation sent successfully");
      setReviewerName("");
      setReviewerEmail("");
      setMessage("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create share link");
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("roadmap_share_tokens")
        .update({ status: "revoked" })
        .eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-share-tokens", projectId] });
      toast.success("Share link revoked");
    },
  });

  const copyLink = (accessToken: string) => {
    const link = `${window.location.origin}/roadmap-review/${accessToken}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    createShareMutation.mutate();
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    if (isExpired || status === "expired") {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (status === "revoked") {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    return <Badge className="bg-green-600">Active</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Project Roadmap
          </DialogTitle>
          <DialogDescription>
            Create shareable links for external reviewers to view and comment on the roadmap
            {projectName && <span className="font-medium"> for {projectName}</span>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reviewerName">Reviewer Name *</Label>
              <Input
                id="reviewerName"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewerEmail">Reviewer Email *</Label>
              <Input
                id="reviewerEmail"
                type="email"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
                placeholder="john@company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to include in the invitation email..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={createShareMutation.isPending} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {createShareMutation.isPending ? "Sending..." : "Send Invitation"}
          </Button>
        </form>

        {existingTokens.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Existing Share Links</h4>
              <div className="space-y-2">
                {existingTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {token.reviewer_name}
                        </span>
                        {getStatusBadge(token.status, token.expires_at)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {token.reviewer_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(token.expires_at), "MMM d, yyyy")}
                        </span>
                        {token.access_count > 0 && (
                          <span>Accessed {token.access_count}x</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {token.status === "active" && new Date(token.expires_at) > new Date() && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyLink(token.access_token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revokeTokenMutation.mutate(token.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
