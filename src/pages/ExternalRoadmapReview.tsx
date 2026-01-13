import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, Clock, AlertTriangle, FileText, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExternalRoadmapReview() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [generalComment, setGeneralComment] = useState("");

  // Validate token and get share data
  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ["roadmap-share-token", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_share_tokens")
        .select(`
          *,
          projects:project_id (
            id,
            name,
            project_number,
            client_name
          )
        `)
        .eq("access_token", token)
        .single();

      if (error) throw error;
      
      // Check if expired or revoked
      if (data.status === "revoked") {
        throw new Error("This share link has been revoked");
      }
      if (new Date(data.expires_at) < new Date()) {
        throw new Error("This share link has expired");
      }

      // Update access count
      await supabase
        .from("roadmap_share_tokens")
        .update({ 
          access_count: (data.access_count || 0) + 1,
        })
        .eq("id", data.id);

      return data;
    },
    enabled: !!token,
    retry: false,
  });

  // Fetch roadmap items for the project
  const { data: roadmapItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["external-roadmap-items", tokenData?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_roadmap_items")
        .select("*")
        .eq("project_id", tokenData!.project_id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tokenData?.project_id,
  });

  // Fetch existing comments for this token
  const { data: existingComments = [] } = useQuery({
    queryKey: ["external-review-comments", tokenData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_roadmap_comments")
        .select("*")
        .eq("token_id", tokenData!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!tokenData?.id,
  });

  // Submit comments mutation
  const submitCommentsMutation = useMutation({
    mutationFn: async () => {
      const commentsToInsert = [];
      
      // Add item-specific comments
      for (const [itemId, comment] of Object.entries(comments)) {
        if (comment.trim()) {
          commentsToInsert.push({
            token_id: tokenData!.id,
            roadmap_item_id: itemId,
            comment_text: comment.trim(),
            reviewer_name: tokenData!.reviewer_name,
          });
        }
      }
      
      // Add general comment
      if (generalComment.trim()) {
        commentsToInsert.push({
          token_id: tokenData!.id,
          roadmap_item_id: null,
          comment_text: generalComment.trim(),
          reviewer_name: tokenData!.reviewer_name,
        });
      }

      if (commentsToInsert.length === 0) {
        throw new Error("Please add at least one comment");
      }

      const { error } = await supabase
        .from("external_roadmap_comments")
        .insert(commentsToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you! Your comments have been submitted.");
      setComments({});
      setGeneralComment("");
      queryClient.invalidateQueries({ queryKey: ["external-review-comments"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit comments");
    },
  });

  const getStatusBadge = (isCompleted: boolean) => {
    if (isCompleted) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200",
    };
    return (
      <Badge variant="outline" className={colors[priority] || ""}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </Badge>
    );
  };

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              {(tokenError as Error)?.message || "This link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = tokenData.projects as { id: string; name: string; project_number: string | null; client_name: string | null } | null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {project?.project_number ? `${project.project_number}: ` : ""}
                {project?.name || "Project Roadmap"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Reviewing as {tokenData.reviewer_name}
              </p>
            </div>
            <Button 
              onClick={() => submitCommentsMutation.mutate()}
              disabled={submitCommentsMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitCommentsMutation.isPending ? "Submitting..." : "Submit Comments"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Message */}
        {tokenData.message && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Message from the team:</p>
                  <p className="text-muted-foreground italic">"{tokenData.message}"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* General Comment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General Comments</CardTitle>
            <CardDescription>
              Share any overall feedback about the project roadmap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter your general comments here..."
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Roadmap Items */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Roadmap Items ({roadmapItems.length})
          </h2>

          {itemsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : roadmapItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No roadmap items found for this project.
              </CardContent>
            </Card>
          ) : (
            roadmapItems.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      {item.description && (
                        <CardDescription className="mt-1">{item.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(item.is_completed)}
                      {getPriorityBadge(item.priority)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.phase && (
                      <span className="flex items-center gap-1">
                        Phase: {item.phase}
                      </span>
                    )}
                    {item.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due: {format(new Date(item.due_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Your comments on this item:
                    </label>
                    <Textarea
                      placeholder="Add your feedback for this item..."
                      value={comments[item.id] || ""}
                      onChange={(e) => setComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  {/* Show existing comments for this item */}
                  {existingComments.filter(c => c.roadmap_item_id === item.id).length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Previous comments:</p>
                      {existingComments
                        .filter(c => c.roadmap_item_id === item.id)
                        .map((comment) => (
                          <p key={comment.id} className="text-sm">
                            "{comment.comment_text}"
                            <span className="text-xs text-muted-foreground ml-2">
                              - {format(new Date(comment.created_at), "MMM d, yyyy")}
                            </span>
                          </p>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Submit Button at Bottom */}
        <div className="flex justify-center pt-4 pb-8">
          <Button 
            size="lg"
            onClick={() => submitCommentsMutation.mutate()}
            disabled={submitCommentsMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {submitCommentsMutation.isPending ? "Submitting..." : "Submit All Comments"}
          </Button>
        </div>
      </div>
    </div>
  );
}